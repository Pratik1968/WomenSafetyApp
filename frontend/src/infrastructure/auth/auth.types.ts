/**
 * Authentication Domain User & Session Interfaces
 */

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
}

export interface AuthSession {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
}

export type AuthStateChangeCallback = (session: AuthSession) => void;
