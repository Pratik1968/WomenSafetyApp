/**
 * audioFileUtils.ts
 *
 * Utility functions for local audio file management, validation, filename generation,
 * MIME type resolution, and safe deletion.
 */

import * as FileSystem from 'expo-file-system/legacy';
import { logger } from '../../../utils/logger';

/**
 * Generates a clean, timestamped audio filename for recording evidence.
 *
 * @param localIncidentId - Optional incident identifier to prefix
 * @param ext - File extension (defaults to 'm4a')
 * @returns Clean filename string
 */
export function determineAudioFilename(localIncidentId?: string, ext: string = 'm4a'): string {
  const cleanExt = ext.replace(/^\./, '');
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);

  if (localIncidentId) {
    const safeIncident = localIncidentId.replace(/[^a-zA-Z0-9_-]/g, '_');
    return `audio_evidence_${safeIncident}_${timestamp}_${randomSuffix}.${cleanExt}`;
  }

  return `audio_evidence_${timestamp}_${randomSuffix}.${cleanExt}`;
}

/**
 * Determines the MIME type for an audio file based on extension/URI.
 *
 * @param filenameOrUri - Audio filename or file URI
 * @returns Standard MIME type (default 'audio/m4a')
 */
export function determineMimeType(filenameOrUri: string): string {
  if (!filenameOrUri) return 'audio/m4a';

  const clean = filenameOrUri.toLowerCase().split('?')[0];

  if (clean.endsWith('.m4a')) return 'audio/m4a';
  if (clean.endsWith('.aac')) return 'audio/aac';
  if (clean.endsWith('.mp4')) return 'audio/mp4';
  if (clean.endsWith('.mp3')) return 'audio/mpeg';
  if (clean.endsWith('.wav')) return 'audio/wav';
  if (clean.endsWith('.ogg')) return 'audio/ogg';
  if (clean.endsWith('.3gp')) return 'audio/3gpp';

  return 'audio/m4a';
}

/**
 * Obtains the file size in bytes for a local file URI.
 *
 * @param fileUri - Local file URI
 * @returns File size in bytes, or undefined if unavailable
 */
export async function getFileSize(fileUri: string): Promise<number | undefined> {
  if (!fileUri) return undefined;

  try {
    const info = await FileSystem.getInfoAsync(fileUri);
    if (info.exists && 'size' in info && typeof info.size === 'number') {
      return info.size;
    }
    return undefined;
  } catch (err) {
    logger.warn('[audioFileUtils] Failed to get file size for:', fileUri, err);
    return undefined;
  }
}

/**
 * Safely validates whether a recording file exists and is a valid file.
 * Never throws — returns false on any failure.
 *
 * @param fileUri - Local file URI
 * @returns true if file exists and is not a directory, false otherwise
 */
export async function validateRecordingUri(fileUri?: string | null): Promise<boolean> {
  if (!fileUri || typeof fileUri !== 'string') return false;

  try {
    const info = await FileSystem.getInfoAsync(fileUri);
    return Boolean(info.exists && !info.isDirectory && ('size' in info ? (info.size ?? 0) > 0 : true));
  } catch (err) {
    logger.warn('[audioFileUtils] Error validating recording URI:', err);
    return false;
  }
}

/**
 * Safely deletes a local recording file after successful upload.
 * Never throws — returns true if deletion succeeded, false otherwise.
 *
 * @param fileUri - Local file URI to delete
 * @returns true if deleted or non-existent, false on deletion failure
 */
export async function deleteLocalFile(fileUri?: string | null): Promise<boolean> {
  if (!fileUri || typeof fileUri !== 'string') return true;

  try {
    const info = await FileSystem.getInfoAsync(fileUri);
    if (!info.exists) {
      return true;
    }

    await FileSystem.deleteAsync(fileUri, { idempotent: true });
    logger.info('[audioFileUtils] Local recording file deleted successfully:', fileUri);
    return true;
  } catch (err) {
    logger.error('[audioFileUtils] Failed to delete local recording file:', fileUri, err);
    return false;
  }
}
