/**
 * API Central Configuration
 * Dynamically resolves API base URL purely from environment variables.
 */

import { Platform } from 'react-native';

export const getBaseUrl = (): string => {
  const envApiUrl = process.env.EXPO_PUBLIC_API_URL || process.env.EXPO_PUBLIC_API_BASE_URL;

  if (envApiUrl) {
    console.log('[apiConfig] API URL resolved from environment →', envApiUrl);
    return envApiUrl;
  }

  // Fallback for local development when .env is not set:
  // Android Emulator uses 10.0.2.2 to reach host machine localhost.
  // iOS Simulator & Web use localhost.
  const defaultHost = Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000';
  console.warn(`[apiConfig] EXPO_PUBLIC_API_URL not set in .env. Using local default → ${defaultHost}`);
  return defaultHost;
};

export const API_CONFIG = {
  baseURL: getBaseUrl(),
  timeout: 10000, // 10 seconds timeout
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  maxRetries: 2,
  retryDelayMs: 1000,
};

console.log('API BASE URL =', API_CONFIG.baseURL);
