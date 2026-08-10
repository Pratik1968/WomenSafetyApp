/**
 * Journey Service — Safety Mode Module
 *
 * Singleton service responsible for:
 *   - Managing journey lifecycle (start / end)
 *   - Live GPS tracking (every 5s via locationService)
 *   - Triggering emergencies during an active journey
 *   - Capturing GPS + timestamp + journeyId + keyword for each emergency
 *
 * This service has NO dependency on AIContext, AIService, or Gemini.
 * It communicates with EmergencyService directly.
 */

import { ActiveJourney, JourneyConfig, JourneyEmergencyEvent } from '../types/journey.types';
import { emergencyService } from '../../emergency/services/emergencyService';
import { locationService } from '../../location/services/locationService';
import { contactNotificationService } from './contactNotificationService';
import { keywordDetectionService } from '../../emergency/services/keywordDetectionService';
import { SupportedLanguage } from '../../voice/types/voiceRecognition.types';
import { logger } from '../../../utils/logger';

type JourneyEventListener = (journey: ActiveJourney | null) => void;

export class JourneyService {
  private static instance: JourneyService;

  private activeJourney: ActiveJourney | null = null;
  private listeners: JourneyEventListener[] = [];

  /** Tracks the last speech transcript evaluated to avoid duplicate emergency triggers */
  private lastEvaluatedText: string = '';

  private constructor() {
    logger.info('[JourneyService] Initialized.');
  }

  public static getInstance(): JourneyService {
    if (!JourneyService.instance) {
      JourneyService.instance = new JourneyService();
    }
    return JourneyService.instance;
  }

  // ─── Journey Lifecycle ──────────────────────────────────────────────────────

  public async startJourney(config: JourneyConfig, userId: string): Promise<ActiveJourney> {
    const journeyId = `journey_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const startedAt = new Date().toISOString();

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

    // Begin live GPS tracking
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

    logger.info(`[JourneyService] 🏁 Journey ended | id: ${journeyId}`);

    this.notifyListeners();
    this.activeJourney = null;
    this.notifyListeners(); // notify null state after clear
  }

  public isActive(): boolean {
    return this.activeJourney?.state === 'ACTIVE' || this.activeJourney?.state === 'EMERGENCY';
  }

  public getActiveJourney(): ActiveJourney | null {
    return this.activeJourney;
  }

  // ─── Voice Transcript Evaluation ───────────────────────────────────────────

  /**
   * Called by JourneyContext whenever VoiceContext produces a new transcript.
   * Only evaluates if a journey is active. Deduplicates repeated identical transcripts.
   *
   * @param transcript   Full recognized speech text
   * @param language     Language locale of the transcript
   * @param userId       Firebase UID or mock ID
   * @param threshold    Keyword detection confidence threshold (0–1)
   */
  public async evaluateTranscript(
    transcript: string,
    language: SupportedLanguage,
    userId: string,
    threshold: number = 0.6
  ): Promise<void> {
    if (!this.isActive()) return;
    if (!transcript || transcript.trim().length === 0) return;
    if (transcript === this.lastEvaluatedText) return; // deduplicate

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

    // Set journey state to EMERGENCY (overlay will render)
    this.activeJourney.state = 'EMERGENCY';

    // Capture live GPS
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

    // Dispatch via EmergencyService → POST /api/v1/emergency/trigger
    const emergencyResponse = await emergencyService.triggerEmergency('JOURNEY_VOICE', {
      userId: opts.userId,
      timestamp,
      detectedKeyword: opts.keyword,
      recognizedText: opts.recognizedText,
      confidence: opts.confidence,
      language: opts.language,
      location,
      journeyId,
      // Include real contacts so backend can trigger FCM/SMS notifications
      contacts: config.contacts.map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        relation: c.relation,
      })),
    });

    // Build the journey emergency event record
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

    // Notify selected contacts (simulated)
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
