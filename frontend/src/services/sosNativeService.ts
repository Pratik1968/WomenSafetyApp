/**
 * sosNativeService.ts
 *
 * Typed TypeScript wrapper around the custom Android native modules:
 *   - NativeModules.SOSModule  (silent SMS + ACTION_CALL)
 *   - NativeModules.ShakeModule (start/stop ShakeDetectionService)
 *
 * Graceful degradation strategy:
 *   - On iOS, Expo Go, or any environment where the native module is absent,
 *     all functions are silent no-ops (log a warning instead of crashing).
 *   - This means existing Jest tests and iOS builds work without modification.
 *
 * Usage from JS:
 *   import { sendSilentSms, makeSilentCall, addShakeTriggerListener } from './sosNativeService';
 */

import {
  NativeModules,
  DeviceEventEmitter,
  Platform,
  type EmitterSubscription,
} from "react-native";

// ──────────────────────────────────────────────────────────────
// Native module references (may be undefined in non-native envs)
// ──────────────────────────────────────────────────────────────

const { SOSModule, ShakeModule } = NativeModules as {
  SOSModule?: {
    sendSilentSms(numbers: string[], message: string): Promise<boolean>;
    makeSilentCall(number: string): Promise<boolean>;
  };
  ShakeModule?: {
    startShakeDetection(): Promise<boolean>;
    stopShakeDetection(): Promise<boolean>;
  };
};

const isNativeAvailable = () => Platform.OS === "android" && !!NativeModules.SOSModule;
const isShakeAvailable = () => Platform.OS === "android" && !!NativeModules.ShakeModule;

function warnFallback(method: string): void {
  console.warn(
    `[sosNativeService] ${method}: native module unavailable (Expo Go / iOS / test env). ` +
      "Falling back to no-op."
  );
}

// ──────────────────────────────────────────────────────────────
// SMS
// ──────────────────────────────────────────────────────────────

/**
 * Sends a silent SMS to each number in [phoneNumbers].
 * On Android: uses SmsManager — no UI, no chooser.
 * On iOS / Expo Go: logs a warning and resolves false.
 */
export async function sendSilentSms(
  phoneNumbers: string[],
  message: string
): Promise<boolean> {
  if (!isNativeAvailable() || !NativeModules.SOSModule) {
    warnFallback("sendSilentSms");
    return false;
  }
  try {
    return await NativeModules.SOSModule.sendSilentSms(phoneNumbers, message);
  } catch (err) {
    console.error("[sosNativeService] sendSilentSms failed:", err);
    return false;
  }
}

// ──────────────────────────────────────────────────────────────
// Phone call
// ──────────────────────────────────────────────────────────────

/**
 * Places a phone call silently (ACTION_CALL) — no dialer UI, call starts immediately.
 * On Android: uses Intent.ACTION_CALL — requires CALL_PHONE permission.
 * On iOS / Expo Go: logs a warning and resolves false.
 */
export async function makeSilentCall(phoneNumber: string): Promise<boolean> {
  if (!isNativeAvailable() || !NativeModules.SOSModule) {
    warnFallback("makeSilentCall");
    return false;
  }
  try {
    return await NativeModules.SOSModule.makeSilentCall(phoneNumber);
  } catch (err) {
    console.error("[sosNativeService] makeSilentCall failed:", err);
    return false;
  }
}

// ──────────────────────────────────────────────────────────────
// Shake detection service
// ──────────────────────────────────────────────────────────────

/**
 * Starts the native Android ShakeDetectionService foreground service.
 * Safe to call multiple times. No-op on iOS / Expo Go.
 */
export async function startShakeDetection(): Promise<boolean> {
  if (!isShakeAvailable() || !NativeModules.ShakeModule) {
    warnFallback("startShakeDetection");
    return false;
  }
  try {
    return await NativeModules.ShakeModule.startShakeDetection();
  } catch (err) {
    console.error("[sosNativeService] startShakeDetection failed:", err);
    return false;
  }
}

/**
 * Stops the native Android ShakeDetectionService foreground service.
 * No-op on iOS / Expo Go.
 */
export async function stopShakeDetection(): Promise<boolean> {
  if (!isShakeAvailable() || !NativeModules.ShakeModule) {
    warnFallback("stopShakeDetection");
    return false;
  }
  try {
    return await NativeModules.ShakeModule.stopShakeDetection();
  } catch (err) {
    console.error("[sosNativeService] stopShakeDetection failed:", err);
    return false;
  }
}

/**
 * Subscribes to shake trigger events emitted by ShakeDetectionService.
 * The callback is called whenever the native service detects a valid shake.
 *
 * Returns an EmitterSubscription — call .remove() to unsubscribe.
 *
 * Example:
 *   const sub = addShakeTriggerListener(() => startCountdown());
 *   return () => sub.remove();
 */
export function addShakeTriggerListener(
  callback: () => void
): EmitterSubscription {
  return DeviceEventEmitter.addListener("onShakeTriggered", callback);
}
