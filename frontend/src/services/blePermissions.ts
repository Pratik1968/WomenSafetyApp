/**
 * Native Bluetooth Permissions Handler
 * Supports Android 12+ (API 31+), Android 10-11 (API 29-30), and iOS permission requests.
 */

import { Platform, PermissionsAndroid } from 'react-native';
import { AppError } from '../utils/errorHandler';

export interface BLEPermissionResult {
  granted: boolean;
  status: 'granted' | 'denied' | 'never_ask_again';
  message?: string;
}

export const requestBLEPermissions = async (): Promise<BLEPermissionResult> => {
  try {
    if (Platform.OS === 'ios') {
      console.log('iOS Bluetooth permissions managed via Info.plist (NSBluetoothAlwaysUsageDescription)');
      return { granted: true, status: 'granted' };
    }

    if (Platform.OS === 'android') {
      const apiLevel = Platform.Version as number;

      // Android 12+ (API 31+) requires BLUETOOTH_SCAN and BLUETOOTH_CONNECT
      if (apiLevel >= 31) {
        console.log('Requesting Android 12+ Bluetooth permissions (SCAN & CONNECT)...');
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);

        const allGranted =
          granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] === PermissionsAndroid.RESULTS.GRANTED &&
          granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] === PermissionsAndroid.RESULTS.GRANTED;

        if (!allGranted) {
          const neverAskAgain =
            granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN ||
            granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN;

          return {
            granted: false,
            status: neverAskAgain ? 'never_ask_again' : 'denied',
            message: 'Android 12+ Bluetooth Scan and Connect permissions were denied by the user.',
          };
        }
        return { granted: true, status: 'granted' };
      }

      // Android 10-11 (API <= 30) requires ACCESS_FINE_LOCATION
      console.log('Requesting Android 10-11 Bluetooth Location permissions...');
      const locationGranted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Bluetooth Location Access',
          message: 'This application requires location access to scan for nearby safety BLE wearables.',
          buttonPositive: 'Grant Permission',
        }
      );

      if (locationGranted !== PermissionsAndroid.RESULTS.GRANTED) {
        const neverAskAgain = locationGranted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN;
        return {
          granted: false,
          status: neverAskAgain ? 'never_ask_again' : 'denied',
          message: 'Location permission required for BLE device discovery was denied.',
        };
      }
      return { granted: true, status: 'granted' };
    }

    return { granted: true, status: 'granted' };
  } catch (err) {
    console.error('Error requesting native Bluetooth permissions', err);
    throw new AppError('Failed to verify native Bluetooth permissions on this device.', 'HARDWARE_ERROR');
  }
};
