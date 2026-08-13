import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { audioRecordingService } from './audioRecordingService';
import { audioPermissionService } from './audioPermissionService';
import * as voicePermissions from '../../voice/services/voicePermissions';

// Mock audio permission service & native voice permissions
jest.mock('../../voice/services/voicePermissions', () => ({
  requestMicrophonePermissions: jest.fn(),
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

describe('AudioRecordingService', () => {
  let mockRecordingInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock setup for expo-av Audio.Recording
    mockRecordingInstance = {
      prepareToRecordAsync: jest.fn().mockResolvedValue(undefined),
      startAsync: jest.fn().mockResolvedValue(undefined),
      stopAndUnloadAsync: jest.fn().mockResolvedValue(undefined),
      unloadAsync: jest.fn().mockResolvedValue(undefined),
      getStatusAsync: jest.fn().mockResolvedValue({
        canRecord: true,
        isRecording: true,
        durationMillis: 4500,
      }),
      getURI: jest.fn().mockReturnValue('file:///test/cache/audio_recording.m4a'),
    };

    (Audio as any).Recording = jest.fn(() => mockRecordingInstance);
    (Audio as any).setAudioModeAsync = jest.fn().mockResolvedValue(undefined);
    (Audio as any).requestPermissionsAsync = jest.fn().mockResolvedValue({ status: 'granted' });
    (Audio as any).getPermissionsAsync = jest.fn().mockResolvedValue({ status: 'granted' });
    (Audio as any).RecordingOptionsPresets = {
      HIGH_QUALITY: { extension: '.m4a' },
    };

    (voicePermissions.requestMicrophonePermissions as jest.Mock).mockResolvedValue({
      granted: true,
    });

    (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({
      exists: true,
      isDirectory: false,
      size: 10240,
    });
  });

  afterEach(async () => {
    // Ensure recording is cleared after each test
    if (audioRecordingService.isRecording()) {
      await audioRecordingService.stopRecording();
    }
  });

  it('1. requests microphone permission and returns true when granted', async () => {
    const granted = await audioRecordingService.requestPermissions();
    expect(granted).toBe(true);
    expect(audioRecordingService.getStatus().state).toBe('IDLE');
  });

  it('2. handles microphone permission denial gracefully without throwing', async () => {
    (voicePermissions.requestMicrophonePermissions as jest.Mock).mockResolvedValueOnce({
      granted: false,
      message: 'Permission denied by user',
    });

    const result = await audioRecordingService.startRecording('incident-123');
    expect(result.success).toBe(false);
    expect(result.error).toContain('permission denied');
    expect(audioRecordingService.getStatus().state).toBe('PERMISSION_DENIED');
  });

  it('3. starts recording successfully and transitions state to RECORDING', async () => {
    const result = await audioRecordingService.startRecording('sos-incident-1');

    expect(result.success).toBe(true);
    expect(result.metadata?.fileUri).toBe('file:///test/cache/audio_recording.m4a');
    expect(result.metadata?.localIncidentId).toBe('sos-incident-1');
    expect(audioRecordingService.isRecording()).toBe(true);
    expect(audioRecordingService.getStatus().state).toBe('RECORDING');
    expect(Audio.setAudioModeAsync).toHaveBeenCalled();
    expect(mockRecordingInstance.prepareToRecordAsync).toHaveBeenCalled();
    expect(mockRecordingInstance.startAsync).toHaveBeenCalled();
  });

  it('4. handles duplicate start recording calls safely without crashing or recreating', async () => {
    const firstResult = await audioRecordingService.startRecording('sos-incident-1');
    expect(firstResult.success).toBe(true);

    const duplicateResult = await audioRecordingService.startRecording('sos-incident-1');
    expect(duplicateResult.success).toBe(true);
    expect(duplicateResult.error).toContain('already in progress');
    expect((Audio as any).Recording).toHaveBeenCalledTimes(1);
  });

  it('5. handles stopRecording when no recording is active without throwing', async () => {
    const result = await audioRecordingService.stopRecording();
    expect(result.success).toBe(false);
    expect(result.error).toBe('No active recording to stop');
  });

  it('6. stops active recording successfully, calculates metadata and returns result', async () => {
    await audioRecordingService.startRecording('sos-incident-1');
    const stopResult = await audioRecordingService.stopRecording();

    expect(stopResult.success).toBe(true);
    expect(stopResult.fileUri).toBe('file:///test/cache/audio_recording.m4a');
    expect(stopResult.metadata?.fileSize).toBe(10240);
    expect(stopResult.metadata?.mimeType).toBe('audio/m4a');
    expect(stopResult.metadata?.localIncidentId).toBe('sos-incident-1');
    expect(audioRecordingService.isRecording()).toBe(false);
    expect(audioRecordingService.getStatus().state).toBe('COMPLETED');
    expect(mockRecordingInstance.stopAndUnloadAsync).toHaveBeenCalled();
  });

  it('7. handles recording failure safely when prepareToRecordAsync fails', async () => {
    mockRecordingInstance.prepareToRecordAsync.mockRejectedValueOnce(new Error('Hardware init failure'));

    const result = await audioRecordingService.startRecording('sos-incident-1');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Hardware init failure');
    expect(audioRecordingService.isRecording()).toBe(false);
    expect(audioRecordingService.getStatus().state).toBe('FAILED');
  });

  it('8. cleans up recorder instance and resets internal references after stop', async () => {
    await audioRecordingService.startRecording('sos-incident-1');
    expect(audioRecordingService.isRecording()).toBe(true);

    await audioRecordingService.stopRecording();
    expect(audioRecordingService.isRecording()).toBe(false);

    // Second stop should report no active recording
    const secondStop = await audioRecordingService.stopRecording();
    expect(secondStop.success).toBe(false);
    expect(secondStop.error).toBe('No active recording to stop');
  });

  it('9. supports state transition listeners and status queries', async () => {
    const states: string[] = [];
    const unsubscribe = audioRecordingService.onStateChange((state) => {
      states.push(state);
    });

    await audioRecordingService.startRecording('sos-test');
    expect(audioRecordingService.getStatus().isRecording).toBe(true);

    await audioRecordingService.stopRecording();
    expect(audioRecordingService.getStatus().isRecording).toBe(false);

    unsubscribe();
    expect(states).toContain('RECORDING');
    expect(states).toContain('STOPPING');
    expect(states).toContain('COMPLETED');
  });

  it('10. stopAndUpload stops recording and transitions through UPLOADING state to COMPLETED', async () => {
    const states: string[] = [];
    const unsubscribe = audioRecordingService.onStateChange((state) => {
      states.push(state);
    });

    await audioRecordingService.startRecording('sos-incident-upload-test');

    const result = await audioRecordingService.stopAndUpload('sos-incident-upload-test');
    expect(result).toBeDefined();

    unsubscribe();
    expect(states).toContain('UPLOADING');
  });

  it('11. stopRecording with a mismatched incident ID does not stop the active recording', async () => {
    await audioRecordingService.startRecording('sos-incident-alpha');
    expect(audioRecordingService.isRecording()).toBe(true);

    const stopResult = await audioRecordingService.stopRecording('sos-incident-different');
    expect(stopResult.success).toBe(false);
    expect(stopResult.error).toContain('Incident ID does not match');
    expect(audioRecordingService.isRecording()).toBe(true);

    // Clean up with matching ID
    await audioRecordingService.stopRecording('sos-incident-alpha');
    expect(audioRecordingService.isRecording()).toBe(false);
  });

  it('12. stopAndUpload with a mismatched incident ID does not stop or upload active recording', async () => {
    await audioRecordingService.startRecording('sos-incident-beta');
    expect(audioRecordingService.isRecording()).toBe(true);

    const uploadResult = await audioRecordingService.stopAndUpload('sos-incident-mismatched');
    expect(uploadResult.success).toBe(false);
    expect(uploadResult.error).toContain('Incident ID does not match');
    expect(audioRecordingService.isRecording()).toBe(true);

    // Clean up
    await audioRecordingService.stopRecording('sos-incident-beta');
  });

  it('13. stopAndUpload when no recording is active returns safely without throwing', async () => {
    const result = await audioRecordingService.stopAndUpload('sos-non-existent');
    expect(result.success).toBe(false);
    expect(result.error).toBe('No active recording to stop');
  });
});
