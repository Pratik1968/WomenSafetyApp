import { getAuth } from "@react-native-firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Native Firebase reads configuration from android/app/google-services.json
export const auth = getAuth();

const PASSWORD_SESSION_TOKEN_KEY = "@aegis_password_session_token";
let activePasswordSessionToken: string | null = null;

export async function setPasswordSessionToken(token: string | null): Promise<void> {
  activePasswordSessionToken = token?.trim() || null;
  if (activePasswordSessionToken) {
    await AsyncStorage.setItem(PASSWORD_SESSION_TOKEN_KEY, activePasswordSessionToken);
  } else {
    await AsyncStorage.removeItem(PASSWORD_SESSION_TOKEN_KEY);
  }
}

export async function clearPasswordSessionToken(): Promise<void> {
  await setPasswordSessionToken(null);
}

async function getPasswordSessionToken(): Promise<string | null> {
  if (activePasswordSessionToken) return activePasswordSessionToken;
  activePasswordSessionToken = await AsyncStorage.getItem(PASSWORD_SESSION_TOKEN_KEY);
  return activePasswordSessionToken;
}

let activePhoneConfirmation: any = null;

export function setPhoneConfirmation(confirmation: any) {
  activePhoneConfirmation = confirmation;
}

export function getPhoneConfirmation() {
  return activePhoneConfirmation;
}

/**
 * Authorization header carrying the current user's Firebase ID token, for calls to
 * the backend. The backend verifies this token server-side rather than trusting any
 * uid/user_id supplied in the request body.
 */
export async function getAuthHeader(forceRefresh = false): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken(forceRefresh);
    return { Authorization: `Bearer ${token}` };
  }

  const passwordSessionToken = await getPasswordSessionToken();
  return passwordSessionToken ? { Authorization: `Bearer ${passwordSessionToken}` } : {};
}

