/**
 * Voice Module Central Barrel Export
 * Responsibilities: Microphone, Speech Recognition, Transcript Generation.
 */

export * from './types/voice.types';
export * from './types/voiceRecognition.types';
export * from './services/voicePermissions';
export * from './services/voiceRecognitionService';
export * from './services/safetyForegroundBridge';
export * from './services/aiVoiceModelService';
export * from './hooks/useVoiceRecognition';
export * from './hooks/useVoiceSpeech';
export * from './hooks/useTriggerKeyword';
export * from './utils/audioPreprocessor';
export * from './utils/keywordSpotter';
export * from './components/VoiceWaveformVisualizer';
export * from './components/KeywordDetectorBadge';
export * from './screens/VoiceTriggerConfigScreen';
export * from './screens/VoiceTrainingScreen';

// Re-export keyword detection from Emergency module for backward compatibility
export { keywordDetectionService } from '../emergency/services/keywordDetectionService';
export { evaluateKeywordMatch, type KeywordDetectionResult } from '../emergency/utils/keywordMatcher';
export { useKeywordDetection } from '../emergency/hooks/useKeywordDetection';
