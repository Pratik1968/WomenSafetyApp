import { Platform } from "react-native";

// Override via EXPO_PUBLIC_API_BASE_URL in frontend/.env, e.g. to point at a LAN IP or a deployed backend.
// Default: Android emulators map 10.0.2.2 to host localhost. On physical USB devices without an override,
// run `adb reverse tcp:8000 tcp:8000` instead.
const DEFAULT_HOST = Platform.OS === "android" ? "10.0.2.2" : "localhost";
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? `http://${DEFAULT_HOST}:8000/api/v1`;
