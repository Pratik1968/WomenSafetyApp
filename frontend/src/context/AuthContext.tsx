/**
 * React Context Provider for Global Authentication State
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthUser, AuthSession } from '../infrastructure/auth/auth.types';
import { firebaseAuthService } from '../infrastructure/auth/firebaseAuthService';
import { logger } from '../utils/logger';

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  logout: async () => {},
});

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<AuthSession>({
    user: null,
    token: null,
    isAuthenticated: false,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    logger.info('Initializing AuthContext session listener...');
    const unsubscribe = firebaseAuthService.onAuthStateChanged(newSession => {
      setSession(newSession);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    setIsLoading(true);
    await firebaseAuthService.logout();
    setIsLoading(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user: session.user,
        isAuthenticated: session.isAuthenticated,
        isLoading,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => useContext(AuthContext);
