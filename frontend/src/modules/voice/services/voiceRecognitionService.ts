/**
 * Reusable AI Voice Recognition Service
 * Built on expo-speech-recognition architecture (Expo Managed CNG Workflow).
 * Handles Speech-to-Text lifecycle, multi-language switching (English, Telugu, Hindi), partial transcript streaming, and mic energy.
 */

import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';
import {
  SpeechRecognitionState,
  SupportedLanguage,
} from '../types/voiceRecognition.types';
import { requestMicrophonePermissions } from './voicePermissions';
import { HardwareError } from '../../../errors/AppError';
import { logger } from '../../../utils/logger';

export class VoiceRecognitionService {
  private static instance: VoiceRecognitionService;

  private recognitionState: SpeechRecognitionState = 'IDLE';
  private currentLanguage: SupportedLanguage = 'en-US';
  private recognizedText: string = '';
  private partialText: string = '';
  private volumeLevel: number = 0; // 0 to 10

  private stateListeners: Set<(state: SpeechRecognitionState) => void> = new Set();
  private textListeners: Set<(text: string, partial: string) => void> = new Set();
  private volumeListeners: Set<(volume: number) => void> = new Set();
  private errorListeners: Set<(error: string | null) => void> = new Set();

  private subscriptions: Array<{ remove: () => void }> = [];

  private constructor() {
    logger.info('VoiceRecognitionService initialized with expo-speech-recognition.');
    // Native event listeners are bound lazily in startListening() (which already
    // rebinds on every call) so merely importing this module doesn't touch the
    // native ExpoSpeechRecognition module — matters for environments (tests) where
    // it isn't available.
  }

  public static getInstance(): VoiceRecognitionService {
    if (!VoiceRecognitionService.instance) {
      VoiceRecognitionService.instance = new VoiceRecognitionService();
    }
    return VoiceRecognitionService.instance;
  }

  /**
   * Bind expo-speech-recognition lifecycle event listeners
   */
  private bindVoiceEvents(): void {
    this.clearSubscriptions();

    if (ExpoSpeechRecognitionModule && typeof ExpoSpeechRecognitionModule.addListener === 'function') {
      const startSub = ExpoSpeechRecognitionModule.addListener('start', () => {
        logger.info('SpeechRecognition event: start');
        this.updateState('LISTENING');
        this.recognizedText = '';
        this.partialText = '';
        this.notifyText();
        this.notifyError(null);
      });

      const endSub = ExpoSpeechRecognitionModule.addListener('end', () => {
        logger.info('SpeechRecognition event: end');
        if (this.recognizedText || this.partialText) {
          this.updateState('SUCCESS');
        } else {
          this.updateState('IDLE');
        }
      });

      const resultSub = ExpoSpeechRecognitionModule.addListener('result', (event: any) => {
        logger.info('SpeechRecognition event: result', event);
        if (event.results && event.results.length > 0) {
          const transcript = event.results[0]?.transcript || '';
          if (event.isFinal) {
            this.recognizedText = transcript;
            this.partialText = '';
            console.log('Real speech recognizedText:', transcript);
            this.notifyText();
            this.updateState('SUCCESS');
          } else {
            this.partialText = transcript;
            console.log('Real speech partialText:', transcript);
            this.notifyText();
          }
        }
      });

      const errorSub = ExpoSpeechRecognitionModule.addListener('error', (event: any) => {
        logger.error('SpeechRecognition event: error', event);
        let errMsg = event.message || event.error || 'Speech recognition error occurred.';
        if (event.error === 'network' || event.code === 11 || (typeof errMsg === 'string' && errMsg.includes('Server disconnected'))) {
          errMsg = 'Network error: Speech Recognition server disconnected. Please check your internet connection or enable offline Speech Recognition in Android Settings.';
        }
        this.updateState('ERROR');
        this.notifyError(errMsg);
      });

      const volumeSub = ExpoSpeechRecognitionModule.addListener('volumechange', (event: any) => {
        if (typeof event.value === 'number') {
          const vol = Math.min(10, Math.max(0, Math.floor(event.value)));
          this.volumeLevel = vol;
          this.volumeListeners.forEach(l => l(vol));
        }
      });

      this.subscriptions.push(startSub, endSub, resultSub, errorSub, volumeSub);
    }
  }

  private clearSubscriptions(): void {
    this.subscriptions.forEach(sub => {
      if (sub && typeof sub.remove === 'function') {
        sub.remove();
      }
    });
    this.subscriptions = [];
  }

