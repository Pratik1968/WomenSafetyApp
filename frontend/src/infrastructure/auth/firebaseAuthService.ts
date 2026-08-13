/**
 * Reusable Firebase Authentication Infrastructure Service
 * Thin wrapper around the real `@react-native-firebase/auth` state and the app-password
 * session mechanism already implemented in `services/firebaseConfig.ts`. Handles user
 * retrieval, state change listeners, token fetching (with in-memory caching), and logout.
 */

import { onAuthStateChanged, signOut, type User } from '@react-native-firebase/auth';
import { auth, getPasswordSessionToken, getActivePasswordSessionToken, clearPasswordSessionToken } from '../../services/firebaseConfig';
import { AuthUser, AuthSession, AuthStateChangeCallback } from './auth.types';
import { AuthError } from '../../errors/AppError';
import { logger } from '../../utils/logger';

/** Cached bearer token plus the epoch-ms time it should be treated as stale. */
interface CachedToken {
  token: string;
  expiresAt: number;
}

// Don't serve a cached token that's about to expire — leave this much headroom.
const CACHE_EXPIRY_BUFFER_MS = 60 * 1000;
// App-password session tokens carry no decodable expiry, so cache them briefly and let a
// cleared session (e.g. logout on another device) be picked up reasonably quickly.
const PASSWORD_SESSION_CACHE_TTL_MS = 5 * 60 * 1000;
// Conservative TTL used when a Firebase ID token's `exp` claim can't be decoded.
const FALLBACK_TOKEN_CACHE_TTL_MS = 5 * 60 * 1000;

function mapFirebaseUser(user: User | null): AuthUser | null {
  if (!user) return null;
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    emailVerified: user.emailVerified,
  };
}

/**
 * Decodes the `exp` claim (seconds since epoch) out of a JWT's payload segment, returning it
 * as epoch milliseconds. No signature verification is performed — this is only used for local
 * cache bookkeeping, never for trusting the token's contents. Returns null if the token isn't
 * a well-formed JWT or has no numeric `exp` claim.
 */
