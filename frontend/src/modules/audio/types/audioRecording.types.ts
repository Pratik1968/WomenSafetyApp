/**
 * Audio Recording Module Types
 *
 * Defines domain models, state representations, recording metadata, and upload
 * results for Module 6 — Audio Recording.
 */

export type AudioRecordingState =
  | 'IDLE'
  | 'REQUESTING_PERMISSION'
  | 'RECORDING'
  | 'STOPPING'
  | 'UPLOADING'
  | 'COMPLETED'
  | 'PERMISSION_DENIED'
  | 'FAILED';

export interface AudioRecordingMetadata {
  fileUri: string;
  fileName: string;
  mimeType: string;
  fileSize?: number;
  durationMs?: number;
  startTimestamp?: number;
  endTimestamp?: number;
  localIncidentId?: string;
  checksumSha256?: string;
}

export interface AudioRecordingResult {
  success: boolean;
  fileUri?: string;
  metadata?: AudioRecordingMetadata;
  error?: string;
}

export interface AudioUploadResult {
  success: boolean;
  evidenceId?: string;
  storagePath?: string;
  status?: 'pending' | 'ready' | 'failed';
  localIncidentId?: string;
  error?: string;
}

export interface AudioRecordingStatus {
  state: AudioRecordingState;
  isRecording: boolean;
  durationMs?: number;
  localIncidentId?: string;
}
