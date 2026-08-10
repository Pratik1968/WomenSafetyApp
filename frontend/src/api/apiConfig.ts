/**
 * API Central Configuration
 * Dynamically resolves API base URL purely from environment variables.
 */

export const getBaseUrl = (): string => {
  const envApiUrl = process.env.EXPO_PUBLIC_API_URL || process.env.EXPO_PUBLIC_API_BASE_URL;

  if (envApiUrl) {
    console.log('[apiConfig] API URL resolved from environment →', envApiUrl);
    return envApiUrl;
  }

  console.warn('[apiConfig] Warning: EXPO_PUBLIC_API_URL or EXPO_PUBLIC_API_BASE_URL is not configured in .env file.');
  return '';
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
