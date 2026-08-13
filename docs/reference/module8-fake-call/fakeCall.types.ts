/**
 * Module 8: Fake Call Generator Types
 */

export interface CallerProfile {
  id: string;
  name: string;
  phoneNumber: string;
  avatarUrl?: string | null;
  voicePresetId?: string;
}

export interface VoicePreset {
  id: string;
  label: string;
  audioAsset: string | null;
}

export interface FakeCallConfig {
  callerName: 'Mom ❤️' | 'Dad ❤️';
  ringtone: string;
  vibrate: boolean;
  autoPlayVoice: boolean;
}
