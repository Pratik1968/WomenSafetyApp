/**
 * Module 14: Wearable Device Integration Constants
 */

export const WEARABLE_CONSTANTS = {
  STORAGE_KEY_DEVICES: '@wearable_paired_devices',
  STORAGE_KEY_ACTIVE_DEVICE: '@wearable_active_device',

  DEFAULT_TELEMETRY_INTERVAL_MS: 10000, // 10 seconds sync rate
  LOW_BATTERY_THRESHOLD_PERCENT: 15,

  DEVICE_TYPES: [
    { type: 'SMARTWATCH', label: 'Smartwatch', icon: 'watch' },
    { type: 'SMART_RING', label: 'Smart Safety Ring', icon: 'circle' },
    { type: 'PANIC_PENDANT', label: 'SOS Panic Pendant', icon: 'shield' },
    { type: 'BLE_BUTTON', label: 'BLE Wireless SOS Button', icon: 'radio' },
  ],

  CONNECTION_STATUS: {
    DISCONNECTED: 'DISCONNECTED',
    SCANNING: 'SCANNING',
    CONNECTING: 'CONNECTING',
    CONNECTED: 'CONNECTED',
    ERROR: 'ERROR',
  } as const,

  SERVICE_UUIDS: {
    HEART_RATE_SERVICE: '0000180d-0000-1000-8000-00805f9b34fb',
    BATTERY_SERVICE: '0000180f-0000-1000-8000-00805f9b34fb',
    CUSTOM_SOS_SERVICE: 'a3d4f100-8f92-4b21-b328-98e90f23e412',
  },
};
