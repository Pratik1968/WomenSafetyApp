/**
 * Firebase Authentication Configuration & Error Code Constants
 */

export const FIREBASE_CONSTANTS = {
  AUTH_STATE_CHANGED_EVENT: 'onAuthStateChanged',
  SESSION_PERSISTENCE: 'LOCAL',
  ERROR_CODES: {
    USER_NOT_FOUND: 'auth/user-not-found',
    INVALID_PASSWORD: 'auth/wrong-password',
    EXPIRED_TOKEN: 'auth/id-token-expired',
    NETWORK_FAILED: 'auth/network-request-failed',
  },
};
