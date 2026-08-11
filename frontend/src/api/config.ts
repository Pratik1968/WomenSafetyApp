import { Platform } from "react-native";
import { getBaseUrl } from './apiConfig';

const DEFAULT_HOST = Platform.OS === "android" ? "10.0.2.2" : "localhost";
const defaultUrl = `http://${DEFAULT_HOST}:8000/api/v1`;

const rawBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || process.env.EXPO_PUBLIC_API_URL || getBaseUrl();

export const API_BASE_URL = rawBaseUrl
  ? (rawBaseUrl.endsWith('/api/v1') ? rawBaseUrl : `${rawBaseUrl.replace(/\/$/, '')}/api/v1`)
  : defaultUrl;

