// Supabase Edge Function: storage
// Upload logic split out of emergency-service (module #17). Owns the signed-upload-url +
// finalize flow for private per-user evidence, plus a generic server-to-server upload endpoint
// for other functions that already hold file bytes in-hand (e.g. incident-report-service, which
// receives multipart files directly and hands them off here instead of uploading inline itself).
//
// Runs on Deno. All queries use the CALLER'S JWT so Row-Level Security enforces ownership.
// Routes (mounted under /functions/v1/storage):
//   POST /evidence/upload-url  -> signed upload URL + pending evidence row (module #17)
//   POST /evidence             -> finalize an uploaded evidence row (module #17)
//   POST /media                -> upload provided bytes to a bucket, returns {url, path, contentType}
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const EXTENSION_BY_CONTENT_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
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

// segments after the function name, e.g. /functions/v1/storage/evidence/upload-url -> ["evidence","upload-url"]
function routeParts(url: string): string[] {
  const parts = new URL(url).pathname.split("/").filter(Boolean);
  const i = parts.indexOf("storage");
  return i === -1 ? parts : parts.slice(i + 1);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const supabase = clientFor(req);
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) return json({ error: "unauthorized" }, 401);
  const user = auth.user;

  const seg = routeParts(req.url);

  try {
    // ===== evidence upload (module #17) =====
    if (seg[0] === "evidence") {
      // ----- POST /evidence/upload-url -----
      if (req.method === "POST" && seg[1] === "upload-url") {
        const body = await req.json().catch(() => ({}));
        const { file_name, type, mime_type, incident_id } = body ?? {};
        if (!type) return json({ error: "type is required" }, 400);
        const safeName = String(file_name ?? "evidence").replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${user.id}/${crypto.randomUUID()}-${safeName}`;

        const { data: signed, error: sErr } = await supabase.storage.from("evidence").createSignedUploadUrl(path);
        if (sErr) return json({ error: sErr.message }, 400);

        const { data: row, error: iErr } = await supabase.from("evidence").insert({
          user_id: user.id,
          incident_id: incident_id ?? null,
          type,
          storage_path: path,
          file_name: safeName,
          mime_type: mime_type ?? null,
          status: "pending",
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

      return json({ error: "not found" }, 404);
    }

    // ===== generic direct upload (server-to-server) =====
    // Used by callers that already received file bytes themselves (e.g. incident-report-service's
    // multipart /reports handler) and just need them written to a bucket under their own folder.
    if (seg[0] === "media" && seg.length === 1) {
      if (req.method !== "POST") return json({ error: "not found" }, 404);
      const form = await req.formData();
      const bucket = String(form.get("bucket") ?? "");
      const file = form.get("file");
      if (!bucket) return json({ error: "bucket is required" }, 400);
      if (!(file instanceof File)) return json({ error: "file is required" }, 400);

      const contentType = file.type || "application/octet-stream";
      const ext = EXTENSION_BY_CONTENT_TYPE[contentType] ?? "bin";
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const bytes = new Uint8Array(await file.arrayBuffer());

      const { error: upErr } = await supabase.storage.from(bucket).upload(path, bytes, { contentType });
      if (upErr) return json({ error: upErr.message }, 400);

      const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
      return json({ url: pub.publicUrl, path, contentType });
    }

    return json({ error: "not found" }, 404);
  } catch (e) {
    return json({ error: String(e instanceof Error ? e.message : e) }, 500);
  }
});
