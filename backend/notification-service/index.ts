// Supabase Edge Function: notification-service
// Runs on Deno (Supabase Edge Runtime).
// Deploy with: supabase functions deploy notification-service
//
// Sends real FCM pushes via the Firebase HTTP v1 API. There is no official
// firebase-admin SDK for Deno, so this hand-rolls what it does: sign a JWT
// with the service-account private key, exchange it for a Google OAuth2
// access token, then POST to the FCM v1 send endpoint.
//
// Required secret: FIREBASE_SERVICE_ACCOUNT_JSON (the full service-account
// JSON as a single string). Set with:
//   supabase secrets set FIREBASE_SERVICE_ACCOUNT_JSON="$(cat path/to/firebase-service-account.json)"
// Never commit that file. Without this secret set, sends are skipped and
// notifications are still logged (status "LOGGED_ONLY") — no crash.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

// ──────────────────────────────────────────────────────────────
// Firebase Admin auth (hand-rolled — no firebase-admin SDK on Deno)
// ──────────────────────────────────────────────────────────────

interface ServiceAccount {
  client_email: string;
  private_key: string;
  project_id: string;
  token_uri?: string;
}

interface CachedToken {
  token: string;
  expiresAt: number; // unix seconds
}

let cachedToken: CachedToken | null = null;

function base64url(input: ArrayBuffer | string): string {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : new Uint8Array(input);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

/** Signs a JWT with the service account's private key and exchanges it for a
 *  short-lived Google OAuth2 access token, scoped to FCM sends. Caches the
 *  token across invocations of a warm Edge Function instance. */
async function getAccessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  if (cachedToken && cachedToken.expiresAt > now + 60) {
    return cachedToken.token;
  }

  const tokenUri = sa.token_uri ?? "https://oauth2.googleapis.com/token";
  const header = { alg: "RS256", typ: "JWT" };
  const claims = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: tokenUri,
    exp: now + 3600,
    iat: now,
  };

  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claims))}`;

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(sa.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(signingInput)
  );

  const jwt = `${signingInput}.${base64url(signature)}`;

  const tokenRes = await fetch(tokenUri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!tokenRes.ok) {
    throw new Error(`Failed to obtain FCM access token: ${tokenRes.status} ${await tokenRes.text()}`);
  }

  const tokenJson = await tokenRes.json();
  cachedToken = { token: tokenJson.access_token, expiresAt: now + tokenJson.expires_in };
  return cachedToken.token;
}

function getServiceAccount(): ServiceAccount | null {
  const raw = Deno.env.get("FIREBASE_SERVICE_ACCOUNT_JSON");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ServiceAccount;
  } catch {
    return null;
  }
}

/** Sends one FCM push via the HTTP v1 API. Returns ok:false with the raw
 *  FCM error body on failure (caller inspects it to detect a stale token). */
async function sendFcmPush(
  sa: ServiceAccount,
  token: string,
  title: string,
  body: string,
  data: Record<string, string> = {}
): Promise<{ ok: boolean; error?: string }> {
  try {
    const accessToken = await getAccessToken(sa);
    const res = await fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          token,
          notification: { title, body },
          data,
          android: { priority: "high" },
        },
      }),
    });

    if (!res.ok) {
      return { ok: false, error: await res.text() };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String((err as Error).message ?? err) };
  }
}

// ──────────────────────────────────────────────────────────────
// HTTP handler
// ──────────────────────────────────────────────────────────────

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

    // Route 3: Send real FCM push (if the user has registered devices) & log it
    if (pathname.includes("/notifications/send") || body.action === "send_notification") {
      const { userId, incidentId, recipientPhone, recipientName, title, body: msgBody, notificationType } = body;

      if (!msgBody) {
        return new Response(
          JSON.stringify({ status: "error", message: "body message is required" }),
          { headers: corsHeaders, status: 400 }
        );
      }

      const notifTitle = title ?? "Aegis Safety Alert";
      let sent = 0;
      let failed = 0;

      const sa = getServiceAccount();
      if (userId && sa) {
        const { data: devices } = await supabase
          .from("devices")
          .select("fcm_token")
          .or(`user_id.eq.${userId},firebase_uid.eq.${userId}`)
          .eq("is_active", true);

        const tokens: string[] = (devices ?? []).map((d: { fcm_token: string }) => d.fcm_token).filter(Boolean);
        const staleTokens: string[] = [];

        for (const token of tokens) {
          const result = await sendFcmPush(sa, token, notifTitle, msgBody, {
            notificationType: notificationType ?? "SOS_ALERT",
            incidentId: incidentId ?? "",
          });
          if (result.ok) {
            sent++;
          } else {
            failed++;
            if (result.error && (result.error.includes("UNREGISTERED") || result.error.includes("NOT_FOUND"))) {
              staleTokens.push(token);
            }
          }
        }

        if (staleTokens.length > 0) {
          await supabase.from("devices").update({ is_active: false }).in("fcm_token", staleTokens);
        }
      }

      const deliveryStatus = sent > 0 ? "SENT" : failed > 0 ? "FAILED" : "LOGGED_ONLY";

      const notifData = {
        user_id: userId ?? null,
        incident_id: incidentId ?? null,
        recipient_phone: recipientPhone ?? null,
        recipient_name: recipientName ?? null,
        title: notifTitle,
        body: msgBody,
        message: msgBody,
        notification_type: notificationType ?? "SOS_ALERT",
        status: deliveryStatus,
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
        JSON.stringify({
          status: "success",
          message: `FCM: ${sent} sent, ${failed} failed. Notification logged.`,
          data,
        }),
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
