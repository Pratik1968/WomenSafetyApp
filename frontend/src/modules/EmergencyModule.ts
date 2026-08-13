import { NativeModules, DeviceEventEmitter } from 'react-native';

const { EmergencyModule } = NativeModules;

export interface EmergencyModuleInterface {
  startForegroundNotification(): Promise<void>;
  stopForegroundNotification(): Promise<void>;
}

export const NativeEmergencyModule: EmergencyModuleInterface = EmergencyModule as EmergencyModuleInterface;

export function addEmergencyActionListener(callback: (action: string) => void) {
  return DeviceEventEmitter.addListener('EmergencyAction', callback);
}
