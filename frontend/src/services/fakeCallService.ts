/**
 * Module 8: Fake Call Generator Service
 * Service layer abstraction for instant fake call settings.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { FakeCallConfig, CallerProfile } from '../types/fakeCall';

const STORAGE_KEY_CONFIG = '@fake_call_instant_config';

export const DEFAULT_FAKE_CALL_CONFIG: FakeCallConfig = {
  callerName: 'Mom',
  ringtone: 'Marimba',
  vibrate: true,
  autoPlayVoice: true,
  delayMinutes: 0,
};

export class FakeCallService {
  /**
   * Load user's preferred instant fake call configuration
   */
  public async getConfig(): Promise<FakeCallConfig> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY_CONFIG);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<FakeCallConfig>;
        return {
          ...DEFAULT_FAKE_CALL_CONFIG,
          ...parsed,
          delayMinutes: parsed.delayMinutes ?? 0,
        };
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

  /**
   * Get available caller profiles (mocked for now)
   */
  public async getCallerProfiles(): Promise<CallerProfile[]> {
    return [
      { id: '1', name: 'Mom', phoneNumber: '+1234567890', voicePresetId: 'female_friendly' },
      { id: '2', name: 'Dad', phoneNumber: '+0987654321', voicePresetId: 'male_friendly' },
    ];
  }

  /**
   * Trigger an instant fake call
   */
  public async triggerInstantCall(params: { caller: CallerProfile, voicePresetId: string, isInstant: boolean }): Promise<void> {
    console.log('Triggering instant call with params:', params);
  }

  /**
   * Schedule a fake call
   */
  public async scheduleFakeCall(params: { callerId: string, delaySeconds: number }): Promise<void> {
    console.log('Scheduling fake call with params:', params);
  }
}

export const fakeCallService = new FakeCallService();
