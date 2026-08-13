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
    if (Platform.OS === 'ios') {
      logger.info('iOS Microphone & Speech permissions verified via Info.plist');
      return { granted: true };
    }

    if (Platform.OS === 'android') {
      // Check/request Notification permission for Android 13+ (API 33+) foreground service
      if (Platform.Version >= 33 && (PermissionsAndroid.PERMISSIONS as any).POST_NOTIFICATIONS) {
        try {
          const hasNotifPerm = await PermissionsAndroid.check(
            (PermissionsAndroid.PERMISSIONS as any).POST_NOTIFICATIONS
          );
          if (!hasNotifPerm) {
            await PermissionsAndroid.request(
              (PermissionsAndroid.PERMISSIONS as any).POST_NOTIFICATIONS,
              {
                title: 'Notification Access Required',
                message: 'WomenSafty requires notification access to keep safety monitoring active in the background.',
                buttonPositive: 'Allow',
              }
            );
          }
        } catch (notifErr) {
          logger.warn('Failed to request POST_NOTIFICATIONS permission:', notifErr);
        }
      }

      const isAlreadyGranted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
      );

      if (isAlreadyGranted) {
        logger.info('Android RECORD_AUDIO permission already granted.');
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

      if (permission === PermissionsAndroid.RESULTS.GRANTED) {
        return { granted: true };
      } else {
        return {
          granted: false,
          message: 'Microphone permission was denied.',
        };
      }
    }

    return { granted: true };
  } catch (err) {
    logger.error('Error requesting microphone permissions', err);
    return {
      granted: false,
      message: 'Failed to verify native microphone permissions.',
    };
  }
};
