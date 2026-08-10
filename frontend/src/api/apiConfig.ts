/**
 * API Central Configuration
 */

import { Platform } from 'react-native';

const ENV = process.env.NODE_ENV || 'development';

const DEV_LAN_API_URL = 'http://127.0.0.1:8000';

export const getBaseUrl = (): string => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  if (ENV === 'production') {
    return 'https://api.aegissafety.app';
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8000';
  }

  return DEV_LAN_API_URL;
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
