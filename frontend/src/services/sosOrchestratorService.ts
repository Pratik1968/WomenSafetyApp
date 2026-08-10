/**
 * sosOrchestratorService.ts
 *
 * Central SOS pipeline orchestrator. This is the single source of truth for
 * "what happens when SOS is triggered." All trigger sources (button, shake,
 * future: volume-button, widget) funnel through triggerSOS().
 *
 * Pipeline (in order, each step is best-effort ΓÇö failures logged but don't abort):
 *   1. Acquire current GPS location (with last-known-location fallback)
 *   2. Load emergency contacts from contactStorageService
 *   3. Send silent SMS to all contacts  (via sosNativeService)
 *   4. Place silent call to primary contact (via sosNativeService)
 *   5. Show persistent "SOS Active" local notification (via expo-notifications)
 *   6. Persist incident to AsyncStorage (for History screen)
 *   7. Start live location watch ΓåÆ append location updates to incident log
 *
 * Exports:
 *   triggerSOS(source)      ΓåÆ Promise<string>  (returns incidentId)
 *   cancelSOS(incidentId)   ΓåÆ Promise<void>
 *   getIncidents()          ΓåÆ Promise<SOSIncident[]>
 *   getActiveIncidentId()   ΓåÆ string | null
 */

import { Platform, PermissionsAndroid } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import { contactStorageService } from "./contactStorageService";
import { sendSilentSms, makeSilentCall } from "./sosNativeService";

// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// Types
// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

export type SOSTriggerSource = "BUTTON" | "SHAKE";

export type SOSIncidentStatus = "active" | "resolved" | "cancelled";

export interface SOSLocation {
  lat: number;
  lon: number;
  timestamp: number;
  accurate: boolean;
}

export interface SOSLogEntry {
  step: string;
  timestamp: number;
  data?: Record<string, unknown>;
}

export interface SOSIncident {
  id: string;
  source: SOSTriggerSource;
  startTime: number;
  endTime?: number;
  status: SOSIncidentStatus;
  location: SOSLocation | null;
  contactsNotified: string[];
  timeline: SOSLogEntry[];
}

// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// Constants
// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

const INCIDENTS_STORAGE_KEY = "@aegis_incidents_v2";
const LAST_LOCATION_KEY = "@aegis_last_known_location";
const MAX_STORED_INCIDENTS = 50;
const LIVE_LOCATION_INTERVAL_MS = 10_000; // 10 seconds
const LIVE_LOCATION_DISTANCE_M = 10;      // 10 metres

const SOS_NOTIFICATION_CHANNEL_ID = "sos-alerts";
const SOS_NOTIFICATION_ID_PREFIX = "sos-active-";

// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// Module-level state (in-memory; re-initialised on app restart)
// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

let activeIncidentId: string | null = null;
let locationWatcher: Location.LocationSubscription | null = null;

// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// Helpers
// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

