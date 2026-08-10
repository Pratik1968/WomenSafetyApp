// Supabase Edge Function: emergency-service
// Module #17 — Cloud Evidence Storage (evidence CRUD + secure retrieval).
//
// Runs on Deno. All queries use the CALLER'S JWT so Row-Level Security enforces ownership.
// Routes (mounted under /functions/v1/emergency-service):
//   POST   /evidence/upload-url        -> signed upload URL + pending evidence row
//   POST   /evidence                   -> finalize an uploaded evidence row
//   GET    /evidence?type=&incident_id -> list caller's evidence
//   GET    /evidence/:id               -> row + short-lived signed download URL (logged)
//   GET    /evidence/:id/access-log    -> access history for the item
//   DELETE /evidence/:id               -> delete storage object + row (logged)
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function clientFor(req: Request): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
  );
}

// segments after the function name, e.g. /functions/v1/emergency-service/evidence/123 -> ["evidence","123"]
function routeParts(url: string): string[] {
  const parts = new URL(url).pathname.split("/").filter(Boolean);
  const i = parts.indexOf("emergency-service");
  return i === -1 ? parts : parts.slice(i + 1);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const supabase = clientFor(req);
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) return json({ error: "unauthorized" }, 401);
  const user = auth.user;

  const seg = routeParts(req.url);
  const url = new URL(req.url);

  try {
    // ===== incidents =====
    if (seg[0] === "incidents") {
      // POST /incidents  -> create
      if (req.method === "POST" && seg.length === 1) {
        const body = await req.json().catch(() => ({}));
        const { type, address, severity, lat, lng, status } = body ?? {};
        if (!type) return json({ error: "type is required" }, 400);
        const { data, error } = await supabase.from("incidents").insert({
          user_id: user.id,
          type,
          status: status ?? "active",
          severity: severity ?? 0,
          address: address ?? null,
          lat: lat ?? null,
          lng: lng ?? null,
        }).select().single();
        if (error) return json({ error: error.message }, 400);
        return json({ incident: data });
      }
      // GET /incidents -> list caller's incidents
      if (req.method === "GET" && seg.length === 1) {
        const { data, error } = await supabase.from("incidents").select("*").order("started_at", { ascending: false });
        if (error) return json({ error: error.message }, 400);
        return json({ incidents: data ?? [] });
      }
      return json({ error: "not found" }, 404);
    }

    if (seg[0] !== "evidence") return json({ error: "not found" }, 404);

    // ----- POST /evidence/upload-url -----
    if (req.method === "POST" && seg[1] === "upload-url") {
      const body = await req.json().catch(() => ({}));
      const { file_name, type, mime_type, incident_id } = body ?? {};
      if (!type) return json({ error: "type is required" }, 400);
      const safeName = String(file_name ?? "evidence").replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${user.id}/${crypto.randomUUID()}-${safeName}`;

      const { data: signed, error: sErr } = await supabase.storage
        .from("evidence").createSignedUploadUrl(path);
      if (sErr) return json({ error: sErr.message }, 400);

      const { data: row, error: iErr } = await supabase.from("evidence").insert({
        user_id: user.id, incident_id: incident_id ?? null, type,
        storage_path: path, file_name: safeName, mime_type: mime_type ?? null, status: "pending",
      }).select("id").single();
      if (iErr) return json({ error: iErr.message }, 400);

      return json({ evidence_id: row.id, path, token: signed.token, signedUrl: signed.signedUrl });
    }

    // ----- POST /evidence (finalize) -----
    if (req.method === "POST" && seg.length === 1) {
      const body = await req.json().catch(() => ({}));
      const { evidence_id, size_bytes, duration_seconds, checksum_sha256, captured_at, tamper_seal } = body ?? {};
      if (!evidence_id) return json({ error: "evidence_id is required" }, 400);
      const { data, error } = await supabase.from("evidence").update({
        size_bytes: size_bytes ?? 0,
        duration_seconds: duration_seconds ?? null,
        checksum_sha256: checksum_sha256 ?? null,
        captured_at: captured_at ?? null,
        tamper_seal: tamper_seal ?? null,
        status: "ready",
      }).eq("id", evidence_id).eq("user_id", user.id).select().single();
      if (error) return json({ error: error.message }, 400);
      await supabase.from("evidence_access_log").insert({ evidence_id, accessed_by: user.id, action: "upload" });
      return json({ evidence: data });
    }

    // ----- GET /evidence (list) -----
    if (req.method === "GET" && seg.length === 1) {
      let q = supabase.from("evidence").select("*").order("created_at", { ascending: false });
      const type = url.searchParams.get("type");
      const incidentId = url.searchParams.get("incident_id");
      if (type) q = q.eq("type", type);
      if (incidentId) q = q.eq("incident_id", incidentId);
      const { data, error } = await q;
      if (error) return json({ error: error.message }, 400);
      return json({ evidence: data ?? [] });
    }

    // ----- GET /evidence/:id/access-log -----
    if (req.method === "GET" && seg.length === 3 && seg[2] === "access-log") {
      const { data, error } = await supabase.from("evidence_access_log")
        .select("*").eq("evidence_id", seg[1]).order("accessed_at", { ascending: false });
      if (error) return json({ error: error.message }, 400);
      return json({ access_log: data ?? [] });
    }

    // ----- GET /evidence/:id (secure retrieval) -----
    if (req.method === "GET" && seg.length === 2) {
      const { data: row, error } = await supabase.from("evidence").select("*").eq("id", seg[1]).single();
      if (error || !row) return json({ error: "not found" }, 404);
      const ttl = 60;
      const { data: signed, error: sErr } = await supabase.storage
        .from(row.storage_bucket ?? "evidence").createSignedUrl(row.storage_path, ttl);
      if (sErr) return json({ error: sErr.message }, 400);
      const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();
      await supabase.from("evidence_access_log").insert({
        evidence_id: row.id, accessed_by: user.id, action: "retrieve", signed_url_expires_at: expiresAt,
      });
      return json({ evidence: row, signedUrl: signed.signedUrl, expiresIn: ttl, expiresAt });
    }

    // ----- DELETE /evidence/:id -----
    if (req.method === "DELETE" && seg.length === 2) {
      const { data: row } = await supabase.from("evidence").select("storage_path,storage_bucket").eq("id", seg[1]).single();
      if (row?.storage_path) {
        await supabase.storage.from(row.storage_bucket ?? "evidence").remove([row.storage_path]);
      }
      await supabase.from("evidence_access_log").insert({ evidence_id: seg[1], accessed_by: user.id, action: "delete" });
      const { error } = await supabase.from("evidence").delete().eq("id", seg[1]).eq("user_id", user.id);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    return json({ error: "not found" }, 404);
  } catch (e) {
    return json({ error: String(e instanceof Error ? e.message : e) }, 500);
  }
});
