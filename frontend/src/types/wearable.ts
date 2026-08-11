/**
 * Module 14: Wearable Device Integration Types
 */

export type WearableDeviceType = 'SMARTWATCH' | 'SMART_RING' | 'PANIC_PENDANT' | 'BLE_BUTTON';

export type WearableConnectionState =
  | 'DISCONNECTED'
  | 'SCANNING'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'ERROR';

export interface WearableDevice {
  id: string;
  name: string;
  macAddress?: string;
  deviceType: WearableDeviceType;
  batteryLevel: number; // 0 to 100
  firmwareVersion?: string;
  lastConnectedTimestamp: string | null;
  isPrimarySOSDevice: boolean;
}

export interface DeviceTelemetry {
  deviceId: string;
  heartRate?: number;
  batteryLevel: number;
  latitude?: number;
  longitude?: number;
  accelerometerData?: { x: number; y: number; z: number };
  stepCount?: number;
  rssi?: number;
  timestamp: string;
}

export interface WearableSOSAlert {
  alertId: string;
  deviceId: string;
  triggerType: 'MANUAL_BUTTON' | 'FALL_DETECTION' | 'HIGH_HEART_RATE' | 'VOICE_TRIGGER';
  latitude: number;
  longitude: number;
  batteryLevel: number;
  timestamp: string;
}

export interface PairingParams {
  deviceId: string;
  pairingCode?: string;
  autoConnect?: boolean;
}
