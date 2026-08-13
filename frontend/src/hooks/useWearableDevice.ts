/**
 * Module 14: Wearable Device Integration Custom Hook
 * Connects Wearable UI elements to the wearableService layer, handling scanning, pairing, battery status, and SOS events.
 */

import { useCallback, useEffect, useState } from 'react';
import { DeviceEventEmitter, Alert, Linking, Platform } from 'react-native';
import { wearableService } from '../services/wearableService';
import { requestBLEPermissions } from '../services/blePermissions';
import { ApiError } from '../types/api';
import {
  DeviceTelemetry,
  WearableConnectionState,
  WearableDevice,
  WearableSOSAlert,
} from '../types/wearable';
import { parseError } from '../utils/errorHandler';

export function useWearableDevice() {
  const [pairedDevices, setPairedDevices] = useState<WearableDevice[]>([]);
  const [activeDevice, setActiveDevice] = useState<WearableDevice | null>(null);
  const [scannedDevices, setScannedDevices] = useState<WearableDevice[]>([]);
  const [connectionStatus, setConnectionStatus] =
    useState<WearableConnectionState>('DISCONNECTED');
  const [telemetry, setTelemetry] = useState<DeviceTelemetry | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<ApiError | null>(null);

  /**
   * Centralized helper to check adapter state and request native permissions
   */
  const checkAndRequestBluetoothAccess = useCallback(async (isInteractive: boolean = true): Promise<boolean> => {
    try {
      // 1. Check if Bluetooth is completely disabled
      const btState = await wearableService.getBluetoothState();
      if (btState === 'PoweredOff') {
        if (isInteractive) {
          if (Platform.OS === 'android') {
            await wearableService.requestEnableBluetooth();
          } else {
            Alert.alert(
              'Bluetooth is Disabled',
              'Please enable Bluetooth in your Control Center or Settings to connect to safety wearables.',
              [{ text: 'OK' }]
            );
            return false;
          }
        } else {
          return false;
        }
      }

      // 2. Validate native OS permissions
      const permResult = await requestBLEPermissions();
      if (!permResult.granted) {
        if (isInteractive) {
          if (permResult.status === 'never_ask_again') {
            Alert.alert(
              'Permissions Denied',
              'You have permanently denied Bluetooth permissions. Please open your device Settings and grant Bluetooth access to use wearable features.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Open Settings', onPress: () => Linking.openSettings() }
              ]
            );
          } else {
            Alert.alert('Permission Required', permResult.message || 'Bluetooth access was denied.');
          }
        }
        return false;
      }

      return true;
    } catch (e) {
      if (isInteractive) {
        Alert.alert('Bluetooth Error', 'An unexpected error occurred while verifying Bluetooth status.');
      }
      return false;
    }
  }, []);

  /**
   * Load paired wearable devices on mount
   */
  const loadPairedDevices = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const devices = await wearableService.getPairedDevices();
      setPairedDevices(devices);
      
      const storedActiveId = await wearableService.getStoredActiveDevice();
      
      if (devices.length > 0) {
        // Find the device that was previously active
        const deviceToActivate = devices.find(d => d.id === storedActiveId) || devices[0];
        setActiveDevice(deviceToActivate);
        
        if (storedActiveId && deviceToActivate.id === storedActiveId) {
          setConnectionStatus('CONNECTING');
          try {
            await wearableService.connectDevice(storedActiveId);
            await wearableService.discoverServices();
            await wearableService.subscribeToTelemetry(storedActiveId);
            setConnectionStatus('CONNECTED');
          } catch (connErr) {
            console.warn('Auto-reconnect failed', connErr);
            setConnectionStatus('DISCONNECTED');
            // Keep activeDevice populated so UI shows it, just disconnected
          }
        } else {
          setConnectionStatus('DISCONNECTED');
        }
      }
    } catch (err) {
      setError(parseError(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPairedDevices();
  }, [loadPairedDevices]);

  /**
   * Listen for unexpected BLE device disconnects
   */
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('BLE_DISCONNECTED', (deviceId: string) => {
      setConnectionStatus('DISCONNECTED');
      // Set activeDevice to null or keep it depending on UX. Keeping it allows reconnection.
      // But for accuracy in connection state:
      if (activeDevice?.id === deviceId) {
        setTelemetry(null);
        // Option to clear: setActiveDevice(null);
        // Prompt says maintain connected device instance.
      }
    });

    const telemetrySub = DeviceEventEmitter.addListener('BLE_TELEMETRY_UPDATED', (data: DeviceTelemetry) => {
      setTelemetry(data);
    });

    return () => {
      subscription.remove();
      telemetrySub.remove();
    };
  }, [activeDevice]);

  /**
   * Scan for available BLE safety wearable hardware
   */
  const scanForDevices = useCallback(async () => {
    const hasAccess = await checkAndRequestBluetoothAccess(true);
    if (!hasAccess) return;

    setIsLoading(true);
    setConnectionStatus('SCANNING');
    setError(null);
    try {
      const foundDevices = await wearableService.scanDevices();
      setScannedDevices(foundDevices);
    } catch (err) {
      setError(parseError(err));
      setConnectionStatus('ERROR');
    } finally {
      setIsLoading(false);
    }
  }, [checkAndRequestBluetoothAccess]);

  /**
   * Pair a wearable device
   */
  const pairDevice = useCallback(async (deviceId: string) => {
    const hasAccess = await checkAndRequestBluetoothAccess(true);
    if (!hasAccess) return;

    setIsLoading(true);
    setConnectionStatus('CONNECTING');
    setError(null);
    try {
      const response = await wearableService.pairDevice({ deviceId });
      if (response.success && response.data) {
        // Physical BLE Connection
        await wearableService.connectDevice(deviceId);
        await wearableService.discoverServices();
        
        // Start live telemetry (Battery, HR, Steps, RSSI)
        await wearableService.subscribeToTelemetry(deviceId);

        setPairedDevices((prev) => [...prev, response.data!]);
        setActiveDevice(response.data);
        setConnectionStatus('CONNECTED');
      }
    } catch (err) {
      setError(parseError(err));
      setConnectionStatus('ERROR');
    } finally {
      setIsLoading(false);
    }
  }, [checkAndRequestBluetoothAccess]);

  /**
   * Send wearable hardware SOS trigger
   */
  const triggerWearableSOS = useCallback(
    async (triggerType: WearableSOSAlert['triggerType'] = 'MANUAL_BUTTON') => {
      if (!activeDevice) return;

      setIsLoading(true);
      setError(null);

      try {
        const sosPayload: WearableSOSAlert = {
          alertId: `sos_${Date.now()}`,
          deviceId: activeDevice.id,
          triggerType,
          latitude: 0, // Should be populated by GPS service
          longitude: 0,
          batteryLevel: activeDevice.batteryLevel,
          timestamp: new Date().toISOString(),
        };

        await wearableService.sendWearableSOS(sosPayload);
      } catch (err) {
        setError(parseError(err));
      } finally {
        setIsLoading(false);
      }
    },
    [activeDevice]
  );

  /**
   * Disconnect or unpair device
   */
  const disconnectDevice = useCallback(
    async (deviceId: string) => {
      setIsLoading(true);
      setError(null);
      try {
        await wearableService.disconnectDevice(deviceId);
        setPairedDevices((prev) => prev.filter((d) => d.id !== deviceId));
        if (activeDevice?.id === deviceId) {
          setActiveDevice(null);
          setConnectionStatus('DISCONNECTED');
        }
      } catch (err) {
        setError(parseError(err));
      } finally {
        setIsLoading(false);
      }
    },
    [activeDevice]
  );

  return {
    pairedDevices,
    scannedDevices,
    activeDevice,
    connectionStatus,
    telemetry,
    isLoading,
    error,
    scanForDevices,
    pairDevice,
    triggerWearableSOS,
    disconnectDevice,
    loadPairedDevices,
    // Expose explicitly requested aliases
    isConnected: connectionStatus === 'CONNECTED',
    connectedDevice: activeDevice,
    connectionState: connectionStatus,
  };
}
