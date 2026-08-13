import * as FileSystem from 'expo-file-system/legacy';
import * as Crypto from 'expo-crypto';
import { audioUploadService } from './audioUploadService';
import { callFn } from '../../../data/functions';
import { supabase, ensureSession } from '../../../data/supabase';

// Mock dependencies
jest.mock('../../../data/functions', () => ({
  callFn: jest.fn(),
}));

jest.mock('../../../data/supabase', () => ({
  supabase: {
    storage: {
      from: jest.fn(),
    },
  },
  ensureSession: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-file-system/legacy', () => ({
  getInfoAsync: jest.fn(),
  deleteAsync: jest.fn(),
  readAsStringAsync: jest.fn(),
  EncodingType: { Base64: 'base64' },
}));

jest.mock('expo-file-system', () => ({
  getInfoAsync: jest.fn(),
  deleteAsync: jest.fn(),
  readAsStringAsync: jest.fn(),
  EncodingType: { Base64: 'base64' },
}));

jest.mock('expo-crypto', () => ({
  digest: jest.fn().mockImplementation(() => {
    // Return a mock 32-byte ArrayBuffer
    const buf = new Uint8Array(32);
    buf.fill(0xab);
    return Promise.resolve(buf.buffer);
  }),
  digestStringAsync: jest.fn().mockResolvedValue('mock-sha256-checksum-1234567890'),
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
}));

