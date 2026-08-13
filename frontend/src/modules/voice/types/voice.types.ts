/**
 * AI Voice Recognition Domain Types & Interfaces
 */

export interface VoiceTriggerConfig {
  keyword: string;
  sensitivityThreshold: number; // 0.0 to 1.0
  continuousListening: boolean;
  confidenceScore: number;
}

export interface VoiceDetectionEvent {
  timestamp: number;
  detectedKeyword: string;
  confidence: number;
  audioClipUri?: string;
}

export interface VoiceModelMeta {
  modelName: string;
  version: string;
  sampleRate: number; // e.g. 16000 Hz
  frameSize: number;
}
