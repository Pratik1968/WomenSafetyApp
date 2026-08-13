/**
 * audioUploadService.ts
 *
 * Module 6 — Standalone Audio Upload Service.
 * Implements the 3-step signed-upload flow using the existing Supabase Edge Function:
 *   1. Request signed upload URL (POST storage/evidence/upload-url)
 *   2. Upload binary audio bytes to the signed storage path
 *   3. Finalize evidence row (POST storage/evidence) with checksum, tamper seal, size, duration
 *
 * Handles client-side incident tracking, ensures local file deletion ONLY upon successful upload,
 * suppresses sensitive audio bytes/URLs from logging, and provides non-throwing failure recovery.
 */

import * as FileSystem from 'expo-file-system/legacy';
import * as Crypto from 'expo-crypto';
import { decode } from 'base64-arraybuffer';
import { supabase, ensureSession } from '../../../data/supabase';
import { callFn } from '../../../data/functions';
import { deleteLocalFile, validateRecordingUri } from '../utils/audioFileUtils';
import type { AudioRecordingMetadata, AudioUploadResult } from '../types/audioRecording.types';
import { logger } from '../../../utils/logger';

// UUID validation regex (RFC 4122)
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface SignedUploadUrlResponse {
  evidence_id: string;
  path: string;
  token: string;
  signedUrl: string;
}

export interface FinalizeEvidenceResponse {
  evidence: {
    id: string;
    user_id: string;
    incident_id?: string | null;
    type: string;
    storage_path: string;
    file_name: string;
    mime_type?: string;
    size_bytes: number;
    duration_seconds?: number;
    status: string;
  };
}

export class AudioUploadService {
  /**
   * Uploads an audio recording file to secure Supabase storage using the edge function pipeline.
   *
   * @param fileUri - Local URI of the audio file to upload
   * @param metadata - Recording metadata (timestamps, incident ID, filename, duration)
   * @returns Structured AudioUploadResult
   */
  public async uploadAudioRecording(
    fileUri: string,
    metadata: AudioRecordingMetadata
  ): Promise<AudioUploadResult> {
    const localIncidentId = metadata.localIncidentId;

    try {
      logger.info('[AudioUploadService] Starting audio evidence upload process.', {
        fileName: metadata.fileName,
        localIncidentId,
      });

      // ── Step 1: Validate local file existence ──────────────────
      const isValid = await validateRecordingUri(fileUri);
      if (!isValid) {
        logger.error('[AudioUploadService] Local recording file not found or invalid:', fileUri);
        return {
          success: false,
          localIncidentId,
          error: 'Local audio file does not exist or is invalid',
        };
      }

      // Ensure active auth session
      try {
        await ensureSession();
      } catch (authErr) {
        logger.error('[AudioUploadService] Failed to establish Supabase session for upload:', authErr);
        return {
          success: false,
          localIncidentId,
          error: 'Authentication required for audio upload',
        };
      }

      // Check if local incident ID is a valid database UUID
      // The PostgreSQL evidence table strictly enforces UUID type for incident_id.
      // Frontend client-side SOS IDs (e.g., 'sos-1234-abc') must not be sent to Postgres as UUID.
      const dbIncidentId = localIncidentId && UUID_REGEX.test(localIncidentId) ? localIncidentId : undefined;

      if (localIncidentId && !dbIncidentId) {
        logger.info(
          `[AudioUploadService] Client incident ID "${localIncidentId}" is not a PostgreSQL UUID. Evidence will be linked via client metadata.`
        );
      }

      // ── Step 2: Request signed upload URL from Edge Function ───
      const uploadUrlPayload = {
        file_name: metadata.fileName || `audio_evidence_${Date.now()}.m4a`,
        type: 'audio',
        mime_type: metadata.mimeType || 'audio/m4a',
        incident_id: dbIncidentId,
      };

      const uploadUrlRes = await callFn<SignedUploadUrlResponse>('storage/evidence/upload-url', {
        method: 'POST',
        body: uploadUrlPayload,
      });

      if (!uploadUrlRes || !uploadUrlRes.evidence_id || !uploadUrlRes.path || !uploadUrlRes.token) {
        throw new Error('Invalid response received from storage upload-url endpoint');
      }

      const { evidence_id, path, token } = uploadUrlRes;

      // ── Step 3: Read binary data and upload to signed URL ──────
      const base64Data = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const binaryBytes = decode(base64Data);

      const { error: storageError } = await supabase.storage
        .from('evidence')
        .uploadToSignedUrl(path, token, binaryBytes, {
          contentType: metadata.mimeType || 'audio/m4a',
        });

      if (storageError) {
        throw new Error(`Storage binary upload failed: ${storageError.message}`);
      }

      // ── Step 4: Compute SHA-256 integrity hash & tamper seal on binary bytes ───
      let checksum = '';
      try {
        if (typeof Crypto.digest === 'function') {
          const digestBuffer = await Crypto.digest(
            Crypto.CryptoDigestAlgorithm.SHA256,
            new Uint8Array(binaryBytes)
          );
          checksum = Array.from(new Uint8Array(digestBuffer))
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('');
        }
      } catch (digestErr) {
        logger.warn('[AudioUploadService] Binary digest failed, using fallback digest:', digestErr);
      }

      if (!checksum) {
        checksum = await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          base64Data
        );
      }

      const tamperSeal = `seal:${checksum.slice(0, 8)}…${checksum.slice(-2)}`;

      const durationSeconds = metadata.durationMs
        ? Math.max(1, Math.round(metadata.durationMs / 1000))
        : undefined;
      const sizeBytes = binaryBytes.byteLength || metadata.fileSize || 0;
      const capturedAt = metadata.startTimestamp
        ? new Date(metadata.startTimestamp).toISOString()
        : new Date().toISOString();

      // ── Step 5: Finalize evidence row ──────────────────────────
      const finalizePayload: {
        evidence_id: string;
        size_bytes: number;
        duration_seconds?: number;
        checksum_sha256: string;
        tamper_seal: string;
        captured_at: string;
        metadata?: { clientIncidentId?: string };
      } = {
        evidence_id,
        size_bytes: sizeBytes,
        duration_seconds: durationSeconds,
        checksum_sha256: checksum,
        tamper_seal: tamperSeal,
        captured_at: capturedAt,
      };

      if (localIncidentId && !dbIncidentId) {
        finalizePayload.metadata = {
          clientIncidentId: localIncidentId,
        };
      }

      const finalizeRes = await callFn<FinalizeEvidenceResponse>('storage/evidence', {
        method: 'POST',
        body: finalizePayload,
      });

      const finalizedStatus = finalizeRes?.evidence?.status === 'ready' ? 'ready' : 'pending';

      logger.info('[AudioUploadService] Audio evidence uploaded and finalized successfully.', {
        evidenceId: evidence_id,
        storagePath: path,
        status: finalizedStatus,
      });

      // ── Step 6: Safe cleanup of local file after successful upload
      await deleteLocalFile(fileUri);

      return {
        success: true,
        evidenceId: evidence_id,
        storagePath: path,
        status: finalizedStatus,
        localIncidentId,
      };
    } catch (err) {
      // On failure, DO NOT delete the local file so evidence is retained locally
      logger.error('[AudioUploadService] Audio upload process failed:', err);

      return {
        success: false,
        localIncidentId,
        error: err instanceof Error ? err.message : 'Unknown audio upload error',
      };
    }
  }
}

export const audioUploadService = new AudioUploadService();
