/**
 * Custom Hook for Configuring Custom Distress Keywords & Sensitivity Thresholds
 */

import { VoiceTriggerConfig } from '../types/voice.types';

export const useTriggerKeyword = (): {
  config: VoiceTriggerConfig;
  updateKeyword: (newKeyword: string) => void;
  updateSensitivity: (sensitivity: number) => void;
} => {
  return {
    config: {
      keyword: 'HELP',
      sensitivityThreshold: 0.75,
      continuousListening: true,
      confidenceScore: 0.0,
    },
    updateKeyword: () => {},
    updateSensitivity: () => {},
  };
};