function generateIncidentId(): string {
  return `sos-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

async function getCachedLocation(): Promise<SOSLocation | null> {
  try {
    const raw = await AsyncStorage.getItem(LAST_LOCATION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SOSLocation;
  } catch {
    return null;
  }
}

async function cacheLocation(loc: SOSLocation): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_LOCATION_KEY, JSON.stringify(loc));
  } catch {
    // Non-critical ΓÇö best effort
  }
}

/**
 * Acquires the current GPS position with a timeout fallback to the last
 * cached location. Always caches a successful fix for future fallbacks.
 */
async function acquireLocation(): Promise<SOSLocation | null> {
  try {
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Highest,
    });
    const loc: SOSLocation = {
      lat: pos.coords.latitude,
      lon: pos.coords.longitude,
      timestamp: pos.timestamp,
      accurate: true,
    };
    await cacheLocation(loc);
    return loc;
  } catch {
    // GPS unavailable ΓÇö use last known location as fallback
    const cached = await getCachedLocation();
    if (cached) return { ...cached, accurate: false };
    return null;
  }
}

/**
 * Reads and parses the incident list from AsyncStorage.
 * Returns an empty array on any parse/read failure.
 */
async function readIncidents(): Promise<SOSIncident[]> {
  try {
    const raw = await AsyncStorage.getItem(INCIDENTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeIncidents(incidents: SOSIncident[]): Promise<void> {
  try {
    await AsyncStorage.setItem(
      INCIDENTS_STORAGE_KEY,
      JSON.stringify(incidents.slice(0, MAX_STORED_INCIDENTS))
    );
  } catch (err) {
    console.warn("[sosOrchestrator] Failed to persist incidents:", err);
  }
}

async function patchIncident(
  id: string,
  updater: (inc: SOSIncident) => SOSIncident
): Promise<void> {
  const incidents = await readIncidents();
  const idx = incidents.findIndex((i) => i.id === id);
  if (idx === -1) return;
  incidents[idx] = updater(incidents[idx]);
  await writeIncidents(incidents);
}

async function appendLog(
  incidentId: string,
  step: string,
  data?: Record<string, unknown>
): Promise<void> {
  await patchIncident(incidentId, (inc) => ({
    ...inc,
    timeline: [
      ...inc.timeline,
      { step, timestamp: Date.now(), data },
    ],
  }));
}

async function ensureAndroidPermissions(): Promise<void> {
  if (Platform.OS !== "android") return;
  try {
    const permissions = [
      PermissionsAndroid.PERMISSIONS.SEND_SMS,
      PermissionsAndroid.PERMISSIONS.CALL_PHONE,
    ];
    if (typeof Platform.Version === "number" && Platform.Version >= 33) {
      permissions.push(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
    }
    await PermissionsAndroid.requestMultiple(permissions);
  } catch (err) {
    console.warn("[sosOrchestrator] Android permissions request error:", err);
  }
}

async function setupNotificationChannel(): Promise<void> {
  try {
    await Notifications.setNotificationChannelAsync(SOS_NOTIFICATION_CHANNEL_ID, {
      name: "SOS Alerts",
      importance: Notifications.AndroidImportance.HIGH,
      enableLights: true,
      lightColor: "#FF0000",
      enableVibrate: true,
    });
  } catch {
    // Channel creation may fail on iOS or older Android ΓÇö non-critical
  }
}

async function showSOSActiveNotification(incidentId: string): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      identifier: `${SOS_NOTIFICATION_ID_PREFIX}${incidentId}`,
      content: {
        title: "≡ƒÜ¿ SOS Activated",
        body: "Emergency alerts sent. Tap to open SOS screen. Shake to cancel.",
        data: { incidentId },
        sticky: true,
      },
      trigger: null,
    });
  } catch (err) {
    console.warn("[sosOrchestrator] Could not show notification:", err);
  }
}

async function dismissSOSNotification(incidentId: string): Promise<void> {
  try {
    await Notifications.dismissNotificationAsync(
      `${SOS_NOTIFICATION_ID_PREFIX}${incidentId}`
    );
  } catch {
    // Non-critical
  }
}

// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
// Public API
// ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

/**
 * Returns the currently active SOS incident ID, or null if no SOS is active.
 */
export function getActiveIncidentId(): string | null {
  return activeIncidentId;
}

/**
 * Returns all stored SOS incidents from AsyncStorage, newest first.
 */
export async function getIncidents(): Promise<SOSIncident[]> {
  const incidents = await readIncidents();
  return incidents.sort((a, b) => b.startTime - a.startTime);
}

/**
 * Main SOS trigger ΓÇö runs the full emergency pipeline.
 *
 * @param source - 'BUTTON' (user pressed the SOS button) or 'SHAKE' (shake trigger)
 * @returns The incidentId (use to track / cancel this incident)
 */
export async function triggerSOS(source: SOSTriggerSource): Promise<string> {
  // Ensure native Android runtime permissions (SEND_SMS, CALL_PHONE, POST_NOTIFICATIONS)
  await ensureAndroidPermissions();

  const incidentId = generateIncidentId();
  activeIncidentId = incidentId;

  // ΓöÇΓöÇ Step 1: Create incident record immediately ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  const incident: SOSIncident = {
    id: incidentId,
    source,
    startTime: Date.now(),
    status: "active",
    location: null,
    contactsNotified: [],
    timeline: [
      { step: "SOS_TRIGGERED", timestamp: Date.now(), data: { source } },
    ],
  };

  const incidents = await readIncidents();
  incidents.unshift(incident);
  await writeIncidents(incidents);

  // ΓöÇΓöÇ Step 2: Get location (with fallback) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  const location = await acquireLocation();
  await patchIncident(incidentId, (inc) => ({ ...inc, location }));
  if (location) {
    await appendLog(incidentId, "LOCATION_ACQUIRED", {
      lat: location.lat,
      lon: location.lon,
      accurate: location.accurate,
    });
  }

  // ΓöÇΓöÇ Step 3: Load emergency contacts ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  const contacts = await contactStorageService.getStoredEmergencyContacts();
  const phones = contacts
    .map((c) => (c.phone ?? "").replace(/\s+/g, ""))
    .filter(Boolean);

  // ΓöÇΓöÇ Step 4: Build SOS message ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  const mapsLink = location
    ? `https://maps.google.com/?q=${location.lat},${location.lon}`
    : "Location unavailable";
  const timeStr = new Date().toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const message =
    `≡ƒÜ¿ SOS ALERT from Aegis Safety App\n` +
    `I need immediate help! (${timeStr})\n` +
    `My location: ${mapsLink}\n` +
    `Please call me or come to my location.`;

  // ΓöÇΓöÇ Step 5: Send silent SMS to all contacts ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  if (phones.length > 0) {
    const smsSent = await sendSilentSms(phones, message);
    await appendLog(incidentId, "SMS_SENT", {
      numbers: phones,
      success: smsSent,
    });
    await patchIncident(incidentId, (inc) => ({
      ...inc,
      contactsNotified: phones,
    }));
  } else {
    await appendLog(incidentId, "SMS_SKIPPED", { reason: "No contacts configured" });
  }

  // ΓöÇΓöÇ Step 6: Call primary contact silently ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  if (phones.length > 0) {
    // Short delay so SMS is dispatched before we lock the phone in a call
    await new Promise((r) => setTimeout(r, 800));
    const callPlaced = await makeSilentCall(phones[0]);
    await appendLog(incidentId, "CALL_PLACED", {
      number: phones[0],
      success: callPlaced,
    });
  }

  // ΓöÇΓöÇ Step 7: Show persistent notification ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  await setupNotificationChannel();
  await showSOSActiveNotification(incidentId);

  // ΓöÇΓöÇ Step 8: Start live location watch ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  try {
    locationWatcher = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: LIVE_LOCATION_INTERVAL_MS,
        distanceInterval: LIVE_LOCATION_DISTANCE_M,
      },
      async (pos) => {
        const loc: SOSLocation = {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          timestamp: pos.timestamp,
          accurate: true,
        };
        await cacheLocation(loc);
        await patchIncident(incidentId, (inc) => ({ ...inc, location: loc }));
        await appendLog(incidentId, "LOCATION_UPDATE", {
          lat: loc.lat,
          lon: loc.lon,
        });
      }
    );
    await appendLog(incidentId, "LIVE_TRACKING_STARTED", {});
  } catch (err) {
    await appendLog(incidentId, "LIVE_TRACKING_FAILED", {
      reason: String(err),
    });
  }

  return incidentId;
}

/**
 * Cancels an active SOS incident:
 *   - Stops the live location watcher
 *   - Dismisses the SOS notification
 *   - Marks the incident as resolved in AsyncStorage
 *   - Clears the active incident ID
 *
 * @param incidentId - The ID returned by triggerSOS()
 * @param status     - 'resolved' (user confirmed safe) or 'cancelled' (accidental)
 */
export async function cancelSOS(
  incidentId: string,
  status: "resolved" | "cancelled" = "resolved"
): Promise<void> {
  // Stop live location tracking
  if (locationWatcher) {
    locationWatcher.remove();
    locationWatcher = null;
  }

  // Clear active incident
  if (activeIncidentId === incidentId) {
    activeIncidentId = null;
  }

  // Dismiss notification
  await dismissSOSNotification(incidentId);

  // Mark incident as ended in storage
  await patchIncident(incidentId, (inc) => ({
    ...inc,
    status,
    endTime: Date.now(),
  }));
  await appendLog(incidentId, "SOS_ENDED", { status });
}
