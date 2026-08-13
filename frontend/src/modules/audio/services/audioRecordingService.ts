/**
 * audioRecordingService.ts
 *
 * Module 6 — Standalone Audio Recording Service.
 * Captures high-quality ambient audio evidence (.m4a / AAC) using expo-av.
 *
 * IMPORTANT PLATFORM LIMITATION:
 * iOS does not support continuous background microphone recording unless specialized
 * audio background modes and active audio sessions are configured by the OS.
 * On iOS, microphone access may be suspended by the system when the app is backgrounded.
 * Android relies on the safety foreground service bridge for continuous lifecycle support.
 *
 * Designed to be safely invoked fire-and-forget by future SOS orchestrator steps
 * without throwing unhandled exceptions into the emergency pipeline.
 */

import { Audio } from 'expo-av';
import { audioPermissionService } from './audioPermissionService';
import { audioUploadService } from './audioUploadService';
import {
  determineAudioFilename,
  determineMimeType,
  getFileSize,
  validateRecordingUri,
} from '../utils/audioFileUtils';
import type {
  AudioRecordingMetadata,
  AudioRecordingResult,
  AudioRecordingState,
  AudioRecordingStatus,
} from '../types/audioRecording.types';
import { logger } from '../../../utils/logger';

export class AudioRecordingService {
  private recording: Audio.Recording | null = null;
  private state: AudioRecordingState = 'IDLE';
  private startTimestamp: number | null = null;
  private localIncidentId: string | null = null;
  private stateListeners: Set<(state: AudioRecordingState) => void> = new Set();

  /**
   * Subscribes a listener to recording state transitions.
   *
   * @param listener Callback receiving state updates
   * @returns Unsubscribe function
   */
  public onStateChange(listener: (state: AudioRecordingState) => void): () => void {
    this.stateListeners.add(listener);
    listener(this.state);
    return () => {
      this.stateListeners.delete(listener);
    };
  }

  private setState(newState: AudioRecordingState): void {
    if (this.state !== newState) {
      this.state = newState;
      logger.info(`[AudioRecordingService] State -> ${newState}`);
      this.stateListeners.forEach((fn) => {
        try {
          fn(newState);
        } catch (err) {
          logger.warn('[AudioRecordingService] Listener error:', err);
        }
      });
    }
  }

  /**
   * Current recording state snapshot.
   */
  public getStatus(): AudioRecordingStatus {
    const isRec = this.state === 'RECORDING' && this.recording !== null;
    const durationMs = isRec && this.startTimestamp ? Date.now() - this.startTimestamp : undefined;

    return {
      state: this.state,
      isRecording: isRec,
      durationMs,
      localIncidentId: this.localIncidentId ?? undefined,
    };
  }

  /**
   * Whether an active recording session is currently underway.
   */
  public isRecording(): boolean {
    return this.state === 'RECORDING' && this.recording !== null;
  }

  /**
   * Requests necessary microphone recording permissions.
   *
   * @returns true if permission is granted, false otherwise
   */
  public async requestPermissions(): Promise<boolean> {
    this.setState('REQUESTING_PERMISSION');
    const granted = await audioPermissionService.requestMicrophonePermission();
    if (!granted) {
      this.setState('PERMISSION_DENIED');
      return false;
    }
    this.setState('IDLE');
    return true;
  }

