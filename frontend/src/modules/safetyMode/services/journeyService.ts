/**
 * Journey Service — Safety Mode Module
 *
 * Singleton service responsible for:
 *   - Managing journey lifecycle (start / end)
 *   - Live GPS tracking (every 5s via locationService)
 *   - Triggering emergencies during an active journey
 *   - Capturing GPS + timestamp + journeyId + keyword for each emergency
 *
 * Communicates with EmergencyService directly.
 */

import { ActiveJourney, JourneyConfig, JourneyEmergencyEvent } from '../types/journey.types';
import { emergencyService } from '../../emergency/services/emergencyService';
import { locationService } from '../../location/services/locationService';
import { contactNotificationService } from './contactNotificationService';
import { keywordDetectionService } from '../../emergency/services/keywordDetectionService';
import { voiceRecognitionService } from '../../voice/services/voiceRecognitionService';
import { requestMicrophonePermissions } from '../../voice/services/voicePermissions';
import { safetyForegroundBridge } from '../../voice/services/safetyForegroundBridge';
import { SupportedLanguage } from '../../voice/types/voiceRecognition.types';
import { logger } from '../../../utils/logger';

type JourneyEventListener = (journey: ActiveJourney | null) => void;

export class JourneyService {
  private static instance: JourneyService;

  private activeJourney: ActiveJourney | null = null;
  private listeners: JourneyEventListener[] = [];
  private currentUserId: string = 'anonymous';

  /** Tracks the last speech transcript evaluated to avoid duplicate emergency triggers */
  private lastEvaluatedText: string = '';

  private constructor() {
    logger.info('[JourneyService] Initialized with foreground safety & background voice monitoring.');
    this.bindNotificationActions();
  }

  public static getInstance(): JourneyService {
    if (!JourneyService.instance) {
      JourneyService.instance = new JourneyService();
    }
    return JourneyService.instance;
  }

  private bindNotificationActions(): void {
    safetyForegroundBridge.onNotificationAction(async (action) => {
      if (action === 'TRIGGER_SOS') {
        if (this.isActive() && this.activeJourney) {
          logger.info('[JourneyService] 🚨 SOS triggered via Notification action button.');
          await this.triggerJourneyEmergency({
            userId: this.currentUserId || 'anonymous',
            keyword: 'Notification SOS Action',
            recognizedText: 'Triggered from persistent notification SOS button',
            confidence: 1.0,
            language: 'en-US',
          });
        }
      } else if (action === 'END_JOURNEY') {
        logger.info('[JourneyService] End journey triggered via Notification action button.');
        this.endJourney();
      }
    });

    // Handle emergency keywords detected by native background SpeechRecognizer
    safetyForegroundBridge.onEmergencyKeyword(async (data) => {
      if (this.isActive() && this.activeJourney) {
        logger.warn(
          `[JourneyService] 🚨 Emergency keyword triggered from native background engine: "${data.keyword}" (${Math.round(data.confidence * 100)}%)`
        );
        await this.triggerJourneyEmergency({
          userId: this.currentUserId || 'anonymous',
          keyword: data.keyword,
          recognizedText: data.transcript,
          confidence: data.confidence || 0.95,
          language: (data.language as SupportedLanguage) || 'en-US',
        });
      }
    });

    // Forward transcripts received natively from foreground service
    safetyForegroundBridge.onVoiceTranscript(async (data) => {
      if (this.isActive()) {
        await this.evaluateTranscript(
          data.transcript,
          (data.language as SupportedLanguage) || 'en-US',
          this.currentUserId
        );
      }
    });
  }

  // ─── Journey Lifecycle ──────────────────────────────────────────────────────

