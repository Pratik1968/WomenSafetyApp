import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { API_BASE_URL } from "../api/config";
import { auth, getAuthHeader } from "./firebaseConfig";

const DEVICE_ID_STORAGE_KEY = "@aegis_device_id";

async function getOrCreateDeviceId(): Promise<string> {
  const existing = await AsyncStorage.getItem(DEVICE_ID_STORAGE_KEY);
  if (existing) return existing;

  const generated = `${Platform.OS}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  await AsyncStorage.setItem(DEVICE_ID_STORAGE_KEY, generated);
  return generated;
}

/**
 * Registers this device's FCM token with the backend so push notifications can be
 * delivered. Encapsulates the network call so it can be swapped/extended (retries,
 * auth headers) without touching the permission-flow UI code.
 */
export const deviceRegistrationService = {
  async registerDeviceToken(fcmToken: string): Promise<void> {
    const deviceId = await getOrCreateDeviceId();
    const firebaseUid = auth.currentUser?.uid;
    const response = await fetch(`${API_BASE_URL}/devices/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await getAuthHeader()) },
      body: JSON.stringify({
        deviceId,
        platform: Platform.OS,
        fcmToken,
        firebaseUid,
      }),
    });

    if (!response.ok) {
      throw new Error(`Device registration failed with status ${response.status}`);
    }
  },
};
