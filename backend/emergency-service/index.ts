// Supabase Edge Function: emergency-service
// Module #17 — Cloud Evidence Storage (evidence retrieval + secure access, module #17).
// Upload (POST /evidence/upload-url, POST /evidence finalize) now lives in backend/storage.
// Incident CRUD (POST/GET /incidents) now lives in backend/incident-report-service.
//
// Runs on Deno. All queries use the CALLER'S JWT so Row-Level Security enforces ownership.
// Routes (mounted under /functions/v1/emergency-service):
//   GET    /evidence?type=&incident_id -> list caller's evidence
//   GET    /evidence/:id               -> row + short-lived signed download URL (logged)
//   GET    /evidence/:id/access-log    -> access history for the item
//   DELETE /evidence/:id               -> delete storage object + row (logged)
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, DELETE, OPTIONS",
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
    // ===== TIMELINE ROUTES (Module #19) =====
    if (seg[0] === "timeline") {
      // GET /timeline?incident_id=...
      if (req.method === "GET") {
        const incidentId = url.searchParams.get("incident_id");
        if (!incidentId) return json({ error: "incident_id parameter is required" }, 400);

        // Fetch events from incident_timeline (RLS enforces ownership)
        const { data, error } = await supabase
          .from("incident_timeline")
          .select("*")
          .eq("incident_id", incidentId)
          .order("created_at", { ascending: true });

        if (error) return json({ error: error.message }, 400);
        return json({ events: data ?? [] });
      }

      // POST /timeline -> append timeline event
      if (req.method === "POST") {
        const body = await req.json().catch(() => ({}));
        const { incident_id, event_type, title, description, metadata, occurred_at } = body ?? {};
        if (!incident_id || !event_type || !title) {
          return json({ error: "incident_id, event_type, and title are required" }, 400);
        }

        const { data, error } = await supabase
          .from("incident_timeline")
          .insert({
            incident_id,
            event_type,
            title,
            description: description ?? null,
            metadata: metadata ?? {},
            created_at: occurred_at ? new Date(occurred_at).toISOString() : new Date().toISOString(),
          })
          .select()
          .single();

        if (error) return json({ error: error.message }, 400);
        return json({ event: data }, 201);
      }
      return json({ error: "not found" }, 404);
    }

    if (seg[0] !== "evidence") return json({ error: "not found" }, 404);

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
