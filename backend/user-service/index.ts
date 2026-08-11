// Supabase Edge Function: user-service
// Module #20 — Administrative Dashboard (admin-only aggregates + user management) + admin auth.
//
// Admin identity lives in `public.admin_users` (a custom table — NOT Supabase Auth / GoTrue).
//   POST /admin/login  verifies the bcrypt password via the `admin_login` SQL function and returns
//   a signed HS256 token. Every other admin route requires that token in the `x-admin-token`
//   header. Once authorized, cross-user aggregates are read with the service-role key (bypasses RLS).
//
// The platform gateway still checks the Authorization JWT (the app's anonymous session) before this
// function runs; the admin token is a second, app-level factor carried in x-admin-token.
//
// Routes (mounted under /functions/v1/user-service):
//   POST  /admin/login                  -> { token, admin }      (public — issues the token)
//   GET   /admin/overview               -> KPI overview          (x-admin-token required)
//   GET   /admin/users?q=&limit=&offset -> user list
//   PATCH /admin/users/:id              -> { status?, is_admin? }
//   GET   /admin/incidents/analytics    -> { daily, by_type, avg_response_seconds }
//   GET   /admin/hotspots               -> crime hotspots
//   GET   /admin/health                 -> latest health metrics per service
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-token",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function serviceClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
}

function routeParts(url: string): string[] {
  const parts = new URL(url).pathname.split("/").filter(Boolean);
  const i = parts.indexOf("user-service");
  return i === -1 ? parts : parts.slice(i + 1);
}

// ---------- signed admin session token (HS256) ----------
// admin_users are not GoTrue users, so we mint our own short-lived HMAC-signed token instead of a
// Supabase session. Sign + verify use ADMIN_JWT_SECRET if set, else the auto-injected
// SUPABASE_SERVICE_ROLE_KEY (see the secret resolution in the handler).
const ADMIN_TOKEN_TTL_SECONDS = 60 * 60 * 12; // 12h
const enc = new TextEncoder();

