/**
 * Authentication Infrastructure Service
 * Handles user retrieval, state change listeners, token fetching, and logout operations.
 */

import { AuthUser, AuthSession, AuthStateChangeCallback } from './auth.types';
import { AuthError } from '../../errors/AppError';
import { logger } from '../../utils/logger';

export class FirebaseAuthInfrastructureService {
  private currentSession: AuthSession = {
    user: null,
    token: null,
    isAuthenticated: false,
  };

  private listeners: AuthStateChangeCallback[] = [];

  /**
   * Get currently logged-in user profile
   */
  public getCurrentUser(): AuthUser | null {
    return this.currentSession.user;
  }

  /**
   * Get currently logged-in user ID
   */
  public async getCurrentUserId(): Promise<string | null> {
    const user = this.getCurrentUser();
    return user ? user.uid : null;
  }

  /**
   * Check if user is authenticated
   */
  public isAuthenticated(): boolean {
    return this.currentSession.isAuthenticated;
  }

  /**
   * Set user session (e.g. from Firebase / Supabase auth login)
   */
  public setSession(session: AuthSession): void {
    this.currentSession = session;
    this.listeners.forEach(cb => cb(this.currentSession));
  }

  /**
   * Subscribe to authentication state changes
   */
  public onAuthStateChanged(callback: AuthStateChangeCallback): () => void {
    this.listeners.push(callback);
    callback(this.currentSession);

    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  /**
   * Logout current authenticated session
   */
  public async logout(): Promise<void> {
    try {
      logger.info('Logging out user session...');
      this.currentSession = {
        user: null,
        token: null,
        isAuthenticated: false,
      };
      this.listeners.forEach(callback => callback(this.currentSession));
    } catch (err) {
      logger.error('Logout failed', err);
      throw new AuthError('Failed to log out user session.');
    }
  }

  /**
   * Fetch current auth JWT token
   */
  public async getIdToken(): Promise<string | null> {
    return this.currentSession.token;
  }
}

export const firebaseAuthService = new FirebaseAuthInfrastructureService();