  public async startJourney(config: JourneyConfig, userId: string, language?: SupportedLanguage): Promise<ActiveJourney> {
    const journeyId = `journey_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const startedAt = new Date().toISOString();
    this.currentUserId = userId || 'anonymous';

    this.activeJourney = {
      journeyId,
      config,
      startedAt,
      state: 'ACTIVE',
      locationHistory: [],
      emergencyEvents: [],
    };

    logger.info(
      `[JourneyService] ✅ Journey started | id: ${journeyId} | destination: ${config.destination.name} | contacts: ${config.contacts.length}`
    );

    const activeLang = language || voiceRecognitionService.getCurrentLanguage() || 'en-US';

    // 1. Ensure any active speech session is stopped before native service takes mic ownership
    await voiceRecognitionService.stopListening().catch(() => {});

    // 2. Ensure microphone permissions are verified
    await requestMicrophonePermissions().catch(() => {});

    // 3. Start native Android foreground service
    try {
      await safetyForegroundBridge.startSafetyService(
        'WomenSafty Safety Mode Active',
        `Journey to ${config.destination.name} · Voice SOS & GPS active`,
        activeLang
      );
    } catch (fgErr) {
      logger.warn('[JourneyService] Failed to start foreground service:', fgErr);
    }

    // 4. Mark continuous listening active in voiceRecognitionService
    try {
      await voiceRecognitionService.startListening(activeLang, true);
      logger.info(`[JourneyService] Continuous voice recognition active in [${activeLang}] for background safety.`);
    } catch (voiceErr) {
      logger.warn('[JourneyService] Voice recognition start skipped/failed on journey start:', voiceErr);
    }

    // 5. Begin live GPS tracking
    await locationService.startLocationTracking((locationData) => {
      if (!this.activeJourney) return;
      const point = {
        latitude: locationData.coordinates.latitude,
        longitude: locationData.coordinates.longitude,
        timestamp: locationData.timestamp,
      };
      this.activeJourney.locationHistory.push(point);
      logger.info(
        `[JourneyService] 📍 GPS update | lat: ${point.latitude.toFixed(5)} | lng: ${point.longitude.toFixed(5)}`
      );
    });

    this.notifyListeners();
    return this.activeJourney;
  }

  public endJourney(): void {
    if (!this.activeJourney) return;
    const { journeyId } = this.activeJourney;

    this.activeJourney.state = 'ENDED';
    locationService.stopLocationTracking();
    this.lastEvaluatedText = '';

    // Stop continuous voice recognition & native foreground service
    voiceRecognitionService.stopListening().catch((err) => {
      logger.warn('[JourneyService] Error stopping voice recognition on end journey:', err);
    });
    safetyForegroundBridge.stopSafetyService().catch((err) => {
      logger.warn('[JourneyService] Error stopping foreground service on end journey:', err);
    });

    logger.info(`[JourneyService] 🏁 Journey ended | id: ${journeyId}`);

    this.notifyListeners();
    this.activeJourney = null;
    this.notifyListeners();
  }

  public isActive(): boolean {
    return this.activeJourney?.state === 'ACTIVE' || this.activeJourney?.state === 'EMERGENCY';
  }

  public getActiveJourney(): ActiveJourney | null {
    return this.activeJourney;
  }

  // ─── Voice Transcript Evaluation ───────────────────────────────────────────

  public async evaluateTranscript(
    transcript: string,
    language: SupportedLanguage,
    userId: string,
    threshold: number = 0.6
  ): Promise<void> {
    if (!this.isActive()) return;
    // Guard: Prevent duplicate emergency triggers during an active Journey
    if (this.activeJourney?.state === 'EMERGENCY' || (this.activeJourney?.emergencyEvents.length ?? 0) > 0) {
      return;
    }
    if (!transcript || transcript.trim().length === 0) return;
    if (transcript === this.lastEvaluatedText) return;

    this.lastEvaluatedText = transcript;

    const result = keywordDetectionService.detectKeywords(transcript, language, threshold);

    if (!result.detected || !result.keyword) return;

    logger.info(
      `[JourneyService] 🚨 Emergency keyword detected during active journey: "${result.keyword}" (${Math.round((result.confidence || 0) * 100)}%)`
    );

    await this.triggerJourneyEmergency({
      userId,
      keyword: result.keyword,
      recognizedText: transcript,
      confidence: result.confidence || 0,
      language: (result.language as SupportedLanguage) || language,
    });
  }

  // ─── Emergency Trigger ─────────────────────────────────────────────────────

  private async triggerJourneyEmergency(opts: {
    userId: string;
    keyword: string;
    recognizedText: string;
    confidence: number;
    language: SupportedLanguage;
  }): Promise<void> {
    if (!this.activeJourney) return;

    this.activeJourney.state = 'EMERGENCY';

    let location = { latitude: 12.9716, longitude: 77.5946, address: 'Location unavailable' };
    try {
      const liveLoc = await locationService.getCurrentLocation();
      if (liveLoc) {
        location = {
          latitude: liveLoc.coordinates.latitude,
          longitude: liveLoc.coordinates.longitude,
          address: liveLoc.address?.formattedAddress || `${liveLoc.coordinates.latitude}, ${liveLoc.coordinates.longitude}`,
        };
      }
    } catch (err) {
      logger.warn('[JourneyService] Failed to get live GPS for emergency:', err);
    }

    const timestamp = new Date().toISOString();
    const { journeyId, config } = this.activeJourney;

    const emergencyResponse = await emergencyService.triggerEmergency('JOURNEY_VOICE', {
      userId: opts.userId,
      timestamp,
      detectedKeyword: opts.keyword,
      recognizedText: opts.recognizedText,
      confidence: opts.confidence,
      language: opts.language,
      location,
      journeyId,
      contacts: config.contacts.map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        relation: c.relation,
      })),
    });

    const event: JourneyEmergencyEvent = {
      emergencyId: emergencyResponse.emergencyId,
      journeyId,
      detectedKeyword: opts.keyword,
      recognizedText: opts.recognizedText,
      confidence: opts.confidence,
      language: opts.language,
      timestamp,
      location,
    };

    this.activeJourney.emergencyEvents.push(event);

    logger.info(
      `[JourneyService] Emergency event recorded | emergencyId: ${event.emergencyId} | journeyId: ${journeyId}`
    );

    await contactNotificationService.notifyContacts(config.contacts, event);

    this.notifyListeners();
  }

  // ─── Observers ─────────────────────────────────────────────────────────────

  public onJourneyChange(listener: JourneyEventListener): () => void {
    this.listeners.push(listener);
    listener(this.activeJourney);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(l => l(this.activeJourney));
  }
}

export const journeyService = JourneyService.getInstance();
