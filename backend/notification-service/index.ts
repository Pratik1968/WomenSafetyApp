// Supabase Edge Function: notification-service
// Runs on Deno (Supabase Edge Runtime).
// Deploy with: supabase functions deploy notification-service

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const url = new URL(req.url);
    const pathname = url.pathname;
    const body = await req.json().catch(() => ({}));

    // Route 1: Health check
    if (pathname.endsWith("/health") || req.method === "GET") {
      return new Response(
        JSON.stringify({ service: "notification-service", status: "healthy", timestamp: new Date().toISOString() }),
        { headers: corsHeaders, status: 200 }
      );
    }

    // Route 2: Register Device FCM Token
    if (pathname.includes("/devices/register") || body.action === "register_device") {
      const { deviceId, platform, fcmToken, firebaseUid, deviceName, osVersion } = body;

      if (!fcmToken) {
        return new Response(
          JSON.stringify({ status: "error", message: "fcmToken is required" }),
          { headers: corsHeaders, status: 400 }
        );
      }

      const deviceData = {
        device_id: deviceId ?? null,
        fcm_token: fcmToken,
        platform: platform ?? null,
        firebase_uid: firebaseUid ?? null,
        device_name: deviceName ?? null,
        os_version: osVersion ?? null,
        last_active: new Date().toISOString(),
        is_active: true,
      };

      const { data, error } = await supabase
        .from("devices")
        .upsert(deviceData, { onConflict: "fcm_token" })
        .select();

      if (error) {
        return new Response(
          JSON.stringify({ status: "error", message: error.message }),
          { headers: corsHeaders, status: 500 }
        );
      }

      return new Response(
        JSON.stringify({ status: "success", message: "FCM token registered via Edge Function", data }),
        { headers: corsHeaders, status: 200 }
      );
    }

    // Route 3: Send & Log Push Notification
    if (pathname.includes("/notifications/send") || body.action === "send_notification") {
      const { userId, incidentId, recipientPhone, recipientName, title, body: msgBody, notificationType } = body;

      if (!msgBody) {
        return new Response(
          JSON.stringify({ status: "error", message: "body message is required" }),
          { headers: corsHeaders, status: 400 }
        );
      }

      const notifData = {
        user_id: userId ?? null,
        incident_id: incidentId ?? null,
        recipient_phone: recipientPhone ?? null,
        recipient_name: recipientName ?? null,
        title: title ?? "Aegis Safety Alert",
        body: msgBody,
        message: msgBody,
        notification_type: notificationType ?? "SOS_ALERT",
        status: "SENT",
        sent_at: new Date().toISOString(),
      };

      const { data, error } = await supabase.from("notifications").insert([notifData]).select();

      if (error) {
        return new Response(
          JSON.stringify({ status: "error", message: error.message }),
          { headers: corsHeaders, status: 500 }
        );
      }

      return new Response(
        JSON.stringify({ status: "success", message: "Notification logged via Edge Function", data }),
        { headers: corsHeaders, status: 200 }
      );
    }

    // Default response
    return new Response(
      JSON.stringify({ service: "notification-service", message: "Edge Function active", echo: body }),
      { headers: corsHeaders, status: 200 }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ status: "error", message: String((err as Error).message) }),
      { headers: corsHeaders, status: 500 }
    );
  }
});
