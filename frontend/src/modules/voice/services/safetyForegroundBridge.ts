/**
 * TypeScript Native Bridge for Safety Foreground Service
 * Connects React Native JS to Android SafetyForegroundService & Notification Action Broadcasts.
 * Streams speech transcripts and emergency keyword triggers from native background speech recognizer.
 */

import { NativeModules, NativeEventEmitter, Platform } from 'react-native';
import { logger } from '../../../utils/logger';
import { SupportedLanguage } from '../types/voiceRecognition.types';

const { SafetyForegroundModule } = NativeModules;

export type SafetyNotificationAction = 'TRIGGER_SOS' | 'END_JOURNEY';

export interface NativeVoiceTranscriptEvent {
  transcript: string;
  isFinal: boolean;
  language: string;
}

export interface NativeEmergencyKeywordEvent {
  keyword: string;
  transcript: string;
  language: string;
  confidence: number;
}

class SafetyForegroundBridge {
  private static instance: SafetyForegroundBridge;
  private eventEmitter: NativeEventEmitter | null = null;
  private notificationListeners: Set<(action: SafetyNotificationAction) => void> = new Set();
  private transcriptListeners: Set<(data: NativeVoiceTranscriptEvent) => void> = new Set();
  private emergencyKeywordListeners: Set<(data: NativeEmergencyKeywordEvent) => void> = new Set();

  private constructor() {
    if (Platform.OS === 'android' && SafetyForegroundModule) {
      try {
        this.eventEmitter = new NativeEventEmitter(SafetyForegroundModule);

        // 1. Notification action listener (SOS / End Journey from notification bar)
        this.eventEmitter.addListener('onNotificationAction', (action: SafetyNotificationAction) => {
          logger.info(`[SafetyForegroundBridge] 🔔 Notification action received: ${action}`);
          this.notificationListeners.forEach((listener) => {
            try {
              listener(action);
            } catch (err) {
              logger.error('[SafetyForegroundBridge] Error executing notification action listener:', err);
            }
          });
        });

        // 2. Speech transcript listener from native foreground service
        this.eventEmitter.addListener('onVoiceTranscript', (data: NativeVoiceTranscriptEvent) => {
          logger.info(`[SafetyForegroundBridge] 🎤 Native Speech Transcript received: "${data.transcript}" (final=${data.isFinal}, lang=${data.language})`);
          this.transcriptListeners.forEach((listener) => {
            try {
              listener(data);
            } catch (err) {
              logger.error('[SafetyForegroundBridge] Error executing voice transcript listener:', err);
            }
          });
        });

        // 3. Emergency keyword detected in native background speech recognizer
        this.eventEmitter.addListener('onEmergencyKeyword', (data: NativeEmergencyKeywordEvent) => {
          logger.warn(`[SafetyForegroundBridge] Emergency event received: "${data.keyword}" (transcript="${data.transcript}", ${Math.round(data.confidence * 100)}%)`);
          this.emergencyKeywordListeners.forEach((listener) => {
            try {
              listener(data);
            } catch (err) {
              logger.error('[SafetyForegroundBridge] Error executing emergency keyword listener:', err);
            }
          });
        });
      } catch (err) {
        logger.warn('[SafetyForegroundBridge] Could not initialize NativeEventEmitter:', err);
      }
    }
  }

  public static getInstance(): SafetyForegroundBridge {
    if (!SafetyForegroundBridge.instance) {
      SafetyForegroundBridge.instance = new SafetyForegroundBridge();
    }
    return SafetyForegroundBridge.instance;
  }

  /**
   * Start the Android Foreground Service for background audio & location monitoring
   */
  public async startSafetyService(
    title: string = 'WomenSafty Safety Mode Active',
    message: string = 'Monitoring live location & emergency voice keywords',
    language: SupportedLanguage = 'en-US'
  ): Promise<boolean> {
    if (Platform.OS !== 'android' || !SafetyForegroundModule) {
      logger.info('[SafetyForegroundBridge] Foreground service start ignored (non-Android or module not linked).');
      return true;
    }

    try {
      logger.info(`[SafetyForegroundBridge] startSafetyService requested | title: "${title}", message: "${message}", lang: "${language}"`);
      await SafetyForegroundModule.startSafetyService(title, message, language);
      return true;
    } catch (err) {
      logger.error('[SafetyForegroundBridge] Failed to start SafetyForegroundService:', err);
      return false;
    }
  }

  /**
   * Update active recognition language in native foreground service
   */
  public async updateLanguage(language: SupportedLanguage): Promise<boolean> {
    if (Platform.OS !== 'android' || !SafetyForegroundModule) {
      return true;
    }

    try {
      logger.info(`[SafetyForegroundBridge] Updating native service language to [${language}]...`);
      await SafetyForegroundModule.updateLanguage(language);
      return true;
    } catch (err) {
      logger.error('[SafetyForegroundBridge] Failed to update language in SafetyForegroundService:', err);
      return false;
    }
  }

  /**
   * Stop the Android Foreground Service
   */
  public async stopSafetyService(): Promise<boolean> {
    if (Platform.OS !== 'android' || !SafetyForegroundModule) {
      return true;
    }

    try {
      logger.info('[SafetyForegroundBridge] Stopping native SafetyForegroundService...');
      await SafetyForegroundModule.stopSafetyService();
      return true;
    } catch (err) {
      logger.error('[SafetyForegroundBridge] Failed to stop SafetyForegroundService:', err);
      return false;
    }
  }

  /**
   * Check if Safety Foreground Service is currently active
   */
  public async isServiceRunning(): Promise<boolean> {
    if (Platform.OS !== 'android' || !SafetyForegroundModule) {
      return false;
    }

    try {
      return await SafetyForegroundModule.isServiceRunning();
    } catch (err) {
      logger.error('[SafetyForegroundBridge] Failed to check service status:', err);
      return false;
    }
  }

  /**
   * Subscribe to Notification Action events (e.g. user clicked SOS or End from notification bar)
   */
  public onNotificationAction(listener: (action: SafetyNotificationAction) => void): () => void {
    this.notificationListeners.add(listener);
    return () => {
      this.notificationListeners.delete(listener);
    };
  }

  /**
   * Subscribe to speech transcripts recognized natively by the Android foreground service
   */
  public onVoiceTranscript(listener: (data: NativeVoiceTranscriptEvent) => void): () => void {
    this.transcriptListeners.add(listener);
    return () => {
      this.transcriptListeners.delete(listener);
    };
  }

  /**
   * Subscribe to emergency keywords detected natively by the Android foreground service
   */
  public onEmergencyKeyword(listener: (data: NativeEmergencyKeywordEvent) => void): () => void {
    this.emergencyKeywordListeners.add(listener);
    return () => {
      this.emergencyKeywordListeners.delete(listener);
    };
  }
}

export const safetyForegroundBridge = SafetyForegroundBridge.getInstance();
