/**
 * Module 8: Fake Call Generator Service
 * Service layer abstraction for instant fake call settings.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { FakeCallConfig } from '../types/fakeCall';

const STORAGE_KEY_CONFIG = '@fake_call_instant_config';

export const DEFAULT_FAKE_CALL_CONFIG: FakeCallConfig = {
  callerName: 'Mom ❤️',
  ringtone: 'Marimba',
  vibrate: true,
  autoPlayVoice: true,
};

export class FakeCallService {
  /**
   * Load user's preferred instant fake call configuration
   */
  public async getConfig(): Promise<FakeCallConfig> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY_CONFIG);
      if (stored) {
        return JSON.parse(stored) as FakeCallConfig;
      }
    } catch (err) {
      console.error('Failed to load fake call config', err);
    }
    return DEFAULT_FAKE_CALL_CONFIG;
  }

  /**
   * Save user's preferred instant fake call configuration
   */
  public async saveConfig(config: FakeCallConfig): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
    } catch (err) {
      console.error('Failed to save fake call config', err);
    }
  }
}

export const fakeCallService = new FakeCallService();
