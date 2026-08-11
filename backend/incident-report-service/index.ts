// Supabase Edge Function: incident-report-service
// Module #12 — Crowd-Sourced Incident Reporting (community reports + media + nearby feed).
// Also owns /incidents CRUD (moved from emergency-service — the personal SOS/journey/report/
// alert incidents, module #17's `incidents` table), since both are "incident" concepts.
//
// Runs on Deno. All queries use the CALLER'S JWT so Row-Level Security enforces ownership.
// File uploads are NOT done inline here — this function already has the bytes (from the
// multipart /reports payload) and hands each file off to backend/storage's POST /media, which
// does the actual Supabase Storage write and returns a {url, type}.
//
// Routes (mounted under /functions/v1/incident-report-service):
//   POST /incidents                             -> create an incident (module #17)
//   GET  /incidents                              -> list caller's incidents
//   POST /reports                              -> create a report (multipart: type, description,
//                                                  latitude, longitude, address, up to 5 files)
//   GET  /reports?lat=&lng=&radius_km=&limit=   -> nearby feed, anonymized (no user_id)
//   GET  /reports/me                            -> caller's own reports (full detail)
//   GET  /reports/:id                           -> single report, anonymized
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const BUCKET = "crowd-report-media";
const MAX_FILES_PER_REPORT = 5;

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

// segments after the function name, e.g. /functions/v1/incident-report-service/reports/123 -> ["reports","123"]
function routeParts(url: string): string[] {
  const parts = new URL(url).pathname.split("/").filter(Boolean);
  const i = parts.indexOf("incident-report-service");
  return i === -1 ? parts : parts.slice(i + 1);
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dPhi = ((lat2 - lat1) * Math.PI) / 180;
  const dLambda = ((lng2 - lng1) * Math.PI) / 180;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const a = Math.sin(dPhi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// deno-lint-ignore no-explicit-any
function anonymize(row: any) {
  if (!row) return row;
  const { user_id: _user_id, ...rest } = row;
  return rest;
}

/** Hands a file off to backend/storage's direct-upload endpoint instead of writing to Storage here. */
async function uploadViaStorageService(
  req: Request,
  file: File,
  contentType: string,
): Promise<{ url: string; type: "photo" | "video" } | null> {
  const form = new FormData();
  form.append("bucket", BUCKET);
  form.append("file", file, file.name);

  const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/storage/media`, {
    method: "POST",
    headers: {
      Authorization: req.headers.get("Authorization") ?? "",
      apikey: Deno.env.get("SUPABASE_ANON_KEY")!,
    },
    body: form,
  });
  if (!res.ok) return null;
  const body = await res.json().catch(() => null);
  if (!body?.url) return null;
  return { url: body.url as string, type: contentType.startsWith("video/") ? "video" : "photo" };
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
    // ===== incidents (module #17, moved from emergency-service) =====
    if (seg[0] === "incidents") {
      // POST /incidents -> create
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

    if (seg[0] !== "reports") return json({ error: "not found" }, 404);

    // ----- POST /reports (create, multipart) -----
    if (req.method === "POST" && seg.length === 1) {
      const form = await req.formData();
      const reportType = String(form.get("report_type") ?? "");
      if (!reportType) return json({ error: "report_type is required" }, 400);
      const latitude = Number(form.get("latitude"));
      const longitude = Number(form.get("longitude"));
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return json({ error: "latitude and longitude are required" }, 400);
      }
      const description = form.get("description");
      const address = form.get("address");

      const files = form.getAll("files").filter((f): f is File => f instanceof File);
      if (files.length > MAX_FILES_PER_REPORT) {
        return json({ error: `A report can include at most ${MAX_FILES_PER_REPORT} files` }, 400);
      }

      const media: { url: string; type: "photo" | "video" }[] = [];
      for (const file of files) {
        const contentType = file.type || "";
        if (!contentType.startsWith("image/") && !contentType.startsWith("video/")) continue;
        const uploaded = await uploadViaStorageService(req, file, contentType);
        if (uploaded) media.push(uploaded); // one bad file shouldn't sink an otherwise-valid report
      }

      const { data, error } = await supabase.from("crowd_reports").insert({
        user_id: user.id,
        report_type: reportType,
        description: description ? String(description) : null,
        lat: latitude,
        lng: longitude,
        address: address ? String(address) : null,
        media,
      }).select().single();
      if (error) return json({ error: error.message }, 400);
      return json({ report: data }, 201);
    }

    // ----- GET /reports/me -----
    if (req.method === "GET" && seg.length === 2 && seg[1] === "me") {
      const { data, error } = await supabase.from("crowd_reports").select("*")
        .eq("user_id", user.id).order("created_at", { ascending: false });
      if (error) return json({ error: error.message }, 400);
      return json({ reports: data ?? [] });
    }

    // ----- GET /reports (nearby feed) -----
    if (req.method === "GET" && seg.length === 1) {
      const lat = Number(url.searchParams.get("lat"));
      const lng = Number(url.searchParams.get("lng"));
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return json({ error: "lat and lng are required" }, 400);
      }
      const radiusKm = Math.min(50, Math.max(0.1, Number(url.searchParams.get("radius_km")) || 5));
      const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit")) || 50));

      const latDelta = radiusKm / 111;
      const lngDelta = radiusKm / Math.max(111 * Math.cos((lat * Math.PI) / 180), 1e-6);

      const { data, error } = await supabase.from("crowd_reports").select("*")
        .gte("lat", lat - latDelta).lte("lat", lat + latDelta)
        .gte("lng", lng - lngDelta).lte("lng", lng + lngDelta)
        .order("created_at", { ascending: false });
      if (error) return json({ error: error.message }, 400);

      const nearby = (data ?? [])
        .filter((row) => haversineKm(lat, lng, row.lat, row.lng) <= radiusKm)
        .slice(0, limit)
        .map(anonymize);
      return json({ reports: nearby });
    }

    // ----- GET /reports/:id -----
    if (req.method === "GET" && seg.length === 2) {
      const { data, error } = await supabase.from("crowd_reports").select("*").eq("id", seg[1]).single();
      if (error || !data) return json({ error: "not found" }, 404);
      return json({ report: anonymize(data) });
    }

    return json({ error: "not found" }, 404);
  } catch (e) {
    return json({ error: String(e instanceof Error ? e.message : e) }, 500);
  }
});