describe('AudioUploadService', () => {
  const mockFileUri = 'file:///test/audio_evidence.m4a';
  const mockMetadata = {
    fileUri: mockFileUri,
    fileName: 'audio_evidence_123.m4a',
    mimeType: 'audio/m4a',
    fileSize: 2048,
    durationMs: 5000,
    startTimestamp: 1700000000000,
    localIncidentId: 'sos-local-incident-42',
  };

  let mockUploadToSignedUrl: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUploadToSignedUrl = jest.fn().mockResolvedValue({ data: { Key: 'path' }, error: null });

    (supabase.storage.from as jest.Mock).mockReturnValue({
      uploadToSignedUrl: mockUploadToSignedUrl,
    });

    (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
      exists: true,
      isDirectory: false,
      size: 2048,
    });

    (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue('bW9ja19hdWRpb19ieXRlcw==');
    (FileSystem.deleteAsync as jest.Mock).mockResolvedValue(undefined);
  });

  it('1. performs complete 3-step signed upload flow (signed URL -> binary upload -> finalize)', async () => {
    // 1. mock signed URL response
    (callFn as jest.Mock)
      .mockResolvedValueOnce({
        evidence_id: 'ev-uuid-1001',
        path: 'user-id/ev-uuid-1001-audio.m4a',
        token: 'signed-upload-token-xyz',
        signedUrl: 'https://supabase.co/storage/v1/upload/signed',
      })
      // 2. mock finalize response
      .mockResolvedValueOnce({
        evidence: {
          id: 'ev-uuid-1001',
          user_id: 'user-1',
          status: 'ready',
        },
      });

    const result = await audioUploadService.uploadAudioRecording(mockFileUri, mockMetadata);

    // Assert overall success
    expect(result.success).toBe(true);
    expect(result.evidenceId).toBe('ev-uuid-1001');
    expect(result.status).toBe('ready');
    expect(result.localIncidentId).toBe('sos-local-incident-42');

    // Assert Step 1: callFn for upload-url
    expect(callFn).toHaveBeenNthCalledWith(
      1,
      'storage/evidence/upload-url',
      expect.objectContaining({
        method: 'POST',
        body: expect.objectContaining({
          type: 'audio',
          mime_type: 'audio/m4a',
          incident_id: undefined, // non-UUID local incident id is safely omitted
        }),
      })
    );

    // Assert Step 2: Binary upload to signed URL
    expect(mockUploadToSignedUrl).toHaveBeenCalledWith(
      'user-id/ev-uuid-1001-audio.m4a',
      'signed-upload-token-xyz',
      expect.anything(),
      { contentType: 'audio/m4a' }
    );

    // Assert Step 3: Finalize evidence
    expect(callFn).toHaveBeenNthCalledWith(
      2,
      'storage/evidence',
      expect.objectContaining({
        method: 'POST',
        body: expect.objectContaining({
          evidence_id: 'ev-uuid-1001',
          duration_seconds: 5,
          checksum_sha256: expect.any(String),
          tamper_seal: expect.stringContaining('seal:'),
          metadata: {
            clientIncidentId: 'sos-local-incident-42',
          },
        }),
      })
    );

    // Assert Step 4: Local file cleanup on success
    expect(FileSystem.deleteAsync).toHaveBeenCalledWith(mockFileUri, { idempotent: true });
  });

  it('2. sends valid PostgreSQL UUID incident_id if provided', async () => {
    const validUuid = '123e4567-e89b-12d3-a456-426614174000';
    const metadataWithUuid = { ...mockMetadata, localIncidentId: validUuid };

    (callFn as jest.Mock)
      .mockResolvedValueOnce({
        evidence_id: 'ev-uuid-1002',
        path: 'user-id/uuid.m4a',
        token: 'token',
        signedUrl: 'https://example.com/signed',
      })
      .mockResolvedValueOnce({ evidence: { id: 'ev-uuid-1002', status: 'ready' } });

    await audioUploadService.uploadAudioRecording(mockFileUri, metadataWithUuid);

    expect(callFn).toHaveBeenNthCalledWith(
      1,
      'storage/evidence/upload-url',
      expect.objectContaining({
        body: expect.objectContaining({
          incident_id: validUuid,
        }),
      })
    );
  });

  it('3. handles binary storage upload failure and retains local file', async () => {
    (callFn as jest.Mock).mockResolvedValueOnce({
      evidence_id: 'ev-uuid-1003',
      path: 'user-id/uuid.m4a',
      token: 'token',
      signedUrl: 'https://example.com/signed',
    });

    mockUploadToSignedUrl.mockResolvedValueOnce({
      data: null,
      error: new Error('S3 Storage Gateway Timeout'),
    });

    const result = await audioUploadService.uploadAudioRecording(mockFileUri, mockMetadata);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Storage binary upload failed');

    // Local file MUST NOT be deleted so evidence is preserved
    expect(FileSystem.deleteAsync).not.toHaveBeenCalled();
  });

  it('4. handles malformed or empty responses from edge function gracefully', async () => {
    (callFn as jest.Mock).mockResolvedValueOnce({}); // Missing evidence_id and token

    const result = await audioUploadService.uploadAudioRecording(mockFileUri, mockMetadata);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid response');
    expect(FileSystem.deleteAsync).not.toHaveBeenCalled();
  });

  it('5. validates local file existence before attempting network upload', async () => {
    (FileSystem.getInfoAsync as jest.Mock).mockResolvedValueOnce({
      exists: false,
    });

    const result = await audioUploadService.uploadAudioRecording('file:///nonexistent.m4a', mockMetadata);

    expect(result.success).toBe(false);
    expect(result.error).toContain('does not exist');
    expect(callFn).not.toHaveBeenCalled();
    expect(FileSystem.deleteAsync).not.toHaveBeenCalled();
  });

  it('6. handles finalize evidence step failure and retains local file', async () => {
    (callFn as jest.Mock)
      .mockResolvedValueOnce({
        evidence_id: 'ev-uuid-1005',
        path: 'user-id/path.m4a',
        token: 'token',
        signedUrl: 'https://example.com/signed',
      })
      .mockRejectedValueOnce(new Error('Finalize service unavailable'));

    const result = await audioUploadService.uploadAudioRecording(mockFileUri, mockMetadata);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Finalize service unavailable');
    expect(FileSystem.deleteAsync).not.toHaveBeenCalled();
  });
});
