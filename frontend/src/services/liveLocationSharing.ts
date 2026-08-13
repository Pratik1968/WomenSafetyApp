/**
 * liveLocationSharing.ts
 *
 * OpenStreetMap + 4.5s Throttled GPS Live Location Sharing Module.
 * Pushes location updates every 4.5 seconds via setInterval independent of OS GPS fix frequency.
 */

import * as Location from "expo-location";
import { API_BASE_URL } from "../api/config";
import { getPublicTrackingUrl } from "../utils/trackingUrl";

export interface LiveLocationData {
  sessionId: string;
  userName: string;
  lat: number;
  lng: number;
  updatedAt: number;
  batteryLevel?: number;
  active: boolean;
}

const UPDATE_INTERVAL_MS = 4500; // 4.5 seconds tick throttle

let watchSubscription: Location.LocationSubscription | null = null;
let updateIntervalTimer: ReturnType<typeof setInterval> | null = null;
let currentCoords: { lat: number; lng: number } | null = null;

/**
 * Starts watching GPS position and pushes location updates every 4.5 seconds.
 * Returns the shareable tracking link.
 */
export async function startLiveLocationSharing(
  sessionId: string,
  userName: string = "Priya Sharma"
): Promise<string> {
  // Clear any existing session timers
  if (updateIntervalTimer) {
    clearInterval(updateIntervalTimer);
    updateIntervalTimer = null;
  }
  if (watchSubscription) {
    watchSubscription.remove();
    watchSubscription = null;
  }

  // Request location permissions
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status === "granted") {
    // Acquire immediate position fix
    const initialPos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    }).catch(() => null);

    if (initialPos) {
      currentCoords = {
        lat: initialPos.coords.latitude,
        lng: initialPos.coords.longitude,
      };
      await pushLocationUpdate(sessionId, userName, currentCoords, true);
    }

    // Subscribe to continuous GPS updates
    watchSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 2000,
        distanceInterval: 5,
      },
      (pos) => {
        currentCoords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
      }
    );
  }

  // 4.5s setInterval throttle - independent of raw GPS fix frequency
  updateIntervalTimer = setInterval(() => {
    if (currentCoords) {
      void pushLocationUpdate(sessionId, userName, currentCoords, true);
    }
  }, UPDATE_INTERVAL_MS);

  return getTrackingShareLink(sessionId);
}

/**
 * Stops GPS watching and update timer, marking the session active: false.
 */
export async function stopLiveLocationSharing(sessionId: string): Promise<void> {
  if (updateIntervalTimer) {
    clearInterval(updateIntervalTimer);
    updateIntervalTimer = null;
  }
  if (watchSubscription) {
    watchSubscription.remove();
    watchSubscription = null;
  }

  // Push final inactive status
  if (currentCoords) {
    await pushLocationUpdate(sessionId, "User", currentCoords, false);
  } else {
    await pushLocationUpdate(sessionId, "User", { lat: 12.9716, lng: 77.5946 }, false);
  }

  // Also hit backend stop endpoint
  try {
    await fetch(`${API_BASE_URL}/api/v1/gps/session/${sessionId}/stop`, {
      method: "POST",
    });
  } catch {
    /* best effort */
  }
}

/**
 * Returns the shareable tracking link.
 */
export function getTrackingShareLink(sessionId: string): string {
  return getPublicTrackingUrl(sessionId);
}

/**
 * Pushes location payload to backend API / Firebase Realtime Database
 */
async function pushLocationUpdate(
  sessionId: string,
  userName: string,
  coords: { lat: number; lng: number },
  active: boolean
): Promise<void> {
  const payload = {
    lat: coords.lat,
    lng: coords.lng,
    updatedAt: Date.now(),
    userName: userName,
    batteryLevel: 88,
    active: active,
  };

  // 1. Direct sync to Firebase Realtime Database
  const firebaseRtdbUrl = `https://women-safety-3d446-default-rtdb.firebaseio.com/tracking_sessions/${sessionId}.json`;
  fetch(firebaseRtdbUrl, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch((err) => console.warn("[liveLocationSharing] Firebase RTDB sync note:", err));

  // 2. Sync to Backend GPS API
  try {
    await fetch(`${API_BASE_URL}/api/v1/gps/ping`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: sessionId,
        user_name: userName,
        latitude: coords.lat,
        longitude: coords.lng,
        battery_level: 88,
        is_active: active,
        updated_at: Date.now(),
      }),
    });
  } catch (err) {
    console.warn("[liveLocationSharing] push error:", err);
  }
}
