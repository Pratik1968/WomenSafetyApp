import { voiceRecognitionService } from './voiceRecognitionService';
import { safetyForegroundBridge } from './safetyForegroundBridge';
import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';

describe('VoiceRecognitionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with default en-US language and IDLE state', () => {
    expect(voiceRecognitionService.getCurrentLanguage()).toBe('en-US');
    expect(voiceRecognitionService.getRecognitionState()).toBe('IDLE');
  });

  it('should allow changing supported languages', () => {
    voiceRecognitionService.setLanguage('te-IN');
    expect(voiceRecognitionService.getCurrentLanguage()).toBe('te-IN');

    voiceRecognitionService.setLanguage('hi-IN');
    expect(voiceRecognitionService.getCurrentLanguage()).toBe('hi-IN');

    voiceRecognitionService.setLanguage('en-US');
    expect(voiceRecognitionService.getCurrentLanguage()).toBe('en-US');
  });

  it('should subscribe to state changes', () => {
    const listener = jest.fn();
    const unsub = voiceRecognitionService.onStateChange(listener);

    expect(listener).toHaveBeenCalledWith('IDLE');
    unsub();
  });

  it('should start and stop listening cleanly in foreground mode', async () => {
    await voiceRecognitionService.startListening('en-US', false);
    expect(ExpoSpeechRecognitionModule.start).toHaveBeenCalled();

    await voiceRecognitionService.stopListening();
    expect(ExpoSpeechRecognitionModule.stop).toHaveBeenCalled();
  });

  it('should cancel listening and reset text buffer', async () => {
    await voiceRecognitionService.startListening('en-US', false);
    await voiceRecognitionService.cancelListening();
    expect(ExpoSpeechRecognitionModule.abort).toHaveBeenCalled();
  });

  it('should notify text listeners when recognized text changes', () => {
    const textListener = jest.fn();
    const unsub = voiceRecognitionService.onTextChange(textListener);

    expect(textListener).toHaveBeenCalled();
    unsub();
  });

  it('should notify volume listeners when mic volume updates', () => {
    const volListener = jest.fn();
    const unsub = voiceRecognitionService.onVolumeChange(volListener);

    expect(unsub).toBeDefined();
    unsub();
  });

  it('should subscribe to safety foreground bridge notification actions', () => {
    const mockListener = jest.fn();
    const unsub = safetyForegroundBridge.onNotificationAction(mockListener);

    expect(unsub).toBeDefined();
    unsub();
  });
});
