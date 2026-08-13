/**
 * AI Voice Recognition Model Constants
 */

export const VOICE_CONSTANTS = {
  SAMPLE_RATE_HZ: 16000,
  FRAME_SIZE_SAMPLES: 512,
  DEFAULT_SENSITIVITY: 0.8, // 80%
  MIN_SENSITIVITY: 0.5,
  MAX_SENSITIVITY: 0.95,
  MODEL_WEIGHTS_FILE_NAME: 'keyword_spotting_v2.tflite',
  AUDIO_CLIP_DURATION_SEC: 3,
};
