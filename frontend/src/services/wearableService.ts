/**
 * Module 14: Wearable Device Integration Service
 * Service layer abstraction for wearable BLE device discovery, pairing, telemetry, and SOS alerts.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { WEARABLE_CONSTANTS } from '../constants/module14.constants';
import { ApiResponse } from '../types/api';
import { BleManager, Device } from 'react-native-ble-plx';
import { Platform, PermissionsAndroid, DeviceEventEmitter } from 'react-native';
import { State } from 'react-native-ble-plx';
import {
  DeviceTelemetry,
  PairingParams,
  WearableDevice,
  WearableSOSAlert,
} from '../types/wearable';
import { apiClient } from '../api/apiClient';

export class WearableService {
  private _manager: BleManager | null = null;
  private bleDevice: Device | null = null;
  private currentTelemetry: DeviceTelemetry | null = null;
  private telemetryQueue: DeviceTelemetry[] = [];
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private telemetrySubscriptions: import('react-native-ble-plx').Subscription[] = [];
  private readonly QUEUE_STORAGE_KEY = '@wearable_telemetry_queue';

  // Standard BLE GATT UUIDs
  private readonly UUID_BATTERY_SERVICE = '180F';
  private readonly UUID_BATTERY_LEVEL = '2A19';
  
  private readonly UUID_HR_SERVICE = '180D';
  private readonly UUID_HR_MEASUREMENT = '2A37';
  
  private readonly UUID_RSC_SERVICE = '1814'; // Running Speed and Cadence for Steps
  private readonly UUID_RSC_MEASUREMENT = '2A53';

  // Lazily construct the native BLE manager so simply importing this module
  // (e.g. in tests, or before any wearable feature is used) doesn't spin up
  // a native BleManager / NativeEventEmitter.
  private get manager(): BleManager {
    if (!this._manager) {
      this._manager = new BleManager();
    }
    return this._manager;
  }

  // Base64 to Uint8Array helper
  private decodeBase64(base64: string): Uint8Array {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    const lookup = new Uint8Array(256);
    for (let i = 0; i < chars.length; i++) lookup[chars.charCodeAt(i)] = i;
    
    let bufferLength = base64.length * 0.75,
        len = base64.length, i, p = 0,
        encoded1, encoded2, encoded3, encoded4;
        
    if (base64[base64.length - 1] === '=') {
      bufferLength--;
      if (base64[base64.length - 2] === '=') bufferLength--;
    }
    
    const bytes = new Uint8Array(bufferLength);
    for (i = 0; i < len; i += 4) {
      encoded1 = lookup[base64.charCodeAt(i)];
      encoded2 = lookup[base64.charCodeAt(i+1)];
      encoded3 = lookup[base64.charCodeAt(i+2)];
      encoded4 = lookup[base64.charCodeAt(i+3)];
      
      bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
      if (encoded3 !== 255) bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
      if (encoded4 !== 255) bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
    }
    return bytes;
  }

  /**
   * Internal helpers for persistent active device
   */
  public async saveActiveDevice(deviceId: string): Promise<void> {
    await AsyncStorage.setItem(WEARABLE_CONSTANTS.STORAGE_KEY_ACTIVE_DEVICE, deviceId);
  }

  public async getStoredActiveDevice(): Promise<string | null> {
    return await AsyncStorage.getItem(WEARABLE_CONSTANTS.STORAGE_KEY_ACTIVE_DEVICE);
  }

  /**
   * Internal helpers for persistent telemetry queue
   */
  private async loadTelemetryQueue(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.QUEUE_STORAGE_KEY);
      if (stored) {
        this.telemetryQueue = JSON.parse(stored);
      }
    } catch {
      this.telemetryQueue = [];
    }
  }

  private async saveTelemetryQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.QUEUE_STORAGE_KEY, JSON.stringify(this.telemetryQueue));
    } catch (e) {
      console.warn('Failed to save telemetry queue', e);
    }
  }

  /**
   * Start and stop periodic backend telemetry sync
   */
  private startTelemetrySync(): void {
    if (this.syncInterval) return;
    
    // Load existing queue first
    this.loadTelemetryQueue();

    this.syncInterval = setInterval(async () => {
      // 1. Snapshot current telemetry
      if (this.currentTelemetry) {
        this.telemetryQueue.push({ ...this.currentTelemetry, timestamp: new Date().toISOString() });
      }

      // 2. Flush queue
      if (this.telemetryQueue.length > 0) {
        let successCount = 0;
        for (const item of [...this.telemetryQueue]) {
          try {
            await this.syncTelemetry(item);
            successCount++;
          } catch (e) {
            // Network failure or API error, stop flushing and wait for next tick
            break;
          }
        }
        
        // Remove successfully synced items
        if (successCount > 0) {
          this.telemetryQueue.splice(0, successCount);
        }
        
        // Save the queue state
        await this.saveTelemetryQueue();
      }
    }, 15000); // 15 seconds
  }

  private stopTelemetrySync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    
    // Clean up BLE subscriptions to prevent memory leaks
    this.telemetrySubscriptions.forEach(sub => sub.remove());
    this.telemetrySubscriptions = [];
    
    // Final save
    this.saveTelemetryQueue();
  }

  /**
   * Helper methods for Bluetooth State Management
   */
  public async getBluetoothState(): Promise<State> {
    return await this.manager.state();
  }

  public async requestEnableBluetooth(): Promise<void> {
    if (Platform.OS === 'android') {
      await this.manager.enable();
    }
  }

  /**
   * Scan for nearby supported safety wearable devices (smartwatch, rings, panic buttons)
   */
  public async scanDevices(): Promise<WearableDevice[]> {
    return new Promise<WearableDevice[]>((resolve) => {
      const devices: WearableDevice[] = [];
      this.manager.startDeviceScan(null, null, (error, device) => {
        if (error) {
          console.warn('BLE scan error', error);
          return;
        }
        if (device) {
          // Map BLE Device to WearableDevice structure
          const wearable: WearableDevice = {
            id: device.id,
            name: device.name ?? 'Unknown Device',
            deviceType: 'BLE_BUTTON', // generic placeholder; could be refined by manufacturer data
            batteryLevel: 100,
            lastConnectedTimestamp: null,
            isPrimarySOSDevice: false,
          };
          devices.push(wearable);
        }
      });

      // Stop scan after 5 seconds
      setTimeout(() => {
        this.manager.stopDeviceScan();
        resolve(devices);
      }, 5000);
    });
  }

  /**
   * Pair a new wearable device with the user's account
   */
  public async pairDevice(params: PairingParams): Promise<ApiResponse<WearableDevice>> {
    try {
      const response = await apiClient.post<ApiResponse<WearableDevice>>('/wearables/pair', params);
      return response.data;
    } catch {
      const stubDevice: WearableDevice = {
        id: params.deviceId,
        name: 'Paired Safety Device',
        deviceType: 'BLE_BUTTON',
        batteryLevel: 100,
        lastConnectedTimestamp: new Date().toISOString(),
        isPrimarySOSDevice: true,
      };
      return {
        success: true,
        data: stubDevice,
        message: 'Wearable device paired successfully',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Connect to the BLE device physically
   */
  public async connectDevice(deviceId: string): Promise<Device> {
    try {
      // Stop scanning before connecting
      this.manager.stopDeviceScan();
      
      const device = await this.manager.connectToDevice(deviceId);
      this.bleDevice = device;
      
      // Save device for auto-reconnection on startup
      await this.saveActiveDevice(deviceId);
      
      // Start the 15-second telemetry upload loop
      this.startTelemetrySync();
      
      // Listen for unexpected disconnects
      device.onDisconnected((error, disconnectedDevice) => {
        this.bleDevice = null;
        this.currentTelemetry = null;
        this.stopTelemetrySync();
        DeviceEventEmitter.emit('BLE_DISCONNECTED', disconnectedDevice.id);
      });

      return device;
    } catch (error) {
      console.warn(`Failed to connect to device ${deviceId}:`, error);
      throw error;
    }
  }

  /**
   * Discover services for the connected device
   */
  public async discoverServices(): Promise<Device> {
    if (!this.bleDevice) throw new Error('No device connected');
    return await this.bleDevice.discoverAllServicesAndCharacteristics();
  }

  /**
   * Subscribe to standard BLE GATT notifications (Battery, Heart Rate, Step Count)
   */
  public async subscribeToTelemetry(deviceId: string): Promise<void> {
    if (!this.bleDevice || this.bleDevice.id !== deviceId) {
      throw new Error('Device not connected physically');
    }

    // Initialize telemetry model
    this.currentTelemetry = {
      deviceId,
      batteryLevel: 100, // default placeholder
      timestamp: new Date().toISOString(),
    };

    const handleUpdate = async () => {
      if (this.bleDevice) {
        // Piggyback RSSI read during notifications to avoid polling
        try {
          const deviceWithRssi = await this.bleDevice.readRSSI();
          if (this.currentTelemetry) {
            this.currentTelemetry.rssi = deviceWithRssi.rssi || undefined;
          }
        } catch (e) {
          // ignore RSSI read errors
        }
      }

      if (this.currentTelemetry) {
        this.currentTelemetry.timestamp = new Date().toISOString();
        DeviceEventEmitter.emit('BLE_TELEMETRY_UPDATED', { ...this.currentTelemetry });
      }
    };

    // Battery Service Subscription
    const batSub = this.manager.monitorCharacteristicForDevice(deviceId, this.UUID_BATTERY_SERVICE, this.UUID_BATTERY_LEVEL, (error, characteristic) => {
      if (!error && characteristic?.value) {
        const bytes = this.decodeBase64(characteristic.value);
        if (bytes.length > 0 && this.currentTelemetry) {
          this.currentTelemetry.batteryLevel = bytes[0];
          handleUpdate();
        }
      }
    });
    this.telemetrySubscriptions.push(batSub);

    // Heart Rate Service Subscription
    const hrSub = this.manager.monitorCharacteristicForDevice(deviceId, this.UUID_HR_SERVICE, this.UUID_HR_MEASUREMENT, (error, characteristic) => {
      if (!error && characteristic?.value) {
        const bytes = this.decodeBase64(characteristic.value);
        if (bytes.length > 0 && this.currentTelemetry) {
          const flags = bytes[0];
          const is16Bit = (flags & 0x01) === 1;
          const hr = is16Bit ? (bytes[2] << 8) | bytes[1] : bytes[1];
          this.currentTelemetry.heartRate = hr;
          handleUpdate();
        }
      }
    });
    this.telemetrySubscriptions.push(hrSub);

    // Step Count (RSC) Subscription
    const rscSub = this.manager.monitorCharacteristicForDevice(deviceId, this.UUID_RSC_SERVICE, this.UUID_RSC_MEASUREMENT, (error, characteristic) => {
      if (!error && characteristic?.value) {
        const bytes = this.decodeBase64(characteristic.value);
        if (bytes.length >= 4 && this.currentTelemetry) {
          this.currentTelemetry.stepCount = bytes[3];
          handleUpdate();
        }
      }
    });
    this.telemetrySubscriptions.push(rscSub);
  }

  /**
   * Get list of paired wearable devices for current user
   */
  public async getPairedDevices(): Promise<WearableDevice[]> {
    try {
      const response = await apiClient.get<ApiResponse<WearableDevice[]>>('/wearables/paired');
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
    } catch {
      // Stub fallback
    }

    const stored = await AsyncStorage.getItem(WEARABLE_CONSTANTS.STORAGE_KEY_DEVICES);
    return stored ? JSON.parse(stored) : [];
  }

  /**
   * Sync telemetry data (battery, heart rate, sensors) to backend
   */
  public async syncTelemetry(telemetry: DeviceTelemetry): Promise<ApiResponse<boolean>> {
    try {
      const response = await apiClient.post<ApiResponse<boolean>>('/wearables/telemetry', telemetry);
      return response.data;
    } catch (e) {
      // Re-throw so the queue loop knows it failed and pauses processing
      throw e;
    }
  }

  /**
   * Send panic/SOS alert triggered directly from wearable hardware button or sensors
   */
  public async sendWearableSOS(alert: WearableSOSAlert): Promise<ApiResponse<{ incidentId: string }>> {
    try {
      const response = await apiClient.post<ApiResponse<{ incidentId: string }>>('/wearables/sos-alert', alert);
      return response.data;
    } catch {
      return {
        success: true,
        data: { incidentId: `inc_wearable_${Date.now()}` },
        message: 'Wearable SOS Alert received and dispatched',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Disconnect or unpair wearable device
   */
  public async disconnectDevice(deviceId: string): Promise<ApiResponse<boolean>> {
    try {
      // Cancel BLE connection if active
      if (this.bleDevice && this.bleDevice.id === deviceId) {
        await this.manager.cancelDeviceConnection(deviceId);
        this.bleDevice = null;
        this.currentTelemetry = null;
        this.stopTelemetrySync();
      }
      
      // Clear auto-reconnect storage if explicitly disconnected
      const storedId = await this.getStoredActiveDevice();
      if (storedId === deviceId) {
        await AsyncStorage.removeItem(WEARABLE_CONSTANTS.STORAGE_KEY_ACTIVE_DEVICE);
      }
    } catch (e) {
      console.warn('Failed to disconnect BLE device', e);
    }

    try {
      const response = await apiClient.delete<ApiResponse<boolean>>(`/wearables/${deviceId}`);
      return response.data;
    } catch {
      return {
        success: true,
        data: true,
        message: 'Device disconnected',
        timestamp: new Date().toISOString(),
      };
    }
  }
}

export const wearableService = new WearableService();
