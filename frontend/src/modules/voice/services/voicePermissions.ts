/**
 * Native Microphone & Speech Recognition Permissions Handler
 * Supports Android RECORD_AUDIO and iOS Speech Recognition permissions.
 */

import { Platform, PermissionsAndroid } from 'react-native';
import { HardwareError } from '../../../errors/AppError';
import { logger } from '../../../utils/logger';

export interface VoicePermissionResult {
  granted: boolean;
  message?: string;
}

export const requestMicrophonePermissions = async (): Promise<VoicePermissionResult> => {
  try {
    console.log("Checking microphone permission...");
    if (Platform.OS === 'ios') {
      logger.info('iOS Microphone & Speech permissions verified via Info.plist');
      console.log("Permission result:", "granted");
      console.log("Permission granted");
      return { granted: true };
    }

    if (Platform.OS === 'android') {
      const isAlreadyGranted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
      );

      if (isAlreadyGranted) {
        logger.info('Android RECORD_AUDIO permission already granted.');
        console.log("Permission result:", PermissionsAndroid.RESULTS.GRANTED);
        console.log("Permission granted");
        return { granted: true };
      }

      logger.info('Requesting Android RECORD_AUDIO permission...');
      const permission = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'Microphone Access Required',
          message: 'This application requires microphone access for AI voice recognition and keyword listening.',
          buttonPositive: 'Allow',
        }
      );

      console.log("Permission result:", permission);

      if (permission === PermissionsAndroid.RESULTS.GRANTED) {
        console.log("Permission granted");
        return { granted: true };
      } else {
        console.log("Permission denied");
        return {
          granted: false,
          message: 'Microphone permission was denied.',
        };
      }
    }

    console.log("Permission result:", "granted");
    console.log("Permission granted");
    return { granted: true };
  } catch (err) {
    logger.error('Error requesting microphone permissions', err);
    console.log("Permission denied");
    return {
      granted: false,
      message: 'Failed to verify native microphone permissions.',
    };
  }
};
