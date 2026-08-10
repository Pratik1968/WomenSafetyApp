import { getBaseUrl } from './apiConfig';

const rawBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || process.env.EXPO_PUBLIC_API_URL || getBaseUrl();

export const API_BASE_URL = rawBaseUrl
  ? (rawBaseUrl.endsWith('/api/v1') ? rawBaseUrl : `${rawBaseUrl.replace(/\/$/, '')}/api/v1`)
  : '';