function bytesToB64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlToBytes(input: string): Uint8Array<ArrayBuffer> {
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((input.length + 3) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

async function signToken(payload: Record<string, unknown>, secret: string): Promise<string> {
  const header = bytesToB64url(enc.encode(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const body = bytesToB64url(enc.encode(JSON.stringify(payload)));
  const data = `${header}.${body}`;
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(secret), enc.encode(data));
  return `${data}.${bytesToB64url(new Uint8Array(sig))}`;
}

async function verifyToken(token: string, secret: string): Promise<Record<string, unknown> | null> {
  // Fully defensive: any malformed segment (bad base64url, non-JSON) yields null, never throws,
  // so callers can treat it as a clean "unauthorized" rather than a 500.
  try {
    const [h, p, s] = token.split(".");
    if (!h || !p || !s) return null;
    const valid = await crypto.subtle.verify("HMAC", await hmacKey(secret), b64urlToBytes(s), enc.encode(`${h}.${p}`));
    if (!valid) return null;
    const payload = JSON.parse(new TextDecoder().decode(b64urlToBytes(p))) as Record<string, unknown>;
    if (typeof payload.exp === "number" && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const seg = routeParts(req.url);
  const url = new URL(req.url);
  // HMAC signing key for admin session tokens. Prefer a dedicated ADMIN_JWT_SECRET if one is set,
  // but fall back to the auto-injected service-role key so this works out of the box without
  // `supabase secrets set` (which requires elevated account privileges). Rotating the service-role
  // key would invalidate outstanding admin tokens.
  const secret = Deno.env.get("ADMIN_JWT_SECRET") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  try {
    if (seg[0] !== "admin") return json({ error: "not found" }, 404);

    // ---- public: admin login (issues the token) ----
    if (req.method === "POST" && seg[1] === "login") {
      if (!secret) return json({ error: "admin auth not configured (missing ADMIN_JWT_SECRET)" }, 500);
      const body = await req.json().catch(() => ({}));
      const email = String(body.email ?? "").trim().toLowerCase();
      const password = String(body.password ?? "");
      if (!email || !password) return json({ error: "email and password are required" }, 400);

      const db = serviceClient();
      // admin_login is SECURITY DEFINER and does the bcrypt check in-DB; it returns 0 or 1 row.
      const { data, error } = await db.rpc("admin_login", { p_email: email, p_password: password });
      if (error) return json({ error: error.message }, 400);
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) return json({ error: "invalid email or password" }, 401);

      const now = Math.floor(Date.now() / 1000);
      const token = await signToken(
        { sub: row.id, email: row.email, role: row.role, name: row.full_name ?? null, iat: now, exp: now + ADMIN_TOKEN_TTL_SECONDS },
        secret,
      );
      return json({ token, admin: { id: row.id, email: row.email, full_name: row.full_name ?? null, role: row.role } });
    }

    // ---- everything else: require a valid admin token ----
    if (!secret) return json({ error: "admin auth not configured (missing ADMIN_JWT_SECRET)" }, 500);
    const token = req.headers.get("x-admin-token") ?? "";
    const claims = token ? await verifyToken(token, secret) : null;
    if (!claims) return json({ error: "unauthorized — admin sign-in required" }, 401);

    const db = serviceClient();

    // GET /admin/overview
    if (req.method === "GET" && seg[1] === "overview") {
      const { data, error } = await db.from("v_admin_overview").select("*").single();
      if (error) return json({ error: error.message }, 400);
      return json({ overview: data });
    }

    // GET /admin/users  |  PATCH /admin/users/:id
    if (seg[1] === "users") {
      if (req.method === "GET" && seg.length === 2) {
        const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 200);
        const offset = Number(url.searchParams.get("offset") ?? 0);
        const q = url.searchParams.get("q");
        let query = db.from("profiles").select("*").order("created_at", { ascending: false }).range(offset, offset + limit - 1);
        if (q) query = query.or(`full_name.ilike.%${q}%,phone.ilike.%${q}%`);
        const { data, error } = await query;
        if (error) return json({ error: error.message }, 400);
        return json({ users: data ?? [] });
      }
      if (req.method === "PATCH" && seg.length === 3) {
        const body = await req.json().catch(() => ({}));
        const patch: Record<string, unknown> = {};
        if (typeof body.status === "string") patch.status = body.status;
        if (typeof body.is_admin === "boolean") patch.is_admin = body.is_admin;
        if (Object.keys(patch).length === 0) return json({ error: "nothing to update" }, 400);
        const { data, error } = await db.from("profiles").update(patch).eq("id", seg[2]).select().single();
        if (error) return json({ error: error.message }, 400);
        return json({ user: data });
      }
    }

    // GET /admin/incidents/analytics
    if (req.method === "GET" && seg[1] === "incidents" && seg[2] === "analytics") {
      const [daily, byType, overview] = await Promise.all([
        db.from("v_incident_daily").select("*"),
        db.from("v_incident_by_type").select("*"),
        db.from("v_admin_overview").select("avg_response_seconds").single(),
      ]);
      if (daily.error) return json({ error: daily.error.message }, 400);
      return json({
        daily: daily.data ?? [],
        by_type: byType.data ?? [],
        avg_response_seconds: overview.data?.avg_response_seconds ?? 0,
      });
    }

    // GET /admin/hotspots
    if (req.method === "GET" && seg[1] === "hotspots") {
      const { data, error } = await db.from("v_hotspots").select("*");
      if (error) return json({ error: error.message }, 400);
      return json({ hotspots: data ?? [] });
    }

    // GET /admin/health
    if (req.method === "GET" && seg[1] === "health") {
      const { data, error } = await db.from("v_service_health").select("*");
      if (error) return json({ error: error.message }, 400);
      return json({ health: data ?? [] });
    }

    return json({ error: "not found" }, 404);
  } catch (e) {
    return json({ error: String(e instanceof Error ? e.message : e) }, 500);
  }
});
