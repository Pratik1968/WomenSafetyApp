/**
 * Custom Hook for Voice Recognition Listening State & Detection Triggers
 */

import { VoiceDetectionEvent } from '../types/voice.types';

export const useVoiceRecognition = (): {
  isListening: boolean;
  lastDetection: VoiceDetectionEvent | null;
  startVoiceListening: () => Promise<void>;
  stopVoiceListening: () => Promise<void>;
} => {
  return {
    isListening: false,
    lastDetection: null,
    startVoiceListening: async () => {},
    stopVoiceListening: async () => {},
  };
};