function decodeJwtExpiryMs(token: string): number | null {
  try {
    const payloadSegment = token.split('.')[1];
    if (!payloadSegment) return null;
    const json = base64UrlDecodeToString(payloadSegment);
    const payload = JSON.parse(json);
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/**
 * Minimal base64url -> UTF-8-ish string decoder with no external/global dependency (React
 * Native's JS engine does not reliably provide `atob`/`Buffer`). Only used to pull the `exp`
 * claim (plain ASCII digits) out of a JWT payload, so imperfect handling of multi-byte
 * characters elsewhere in the payload is acceptable.
 */
function base64UrlDecodeToString(input: string): string {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  let output = '';
  let buffer = 0;
  let bits = 0;
  for (const char of base64) {
    const value = BASE64_ALPHABET.indexOf(char);
    if (value === -1) continue; // skip padding ('=') and any stray characters
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      output += String.fromCharCode((buffer >> bits) & 0xff);
    }
  }
  return output;
}

export class FirebaseAuthInfrastructureService {
  private listeners: AuthStateChangeCallback[] = [];
  private tokenCache: CachedToken | null = null;
  /**
   * Eagerly hydrates firebaseConfig's in-memory password-session cache from AsyncStorage as
   * soon as this service exists, so a session persisted from a previous app run is visible to
   * onAuthStateChanged's initial emit (see there) instead of that emit assuming "no Firebase
   * user yet" means "signed out". isAuthenticated()/getCurrentUser() stay synchronous and
   * still won't see a persisted session until this (or any other getPasswordSessionToken()
   * caller) resolves — same caveat as before, just narrowed to a single microtask-scale
   * window right after construction instead of "until the app happens to call getIdToken()".
   * Failures are swallowed: a persisted session just won't be visible yet, same as today.
   */
  private readonly passwordSessionHydration: Promise<void> = getPasswordSessionToken()
    .then(() => undefined)
    .catch(() => undefined);

  /**
   * Get currently logged-in user profile. Only a real Firebase user can be mapped to an
   * AuthUser (there's no profile data available client-side for an app-password session), so
   * this returns null both when nobody is signed in AND when only a password session is
   * active — use isAuthenticated() to distinguish the latter from "truly logged out".
   */
  public getCurrentUser(): AuthUser | null {
    return mapFirebaseUser(auth.currentUser);
  }

  /**
   * Get currently logged-in user ID. An app-password session has no Firebase uid available
   * client-side (the backend never hands one back), so this resolves to null in that case
   * rather than fabricating one.
   */
  public async getCurrentUserId(): Promise<string | null> {
    return auth.currentUser?.uid ?? null;
  }

  /**
   * True if either a real Firebase user is signed in or an app-password session token is
   * active. Checks the in-memory session-token cache only (see
   * getActivePasswordSessionToken's doc) — never defaults to true.
   */
  public isAuthenticated(): boolean {
    return !!auth.currentUser || !!getActivePasswordSessionToken();
  }

  /**
   * Subscribe to real Firebase auth state changes. Fires an initial emit reflecting current
   * state and again on every subsequent Firebase auth change. The initial emit is held until
   * passwordSessionHydration resolves (typically already resolved by the time anything calls
   * this, and at most a couple of microtasks otherwise), so it correctly reflects a password
   * session persisted from a previous app run rather than racing it. Note: the app-password
   * flow does not go through Firebase, so logging in with only a password will NOT trigger
   * this callback for *new* logins during the current session — call
   * isAuthenticated()/getCurrentUser() directly when you need that case reflected live.
   */
  public onAuthStateChanged(callback: AuthStateChangeCallback): () => void {
    this.listeners.push(callback);

    let unsubscribeFirebase: (() => void) | null = null;
    let unsubscribed = false;

    void this.passwordSessionHydration.then(() => {
      if (unsubscribed) return;
      unsubscribeFirebase = onAuthStateChanged(auth, (firebaseUser) => {
        callback(this.buildSession(firebaseUser));
      });
    });

    return () => {
      unsubscribed = true;
      this.listeners = this.listeners.filter((l) => l !== callback);
      unsubscribeFirebase?.();
    };
  }

  /**
   * Sign out of both auth mechanisms and clear the in-memory token cache, then notify
   * listeners with the resulting signed-out session (in addition to whatever Firebase's own
   * onAuthStateChanged emits when a real user was signed in).
   */
  public async logout(): Promise<void> {
    try {
      logger.info('Logging out user session from Firebase Auth...');
      if (auth.currentUser) {
        await signOut(auth);
      }
      await clearPasswordSessionToken();
      this.tokenCache = null;

      // Notified manually here (rather than relying solely on Firebase's own
      // onAuthStateChanged) because that native listener never fires at all for a
      // password-only session (signOut() on an already-signed-out Firebase user is a no-op).
      // When a real Firebase user *was* signed in, the signOut(auth) call above will also
      // cause the native listener to fire with the same signed-out session — a harmless,
      // idempotent double emit rather than a bug.
      const signedOutSession: AuthSession = { user: null, token: null, isAuthenticated: false };
      this.listeners.forEach((callback) => callback(signedOutSession));
    } catch (err) {
      logger.error('Firebase Auth logout failed', err);
      throw new AuthError('Failed to log out user session.');
    }
  }

  /**
   * Fetch the current bearer token, called on every outgoing API request via the axios
   * interceptor. Serves a cached token when it's not close to expiry to avoid redundant
   * Firebase/AsyncStorage work per request.
   */
  public async getIdToken(forceRefresh = false): Promise<string | null> {
    const now = Date.now();
    if (!forceRefresh && this.tokenCache && this.tokenCache.expiresAt - now > CACHE_EXPIRY_BUFFER_MS) {
      return this.tokenCache.token;
    }

    const firebaseUser = auth.currentUser;
    if (firebaseUser) {
      const token = await firebaseUser.getIdToken(forceRefresh);
      const decodedExpiryMs = decodeJwtExpiryMs(token);
      this.tokenCache = { token, expiresAt: decodedExpiryMs ?? now + FALLBACK_TOKEN_CACHE_TTL_MS };
      return token;
    }

    const passwordSessionToken = await getPasswordSessionToken();
    if (!passwordSessionToken) {
      this.tokenCache = null;
      return null;
    }

    this.tokenCache = { token: passwordSessionToken, expiresAt: now + PASSWORD_SESSION_CACHE_TTL_MS };
    return passwordSessionToken;
  }

  private buildSession(firebaseUser: User | null): AuthSession {
    return {
      user: mapFirebaseUser(firebaseUser),
      // Not eagerly resolved here — the bearer token is fetched (and cached) on demand via
      // getIdToken(), which is what apiClient's request interceptor actually calls.
      token: null,
      // Reuses isAuthenticated() rather than repeating its `!!auth.currentUser ||
      // !!getActivePasswordSessionToken()` check inline — safe here because this is only ever
      // called from the onAuthStateChanged callback above, where auth.currentUser has already
      // been updated to firebaseUser by the time Firebase fires the listener.
      isAuthenticated: this.isAuthenticated(),
    };
  }
}

export const firebaseAuthService = new FirebaseAuthInfrastructureService();
