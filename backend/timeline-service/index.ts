// Supabase Edge Function: timeline-service (get-incident-timeline)
// Module #19 — Incident Timeline & Event Aggregation.
//
// Runs on Deno. All queries use the CALLER'S JWT so Row-Level Security enforces ownership.
// Routes (mounted under /functions/v1/timeline-service):
//   GET  /timeline?incident_id=... -> list incident timeline events chronologically
//   POST /timeline                 -> record a new incident timeline event
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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

function routeParts(url: string): string[] {
  const parts = new URL(url).pathname.split("/").filter(Boolean);
  const i = parts.indexOf("timeline-service");
  return i === -1 ? parts : parts.slice(i + 1);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const supabase = clientFor(req);
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) return json({ error: "unauthorized" }, 401);

  const url = new URL(req.url);
  const seg = routeParts(req.url);

  try {
    // GET /timeline or /
    if (req.method === "GET") {
      const incidentId = url.searchParams.get("incident_id");
      if (!incidentId) return json({ error: "incident_id parameter is required" }, 400);

      const { data, error } = await supabase
        .from("incident_timeline")
        .select("*")
        .eq("incident_id", incidentId)
        .order("created_at", { ascending: true });

      if (error) return json({ error: error.message }, 400);
      return json({ events: data ?? [] });
    }

    // POST /timeline or /
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
  } catch (e) {
    return json({ error: String(e instanceof Error ? e.message : e) }, 500);
  }
});
