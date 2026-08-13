/**
 * Reusable AI Voice Recognition Service
 * Built on expo-speech-recognition architecture (Expo Managed CNG Workflow) with native Android SafetyForegroundService bridge.
 * Handles Speech-to-Text lifecycle, multi-language switching (English, Telugu, Hindi), partial transcript streaming, and mic energy.
 */

import { Platform } from 'react-native';
import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';
import {
  SpeechRecognitionState,
  SupportedLanguage,
} from '../types/voiceRecognition.types';
import { requestMicrophonePermissions } from './voicePermissions';
import { safetyForegroundBridge } from './safetyForegroundBridge';
import { HardwareError } from '../../../errors/AppError';
import { logger } from '../../../utils/logger';

export class VoiceRecognitionService {
  private static instance: VoiceRecognitionService;

  private recognitionState: SpeechRecognitionState = 'IDLE';
  private currentLanguage: SupportedLanguage = 'en-US';
  private recognizedText: string = '';
  private partialText: string = '';
  private volumeLevel: number = 0; // 0 to 10
  private isContinuousMonitoring: boolean = false;
  private restartTimeout: any = null;

  private stateListeners: Set<(state: SpeechRecognitionState) => void> = new Set();
  private textListeners: Set<(text: string, partial: string) => void> = new Set();
  private volumeListeners: Set<(volume: number) => void> = new Set();
  private errorListeners: Set<(error: string | null) => void> = new Set();

  private subscriptions: Array<{ remove: () => void }> = [];

  private constructor() {
    logger.info('VoiceRecognitionService initialized with expo-speech-recognition and native safety bridge.');
    this.bindVoiceEvents();
    this.bindNativeForegroundBridgeEvents();
  }

  public static getInstance(): VoiceRecognitionService {
    if (!VoiceRecognitionService.instance) {
      VoiceRecognitionService.instance = new VoiceRecognitionService();
    }
    return VoiceRecognitionService.instance;
  }

  /**
   * Listen to native Android foreground service speech recognition transcripts
   */
  private bindNativeForegroundBridgeEvents(): void {
    if (Platform.OS === 'android') {
      safetyForegroundBridge.onVoiceTranscript((data) => {
        logger.info(`[VoiceRecognitionService] Received transcript from native foreground service: "${data.transcript}" (final=${data.isFinal}, lang=${data.language})`);
        if (data.language) {
          this.currentLanguage = data.language as SupportedLanguage;
        }
        if (data.isFinal) {
          this.recognizedText = data.transcript;
          this.partialText = '';
          this.updateState('SUCCESS');
        } else {
          this.partialText = data.transcript;
          this.updateState('LISTENING');
        }
        this.notifyText();
      });
    }
  }

  /**
   * Bind expo-speech-recognition lifecycle event listeners (for foreground single-shot and iOS)
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

        // Auto-restart on iOS or non-Android continuous mode
        if (this.isContinuousMonitoring && Platform.OS !== 'android') {
          this.scheduleAutoRestart(300);
        }
      });

      const resultSub = ExpoSpeechRecognitionModule.addListener('result', (event: any) => {
        logger.info('SpeechRecognition event: result', event);
        if (event.results && event.results.length > 0) {
          const transcript = event.results[0]?.transcript || '';
          if (event.isFinal) {
            this.recognizedText = transcript;
            this.partialText = '';
            this.notifyText();
            this.updateState('SUCCESS');
          } else {
            this.partialText = transcript;
            this.notifyText();
          }
        }
      });

      const errorSub = ExpoSpeechRecognitionModule.addListener('error', (event: any) => {
        logger.error('SpeechRecognition event: error', event);
        let errMsg = event.message || event.error || 'Speech recognition error occurred.';
        const errCode = event.code;
        const errStr = typeof errMsg === 'string' ? errMsg.toLowerCase() : '';

        if (event.error === 'network' || errCode === 11 || errStr.includes('server disconnected')) {
          errMsg = 'Network error: Speech Recognition server disconnected. Please check your internet connection or enable offline Speech Recognition in Android Settings.';
        }

        const isTransient =
          event.error === 'no-match' ||
          event.error === 'speech-timeout' ||
          event.error === 'busy' ||
          errCode === 7 ||
          errCode === 6 ||
          errCode === 8;

        if (this.isContinuousMonitoring && isTransient && Platform.OS !== 'android') {
          logger.info('[VoiceRecognitionService] Transient silence/timeout encountered. Auto-recovering...');
          this.scheduleAutoRestart(400);
          return;
        }

        this.updateState('ERROR');
        this.notifyError(errMsg);

        if (this.isContinuousMonitoring && !errStr.includes('permission denied') && Platform.OS !== 'android') {
          this.scheduleAutoRestart(1000);
        }
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

  private scheduleAutoRestart(delayMs: number = 300): void {
    if (!this.isContinuousMonitoring) return;
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
    }
    this.restartTimeout = setTimeout(async () => {
      if (!this.isContinuousMonitoring) return;
      try {
        logger.info(`[VoiceRecognitionService] Auto-restarting continuous speech recognition in [${this.currentLanguage}]...`);
        await this.startListening(this.currentLanguage, true);
      } catch (err) {
        logger.warn('[VoiceRecognitionService] Auto-restart attempt failed, will retry:', err);
        if (this.isContinuousMonitoring) {
          this.scheduleAutoRestart(1000);
        }
      }
    }, delayMs);
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
    if (Platform.OS === 'android') {
      safetyForegroundBridge.updateLanguage(language).catch(() => {});
    }
  }

  /**
   * Start speech recognition listening session
   * @param locale Target language locale
   * @param continuousBackground If true, automatically recovers and runs continuously in background safety mode
   */
  public async startListening(locale?: SupportedLanguage, continuousBackground: boolean = false): Promise<void> {
    const permResult = await requestMicrophonePermissions();
    if (!permResult.granted) {
      this.isContinuousMonitoring = false;
      this.updateState('ERROR');
      this.notifyError(permResult.message || 'Microphone permission was denied.');
      throw new HardwareError(permResult.message || 'Microphone permission was denied.');
    }

    this.isContinuousMonitoring = continuousBackground;
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }

