/**
 * Module 6 — Audio Recording
 *
 * Public module entry point exporting domain types, recording services, upload services,
 * permission helpers, and file utilities.
 */

// Types
export type {
  AudioRecordingState,
  AudioRecordingMetadata,
  AudioRecordingResult,
  AudioUploadResult,
  AudioRecordingStatus,
} from './types/audioRecording.types';

// Services
export { audioRecordingService, AudioRecordingService } from './services/audioRecordingService';
export { audioUploadService, AudioUploadService } from './services/audioUploadService';
export { audioPermissionService, AudioPermissionService } from './services/audioPermissionService';

// Utilities
export {
  determineAudioFilename,
  determineMimeType,
  getFileSize,
  validateRecordingUri,
  deleteLocalFile,
} from './utils/audioFileUtils';
