// Admin authentication against the custom `admin_users` table (via user-service/admin/login).
// Not Supabase Auth: login returns a signed session token that `callFn` sends as `x-admin-token`.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { callFn } from "./functions";
import { setAdminToken } from "./adminToken";

const STORAGE_KEY = "aegis.admin.session";

export type AdminIdentity = { id: string; email: string; full_name: string | null; role: string };
type AdminSession = { token: string; admin: AdminIdentity };

let identity: AdminIdentity | null = null;

export function getAdminIdentity(): AdminIdentity | null {
  return identity;
}

/** Restore a persisted admin session (e.g. after a web refresh). Returns true if one was found. */
export async function loadAdminSession(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return false;
  try {
    const session = JSON.parse(raw) as AdminSession;
    if (!session?.token) return false;
    setAdminToken(session.token);
    identity = session.admin;
    return true;
  } catch {
    return false;
  }
}

/** Verify credentials against admin_users and start a session. Throws FunctionError on bad creds. */
export async function adminLogin(email: string, password: string): Promise<AdminIdentity> {
  const session = await callFn<AdminSession>("user-service/admin/login", {
    method: "POST",
    body: { email: email.trim().toLowerCase(), password },
  });
  setAdminToken(session.token);
  identity = session.admin;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  return session.admin;
}

/** Clear the session (in memory + persisted). */
export async function adminLogout(): Promise<void> {
  setAdminToken(null);
  identity = null;
  await AsyncStorage.removeItem(STORAGE_KEY);
}
