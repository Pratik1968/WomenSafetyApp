// Supabase client for the app. Configured from EXPO_PUBLIC_* env vars (see .env.example).
// A real user session normally comes from the Authentication module; for standalone testing
// of modules #17/#20 we fall back to an anonymous session via ensureSession().
import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

// Read EXPO_PUBLIC_* without depending on @types/node being present.
const env = ((globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {});
const url = env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const anonKey = env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** True when real Supabase credentials are present. Screens can show a "configure me" state otherwise. */
export const isSupabaseConfigured = Boolean(url && anonKey);

// createClient requires a valid URL even when unconfigured; use a harmless placeholder so the
// app still boots (calls then fail gracefully and screens render their error/empty states).
export const supabase = createClient(url || "http://localhost:54321", anonKey || "anon-key", {
  auth: {
    storage: AsyncStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

let sessionPromise: Promise<void> | null = null;

/** Ensure there is an auth session (anonymous fallback). Memoized; safe to call repeatedly. */
export function ensureSession(): Promise<void> {
  if (!sessionPromise) {
    sessionPromise = (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        await supabase.auth.signInAnonymously();
      }
    })().catch((e) => {
      sessionPromise = null; // allow a later retry
      throw e;
    });
  }
  return sessionPromise;
}
