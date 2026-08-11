import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth, setPasswordSessionToken, clearPasswordSessionToken } from "../../services/firebaseConfig";
import { FirebaseAuthInfrastructureService } from "./firebaseAuthService";

// Mirrors firebaseConfig.ts's private PASSWORD_SESSION_TOKEN_KEY. Writing to it directly (via
// AsyncStorage, bypassing setPasswordSessionToken) simulates a token persisted by a *previous*
// app run that hasn't been loaded into this process's in-memory cache yet — i.e. cold start.
const PASSWORD_SESSION_TOKEN_KEY = "@aegis_password_session_token";

/** Waits for pending microtask chains (e.g. the service's passwordSessionHydration) to settle. */
const flushAsync = () => new Promise<void>((resolve) => setImmediate(resolve));

// No Buffer/atob global is assumed available (mirrors the runtime constraints the service
// itself decodes under), so encode with the same base64url alphabet by hand.
const BASE64_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function base64UrlEncode(input: string): string {
  let output = "";
  let buffer = 0;
  let bits = 0;
  for (let i = 0; i < input.length; i++) {
    buffer = (buffer << 8) | input.charCodeAt(i);
    bits += 8;
    while (bits >= 6) {
      bits -= 6;
      output += BASE64_ALPHABET[(buffer >> bits) & 0x3f];
    }
  }
  if (bits > 0) {
    output += BASE64_ALPHABET[(buffer << (6 - bits)) & 0x3f];
  }
  return output.replace(/\+/g, "-").replace(/\//g, "_");
}

/** Builds a minimal unsigned JWT string carrying only the claims needed for cache bookkeeping. */
function makeJwt(payload: Record<string, unknown>): string {
  const header = base64UrlEncode(JSON.stringify({ alg: "none", typ: "JWT" }));
  const body = base64UrlEncode(JSON.stringify(payload));
  return `${header}.${body}.signature`;
}

const nowSeconds = () => Math.floor(Date.now() / 1000);

describe("FirebaseAuthInfrastructureService", () => {
  const realCurrentUser = auth.currentUser;

  afterEach(async () => {
    (auth as any).currentUser = realCurrentUser;
    await clearPasswordSessionToken();
  });

  describe("getCurrentUser", () => {
    it("returns null when there is no Firebase user and no password session", () => {
      (auth as any).currentUser = null;
      const service = new FirebaseAuthInfrastructureService();

      expect(service.getCurrentUser()).toBeNull();
    });

    it("maps a signed-in Firebase user to the AuthUser shape", () => {
      (auth as any).currentUser = {
        uid: "uid-1",
        email: "user@example.com",
        displayName: "Test User",
        photoURL: null,
        emailVerified: true,
        getIdToken: jest.fn(),
      };
      const service = new FirebaseAuthInfrastructureService();

      expect(service.getCurrentUser()).toEqual({
        uid: "uid-1",
        email: "user@example.com",
        displayName: "Test User",
        photoURL: null,
        emailVerified: true,
      });
    });

    it("returns null for an app-password session too, since no profile data is available client-side", async () => {
      (auth as any).currentUser = null;
      await setPasswordSessionToken("password-session-token");
      const service = new FirebaseAuthInfrastructureService();

      expect(service.getCurrentUser()).toBeNull();
    });
  });

  describe("getCurrentUserId", () => {
    it("resolves the Firebase uid when a Firebase user is signed in", async () => {
      (auth as any).currentUser = { uid: "uid-2", getIdToken: jest.fn() };
      const service = new FirebaseAuthInfrastructureService();

      await expect(service.getCurrentUserId()).resolves.toBe("uid-2");
    });

    it("resolves null for an app-password session (no Firebase uid is available client-side)", async () => {
      (auth as any).currentUser = null;
      await setPasswordSessionToken("password-session-token");
      const service = new FirebaseAuthInfrastructureService();

      await expect(service.getCurrentUserId()).resolves.toBeNull();
    });
  });

  describe("isAuthenticated", () => {
    it("is false when nobody is signed in (does not default to true)", () => {
      (auth as any).currentUser = null;
      const service = new FirebaseAuthInfrastructureService();

      expect(service.isAuthenticated()).toBe(false);
    });

    it("is true when a real Firebase user is signed in", () => {
      (auth as any).currentUser = { uid: "uid-3", getIdToken: jest.fn() };
      const service = new FirebaseAuthInfrastructureService();

      expect(service.isAuthenticated()).toBe(true);
    });

    it("is true when an app-password session token is active", async () => {
      (auth as any).currentUser = null;
      await setPasswordSessionToken("password-session-token");
      const service = new FirebaseAuthInfrastructureService();

      expect(service.isAuthenticated()).toBe(true);
    });
  });

  describe("getIdToken caching", () => {
    it("serves the cached Firebase token on a second call and does not call getIdToken again", async () => {
      const getIdToken = jest.fn().mockResolvedValue(makeJwt({ exp: nowSeconds() + 3600 }));
      (auth as any).currentUser = { uid: "uid-4", getIdToken };
      const service = new FirebaseAuthInfrastructureService();

      const first = await service.getIdToken();
      const second = await service.getIdToken();

      expect(getIdToken).toHaveBeenCalledTimes(1);
      expect(second).toBe(first);
    });

    it("bypasses the cache and calls getIdToken again when forceRefresh is true", async () => {
      const getIdToken = jest.fn().mockResolvedValue(makeJwt({ exp: nowSeconds() + 3600 }));
      (auth as any).currentUser = { uid: "uid-5", getIdToken };
      const service = new FirebaseAuthInfrastructureService();

      await service.getIdToken();
      await service.getIdToken(true);

      expect(getIdToken).toHaveBeenCalledTimes(2);
      expect(getIdToken).toHaveBeenLastCalledWith(true);
    });

    it("does not serve a cached token that is within the 60s expiry buffer", async () => {
      // Expires in 30s, inside the 60s buffer, so the cache should be treated as stale.
      const getIdToken = jest.fn().mockResolvedValue(makeJwt({ exp: nowSeconds() + 30 }));
      (auth as any).currentUser = { uid: "uid-6", getIdToken };
      const service = new FirebaseAuthInfrastructureService();

      await service.getIdToken();
      await service.getIdToken();

      expect(getIdToken).toHaveBeenCalledTimes(2);
    });

    it("caches for a conservative TTL when the token cannot be decoded as a JWT", async () => {
      const getIdToken = jest.fn().mockResolvedValue("not-a-jwt-token");
      (auth as any).currentUser = { uid: "uid-7", getIdToken };
      const service = new FirebaseAuthInfrastructureService();

      await service.getIdToken();
      await service.getIdToken();

      expect(getIdToken).toHaveBeenCalledTimes(1);
    });

    it("falls back to the app-password session token when no Firebase user is signed in", async () => {
      (auth as any).currentUser = null;
      await setPasswordSessionToken("password-session-token");
      const service = new FirebaseAuthInfrastructureService();

      await expect(service.getIdToken()).resolves.toBe("password-session-token");
    });

    it("returns null when neither a Firebase user nor a password session is present", async () => {
      (auth as any).currentUser = null;
      const service = new FirebaseAuthInfrastructureService();

      await expect(service.getIdToken()).resolves.toBeNull();
    });

    it("clears the cache on logout so the next call resolves to null", async () => {
      const getIdToken = jest.fn().mockResolvedValue(makeJwt({ exp: nowSeconds() + 3600 }));
      (auth as any).currentUser = { uid: "uid-8", getIdToken };
      const service = new FirebaseAuthInfrastructureService();

      await service.getIdToken();
      // The @react-native-firebase/auth mock's signOut() doesn't itself clear auth.currentUser,
      // so clear it here to simulate what a real signOut(auth) would do.
      (auth as any).currentUser = null;
      await service.logout();

      await expect(service.getIdToken()).resolves.toBeNull();
    });
  });

  describe("logout", () => {
    it("notifies subscribed listeners with a signed-out session", async () => {
      (auth as any).currentUser = null;
      await setPasswordSessionToken("password-session-token");
      const service = new FirebaseAuthInfrastructureService();
      const callback = jest.fn();
      service.onAuthStateChanged(callback);
      await flushAsync(); // let the initial emit (held for passwordSessionHydration) land
      callback.mockClear(); // drop the initial emit fired on subscribe

      await service.logout();

      expect(callback).toHaveBeenCalledWith({ user: null, token: null, isAuthenticated: false });
      expect(service.isAuthenticated()).toBe(false);
    });
  });

  describe("onAuthStateChanged", () => {
    it("emits an initial session that reflects an active (already-hydrated) password session, and returns a working unsubscribe", async () => {
      (auth as any).currentUser = null;
      await setPasswordSessionToken("password-session-token");
      const service = new FirebaseAuthInfrastructureService();
      const callback = jest.fn();

      const unsubscribe = service.onAuthStateChanged(callback);
      await flushAsync();

      expect(callback).toHaveBeenCalledWith({ user: null, token: null, isAuthenticated: true });
      expect(() => unsubscribe()).not.toThrow();
    });

    it("reflects a password session persisted by a previous app run on the very first emit, even though it hasn't been loaded into memory yet", async () => {
      (auth as any).currentUser = null;
      // Nothing has called setPasswordSessionToken/getPasswordSessionToken in this test yet,
      // so firebaseConfig's in-memory cache is cold — only AsyncStorage "remembers" the token,
      // exactly as it would be on a fresh app launch after a previous logged-in session.
      await AsyncStorage.setItem(PASSWORD_SESSION_TOKEN_KEY, "persisted-token");

      const service = new FirebaseAuthInfrastructureService();
      const callback = jest.fn();
      service.onAuthStateChanged(callback);
      await flushAsync();

      expect(callback).toHaveBeenCalledWith({ user: null, token: null, isAuthenticated: true });
    });

    it("unsubscribing before hydration resolves prevents the Firebase subscription from ever being made", async () => {
      (auth as any).currentUser = null;
      await setPasswordSessionToken("password-session-token");
      const service = new FirebaseAuthInfrastructureService();
      const callback = jest.fn();

      const unsubscribe = service.onAuthStateChanged(callback);
      unsubscribe();
      await flushAsync();

      expect(callback).not.toHaveBeenCalled();
    });
  });
});