  /**
   * Starts an ambient audio recording session.
   * Configures the audio mode, prepares high-quality AAC/.m4a presets, and begins capture.
   *
   * Safe to call repeatedly: prevents starting a duplicate recording if one is already active.
   * Never throws — errors are caught, logged without sensitive audio details, and returned safely.
   *
   * @param localIncidentId - Optional client-side incident tracking ID
   * @returns Structured AudioRecordingResult
   */
  public async startRecording(localIncidentId?: string): Promise<AudioRecordingResult> {
    try {
      // 1. Guard against duplicate active recordings
      if (this.isRecording()) {
        logger.warn('[AudioRecordingService] A recording is already active. Ignoring duplicate start request.');
        return {
          success: true,
          error: 'Recording is already in progress',
          metadata: {
            fileUri: this.recording?.getURI() || '',
            fileName: determineAudioFilename(this.localIncidentId ?? undefined),
            mimeType: 'audio/m4a',
            startTimestamp: this.startTimestamp ?? Date.now(),
            localIncidentId: this.localIncidentId ?? undefined,
          },
        };
      }

      this.setState('REQUESTING_PERMISSION');

      // 2. Verify microphone permissions
      const hasPermission = await audioPermissionService.requestMicrophonePermission();
      if (!hasPermission) {
        this.setState('PERMISSION_DENIED');
        logger.warn('[AudioRecordingService] Microphone permission denied. Recording aborted.');
        return {
          success: false,
          error: 'Microphone permission denied',
        };
      }

      // 3. Configure audio mode for recording
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false, // iOS microphone in background is OS-restricted
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
      } catch (modeErr) {
        logger.warn('[AudioRecordingService] Failed to set audio mode, attempting fallback:', modeErr);
      }

      // 4. Create and start the expo-av Recording instance using HIGH_QUALITY preset (.m4a / AAC)
      const recordingInstance = new Audio.Recording();
      await recordingInstance.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recordingInstance.startAsync();

      this.recording = recordingInstance;
      this.startTimestamp = Date.now();
      this.localIncidentId = localIncidentId ?? null;
      this.setState('RECORDING');

      logger.info('[AudioRecordingService] Audio recording started successfully.', {
        localIncidentId: this.localIncidentId,
        startTimestamp: this.startTimestamp,
      });

      return {
        success: true,
        metadata: {
          fileUri: recordingInstance.getURI() || '',
          fileName: determineAudioFilename(localIncidentId),
          mimeType: 'audio/m4a',
          startTimestamp: this.startTimestamp,
          localIncidentId: this.localIncidentId ?? undefined,
        },
      };
    } catch (err) {
      this.setState('FAILED');
      logger.error('[AudioRecordingService] Failed to start audio recording:', err);
      this.cleanUpRecorder();
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown recording error',
      };
    }
  }

  /**
   * Stops the active recording session, calculates duration/filesize,
   * cleans up recorder references, and returns structured recording metadata.
   *
   * Safe to call when no recording is active: returns a non-throwing error result.
   *
   * @returns Structured AudioRecordingResult with local file URI and metadata
   */
  public async stopRecording(localIncidentId?: string): Promise<AudioRecordingResult> {
    try {
      if (!this.recording) {
        logger.warn('[AudioRecordingService] No active recording to stop.');
        if (this.state !== 'IDLE' && this.state !== 'COMPLETED') {
          this.setState('IDLE');
        }
        return {
          success: false,
          error: 'No active recording to stop',
        };
      }

      // Guard: prevent stopping recording belonging to another incident
      if (localIncidentId && this.localIncidentId && this.localIncidentId !== localIncidentId) {
        logger.warn(
          `[AudioRecordingService] stopRecording called with incident ID "${localIncidentId}", but active recording belongs to "${this.localIncidentId}". Ignoring.`
        );
        return {
          success: false,
          error: 'Incident ID does not match active recording',
        };
      }

      this.setState('STOPPING');
      const activeRec = this.recording;
      const endTimestamp = Date.now();
      const startTimestamp = this.startTimestamp ?? endTimestamp;
      const incidentId = this.localIncidentId;

      let fileUri: string | null = null;
      let durationMs = endTimestamp - startTimestamp;

      try {
        const status = await activeRec.getStatusAsync();
        if (status.canRecord || status.isRecording) {
          await activeRec.stopAndUnloadAsync();
        }

        fileUri = activeRec.getURI();
        if (status && 'durationMillis' in status && typeof status.durationMillis === 'number' && status.durationMillis > 0) {
          durationMs = status.durationMillis;
        }
      } catch (recStopErr) {
        logger.warn('[AudioRecordingService] Error stopping recording instance:', recStopErr);
        fileUri = activeRec.getURI();
      }

      // Release audio recorder reference
      this.cleanUpRecorder();

      // Validate recording file
      const isValid = await validateRecordingUri(fileUri);
      if (!fileUri || !isValid) {
        this.setState('FAILED');
        logger.error('[AudioRecordingService] Recording output file is invalid or empty:', fileUri);
        return {
          success: false,
          error: 'Recording produced an invalid or missing file',
        };
      }

      const fileName = determineAudioFilename(incidentId ?? undefined);
      const mimeType = determineMimeType(fileUri);
      const fileSize = await getFileSize(fileUri);

      const metadata: AudioRecordingMetadata = {
        fileUri,
        fileName,
        mimeType,
        fileSize,
        durationMs,
        startTimestamp,
        endTimestamp,
        localIncidentId: incidentId ?? undefined,
      };

      this.setState('COMPLETED');
      logger.info('[AudioRecordingService] Recording stopped successfully.', {
        fileName,
        fileSize,
        durationMs,
      });

      return {
        success: true,
        fileUri,
        metadata,
      };
    } catch (err) {
      this.setState('FAILED');
      logger.error('[AudioRecordingService] Unexpected error stopping recording:', err);
      this.cleanUpRecorder();
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown stop recording error',
      };
    }
  }

  /**
   * Helper that stops recording and invokes upload without blocking caller pipelines.
   * Forward-compatible for later SOS orchestrator integration.
   *
   * @param localIncidentId - Client incident ID
   * @param userId - Optional user ID for storage attribution
   */
  public async stopAndUpload(
    localIncidentId?: string,
    _userId?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Guard: check if an incident ID is passed and mismatches active recording
      if (localIncidentId && this.localIncidentId && this.localIncidentId !== localIncidentId) {
        logger.warn(
          `[AudioRecordingService] stopAndUpload called for incident "${localIncidentId}", but active recording is for "${this.localIncidentId}". Ignoring.`
        );
        return {
          success: false,
          error: 'Incident ID does not match active recording',
        };
      }

      const stopResult = await this.stopRecording(localIncidentId);
      if (!stopResult.success || !stopResult.fileUri || !stopResult.metadata) {
        return {
          success: false,
          error: stopResult.error || 'Failed to stop recording for upload',
        };
      }

      this.setState('UPLOADING');

      const uploadResult = await audioUploadService.uploadAudioRecording(
        stopResult.fileUri,
        stopResult.metadata
      );

      if (uploadResult.success) {
        this.setState('COMPLETED');
      } else {
        this.setState('FAILED');
      }

      return {
        success: uploadResult.success,
        error: uploadResult.error,
      };
    } catch (err) {
      this.setState('FAILED');
      logger.error('[AudioRecordingService] stopAndUpload error:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'stopAndUpload failed',
      };
    }
  }

  /**
   * Resets recorder reference and tracking state.
   */
  private cleanUpRecorder(): void {
    this.recording = null;
    this.startTimestamp = null;
    this.localIncidentId = null;
  }
}

export const audioRecordingService = new AudioRecordingService();
