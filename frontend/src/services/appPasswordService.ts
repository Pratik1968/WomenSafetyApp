import AsyncStorage from "@react-native-async-storage/async-storage";

const APP_PASSWORD_KEY = "@aegis_app_password";
const APP_PASSWORD_SET_KEY = "@aegis_app_password_set";
const USER_SESSION_KEY = "@aegis_user_session";

export interface CachedSession {
  firebase_uid: string;
  id?: string;
  full_name: string;
  phone?: string | null;
  email?: string | null;
  blood_group?: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
  medical_notes?: string | null;
}

/**
 * Saves the app password for offline/password-login use.
 * Should only be called when the user is already authenticated via Firebase.
 */
export async function setAppPassword(password: string): Promise<void> {
  await AsyncStorage.setItem(APP_PASSWORD_KEY, password);
  await AsyncStorage.setItem(APP_PASSWORD_SET_KEY, "true");
}

/**
 * Checks whether the current user has previously set an app password.
 */
export async function hasAppPassword(): Promise<boolean> {
  const flag = await AsyncStorage.getItem(APP_PASSWORD_SET_KEY);
  return flag === "true";
}

/**
 * Verifies if the given password matches the stored app password.
 */
export async function verifyAppPassword(password: string): Promise<boolean> {
  const stored = await AsyncStorage.getItem(APP_PASSWORD_KEY);
  return stored !== null && stored === password;
}

/**
 * Clears only the app password (not the session). Called on account wipe.
 */
export async function clearAppPassword(): Promise<void> {
  await AsyncStorage.removeItem(APP_PASSWORD_KEY);
  await AsyncStorage.removeItem(APP_PASSWORD_SET_KEY);
}

/**
 * Saves the user's profile data locally so it is available after a password login,
 * when Firebase auth.currentUser is null.
 * Call this every time a fresh profile is fetched from the backend.
 */
export async function saveUserSession(session: CachedSession): Promise<void> {
  await AsyncStorage.setItem(USER_SESSION_KEY, JSON.stringify(session));
}

/**
 * Returns the locally cached user session.
 * Used by password login to restore profile data without a live Firebase session.
 */
export async function getUserSession(): Promise<CachedSession | null> {
  const raw = await AsyncStorage.getItem(USER_SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CachedSession;
  } catch {
    return null;
  }
}

/**
 * Clears the local session cache. Call only on full account delete / data wipe.
 * On a normal logout, keep the session so the user can log back in with their password.
 */
export async function clearUserSession(): Promise<void> {
  await AsyncStorage.removeItem(USER_SESSION_KEY);
}