    const lang = locale || this.currentLanguage;
    this.currentLanguage = lang;

    this.recognizedText = '';
    this.partialText = '';
    this.notifyText();
    this.notifyError(null);

    // On Android in continuous background safety mode, recognition runs directly inside SafetyForegroundService
    if (Platform.OS === 'android' && continuousBackground) {
      logger.info(`[VoiceRecognitionService] 🛡️ Delegating continuous background listening to native SafetyForegroundService in locale [${lang}]...`);
      try {
        await ExpoSpeechRecognitionModule.stop();
      } catch (_err) {
        // Safe ignore
      }
      await safetyForegroundBridge.updateLanguage(lang);
      this.updateState('LISTENING');
      return;
    }

    // Otherwise (foreground assistant / iOS), use ExpoSpeechRecognitionModule
    logger.info(`Starting Speech-to-Text Recognition via expo-speech-recognition in locale [${lang}] (continuous: ${continuousBackground})...`);

    try {
      await ExpoSpeechRecognitionModule.stop();
    } catch (_err) {
      // Safe ignore
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
    } catch (err: any) {
      logger.error('Failed to start SpeechRecognition:', err);
      this.updateState('ERROR');
      this.notifyError(err.message || 'Failed to start speech recognition.');
      if (this.isContinuousMonitoring && Platform.OS !== 'android') {
        this.scheduleAutoRestart(1000);
      }
      throw err;
    }
  }

  /**
   * Stop speech recognition session
   */
  public async stopListening(): Promise<void> {
    logger.info('Stopping speech recognition session...');
    this.isContinuousMonitoring = false;
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }
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
    this.isContinuousMonitoring = false;
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }
    try {
      await ExpoSpeechRecognitionModule.abort();
      this.recognizedText = '';
      this.partialText = '';
      this.updateState('IDLE');
      this.notifyText();
    } catch (err) {
      logger.error('Error cancelling SpeechRecognition:', err);
    }
  }

  /**
   * Clean up all recognizer resources and listeners
   */
  public destroy(): void {
    logger.info('Destroying speech recognizer instance resources...');
    this.isContinuousMonitoring = false;
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }
    this.clearSubscriptions();
    this.stateListeners.clear();
    this.textListeners.clear();
    this.volumeListeners.clear();
    this.errorListeners.clear();
    this.recognitionState = 'IDLE';
  }

  // ─── Observer Pattern Event Subscriptions ─────────────────────────────────

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
    return () => this.volumeListeners.delete(listener);
  }

  public onError(listener: (error: string | null) => void): () => void {
    this.errorListeners.add(listener);
    return () => this.errorListeners.delete(listener);
  }

  private updateState(state: SpeechRecognitionState): void {
    this.recognitionState = state;
    this.stateListeners.forEach(l => l(state));
  }

  private notifyText(): void {
    this.textListeners.forEach(l => l(this.recognizedText, this.partialText));
  }

  private notifyError(err: string | null): void {
    this.errorListeners.forEach(l => l(err));
  }
}

export const voiceRecognitionService = VoiceRecognitionService.getInstance();
