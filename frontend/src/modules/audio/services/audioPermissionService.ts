/**
 * audioPermissionService.ts
 *
 * Handles microphone permission requests and verification for audio recording.
 * Reuses the native voice permission bridge and expo-av permission checks.
 *
 * Guaranteed never to throw unhandled exceptions so callers (like SOS) can
 * safely query permissions without pipeline disruption.
 */

import { Audio } from 'expo-av';
import { requestMicrophonePermissions } from '../../voice/services/voicePermissions';
import { logger } from '../../../utils/logger';

export class AudioPermissionService {
  /**
   * Requests microphone recording permissions from the user/OS.
   * Checks native platform permissions first and verifies expo-av audio permissions.
   *
   * @returns true if permission is granted, false otherwise.
   */
  public async requestMicrophonePermission(): Promise<boolean> {
    try {
      // 1. Check native permissions (Android RECORD_AUDIO / notification permissions if needed)
      const nativeResult = await requestMicrophonePermissions();
      if (!nativeResult.granted) {
        logger.warn('[AudioPermissionService] Native microphone permission denied:', nativeResult.message);
        return false;
      }

      // 2. Request / verify expo-av audio recording permissions
      if (Audio && typeof Audio.requestPermissionsAsync === 'function') {
        const expoPerm = await Audio.requestPermissionsAsync();
        if (expoPerm.status !== 'granted') {
          logger.warn('[AudioPermissionService] Expo-AV microphone permission not granted:', expoPerm.status);
          return false;
        }
      }

      logger.info('[AudioPermissionService] Microphone permissions granted.');
      return true;
    } catch (err) {
      logger.error('[AudioPermissionService] Error requesting microphone permissions:', err);
      return false;
    }
  }

  /**
   * Verifies if microphone permission has already been granted without showing a prompt.
   *
   * @returns true if permission is currently granted, false otherwise.
   */
  public async hasMicrophonePermission(): Promise<boolean> {
    try {
      if (Audio && typeof Audio.getPermissionsAsync === 'function') {
        const expoPerm = await Audio.getPermissionsAsync();
        return expoPerm.status === 'granted';
      }
      return true;
    } catch (err) {
      logger.warn('[AudioPermissionService] Error checking microphone permissions:', err);
      return false;
    }
  }
}

export const audioPermissionService = new AudioPermissionService();
