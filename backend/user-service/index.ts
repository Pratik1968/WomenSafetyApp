// Supabase Edge Function: user-service
// Runs on Deno (Supabase Edge Runtime), NOT the Expo app's Node/RN runtime.
// Local:  supabase functions serve user-service
// Deploy: handled by deployment/deploy-functions.sh (create-or-update)
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

Deno.serve(async (req: Request) => {
  const body = await req.json().catch(() => ({}));
  return new Response(
    JSON.stringify({ service: "user-service", ok: true, echo: body }),
    { headers: { "Content-Type": "application/json" } },
  );
});