  public getRecognitionState(): SpeechRecognitionState {
    return this.recognitionState;
  }

  public getCurrentLanguage(): SupportedLanguage {
    return this.currentLanguage;
  }

  public setLanguage(language: SupportedLanguage): void {
    logger.info(`Setting Speech Recognition Language to [${language}]...`);
    this.currentLanguage = language;
  }

  /**
   * Start speech recognition listening session
   */
  public async startListening(locale?: SupportedLanguage): Promise<void> {
    const permResult = await requestMicrophonePermissions();
    if (!permResult.granted) {
      this.updateState('ERROR');
      this.notifyError(permResult.message || 'Microphone permission was denied.');
      throw new HardwareError(permResult.message || 'Microphone permission was denied.');
    }

    console.log('Speech recognition starting...');
    const lang = locale || this.currentLanguage;
    this.currentLanguage = lang;

    logger.info(`Starting Speech-to-Text Recognition via expo-speech-recognition in locale [${lang}]...`);
    this.recognizedText = '';
    this.partialText = '';
    this.notifyText();
    this.notifyError(null);

    try {
      await ExpoSpeechRecognitionModule.stop();
    } catch (_err) {
      // Ignore cleanup errors
    }

    try {
      this.bindVoiceEvents();
      await ExpoSpeechRecognitionModule.start({
        lang,
        interimResults: true,
        continuous: true,
        volumeChangeEventOptions: { enabled: true, intervalMillis: 200 },
      });
      this.updateState('LISTENING');
      console.log('Speech recognition started');
    } catch (err: any) {
      logger.error('Failed to start SpeechRecognition:', err);
      this.updateState('ERROR');
      this.notifyError(err.message || 'Failed to start speech recognition.');
      throw err;
    }
  }

  /**
   * Stop speech recognition session
   */
  public async stopListening(): Promise<void> {
    logger.info('Stopping speech recognition session...');
    try {
      await ExpoSpeechRecognitionModule.stop();
      this.updateState('PROCESSING');
    } catch (err) {
      logger.error('Error stopping SpeechRecognition:', err);
    }
  }

  /**
   * Cancel speech recognition session without saving results
   */
  public async cancelListening(): Promise<void> {
    logger.info('Cancelling speech recognition session...');
    try {
      await ExpoSpeechRecognitionModule.abort();
      this.recognizedText = '';
      this.partialText = '';
      this.notifyText();
      this.updateState('IDLE');
    } catch (err) {
      logger.error('Error aborting SpeechRecognition:', err);
    }
  }

  /**
   * Destroy recognizer instance resources
   */
  public async destroyRecognizer(): Promise<void> {
    logger.info('Destroying speech recognizer instance resources...');
    try {
      await ExpoSpeechRecognitionModule.abort();
    } catch (err) {
      logger.error('Error aborting SpeechRecognition:', err);
    }
    this.clearSubscriptions();
    this.recognizedText = '';
    this.partialText = '';
    this.notifyText();
    this.updateState('IDLE');
    this.stateListeners.clear();
    this.textListeners.clear();
    this.volumeListeners.clear();
    this.errorListeners.clear();
  }

  // Event Subscription Handlers
  public onStateChange(listener: (state: SpeechRecognitionState) => void): () => void {
    this.stateListeners.add(listener);
    listener(this.recognitionState);
    return () => this.stateListeners.delete(listener);
  }

  public onTextChange(listener: (text: string, partial: string) => void): () => void {
    this.textListeners.add(listener);
    listener(this.recognizedText, this.partialText);
    return () => this.textListeners.delete(listener);
  }

  public onVolumeChange(listener: (volume: number) => void): () => void {
    this.volumeListeners.add(listener);
    listener(this.volumeLevel);
    return () => this.volumeListeners.delete(listener);
  }

  public onError(listener: (error: string | null) => void): () => void {
    this.errorListeners.add(listener);
    return () => this.errorListeners.delete(listener);
  }

  private updateState(newState: SpeechRecognitionState): void {
    this.recognitionState = newState;
    this.stateListeners.forEach(l => l(this.recognitionState));
  }

  private notifyText(): void {
    this.textListeners.forEach(l => l(this.recognizedText, this.partialText));
  }

  private notifyError(errMsg: string | null): void {
    this.errorListeners.forEach(l => l(errMsg));
  }
}

export const voiceRecognitionService = VoiceRecognitionService.getInstance();
