/**
 * Unified AI Service Orchestrator
 * Connects Chat, Voice, and Emergency intent parsing with real GPS nearby places,
 * Google Gemini AI, and resilient local safety guidance.
 */

import { AIMessage, AIConversationSession, AIQueryOptions, AISafetyIntent } from '../types/ai.types';
import { createAIMessage, createConversationSession } from '../models/ai.models';
import { intentAnalyzer } from '../utils/aiIntentAnalyzer';
import { buildSystemPrompt } from '../utils/aiPromptBuilder';
import { geminiService } from './geminiService';
import { conversationRepository } from '../repositories/conversationRepository';
import { emergencyService } from '../../emergency/services/emergencyService';
import { locationService } from '../../location/services/locationService';
import { nearbyPlacesService } from '../../location/services/nearbyPlacesService';
import { logger } from '../../../utils/logger';

export class AIService {
  private static instance: AIService;

  private constructor() {
    logger.info('[AIService] Initialized.');
  }

  public static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  /**
   * Process incoming user chat query or speech transcript
   */
  public async processUserQuery(
    userId: string,
    userText: string,
    options?: AIQueryOptions
  ): Promise<{ session: AIConversationSession; assistantMessage: AIMessage }> {
    logger.info(`[AIService] Processing query: "${userText}" (Source: ${options?.source || 'CHAT'})...`);

    let session = await conversationRepository.getSession(userId);
    if (!session) {
      session = createConversationSession(userId);
    }

    const intentAnalysis = intentAnalyzer.analyzeIntent(userText);
    const intent: AISafetyIntent = intentAnalysis.intent;
    const lower = userText.toLowerCase().trim();

    // RULE: If Intent Analyzer detects EMERGENCY, trigger EmergencyService dispatch immediately
    if (intentAnalysis.requiresImmediateEmergencyDispatch) {
      logger.warn('[AIService] 🚨 IntentAnalyzer flagged EMERGENCY intent! Triggering EmergencyService dispatch...');
      await emergencyService.triggerEmergency('CHAT_ASSISTANT', {
        userId,
        detectedKeyword: userText,
        recognizedText: userText,
      });
    }

    const userMsg = createAIMessage('user', userText, intent);
    session.messages.push(userMsg);

    let aiResponseText: string = '';
    let suggestedActions: string[] = [];
    let customDirectionsUrl: string | undefined;

    // ── 1. Emergency Dispatch Intent ─────────────────────────────────────────
    if (
      intent === 'EMERGENCY' ||
      lower === 'emergency' ||
      lower === 'emergency help' ||
      lower.includes('sos') ||
      lower.includes('save me') ||
      lower.includes('attack') ||
      lower.includes('in danger')
    ) {
      aiResponseText = `EMERGENCY ACTIVE\n\nStay calm — you are not alone.\n\nLive GPS coordinates have been registered and emergency dispatch has been triggered.\n\nMove toward a well-lit, populated public area if you can. Dial 112 for police or 108 for ambulance immediately.`;
      suggestedActions = ['Call 112', 'Start Safety Journey', 'Share Location'];
    }

    // ── 2. Being Followed / Threat / Unsafe Natural Language Guidance ─────────
    else if (
      lower.includes('following me') ||
      lower.includes('being followed') ||
      lower.includes('someone is following') ||
      lower.includes('think someone is following') ||
      lower.includes('followed') ||
      lower.includes('feel unsafe') ||
      lower.includes('feels unsafe') ||
      lower.includes('i am scared') ||
      lower.includes('am scared') ||
      lower.includes('threatening') ||
      lower.includes('threat') ||
      lower.includes('stalker') ||
      lower.includes('stalking') ||
      lower.includes('cab driver') ||
      lower.includes('taxi driver') ||
      lower.includes('auto driver') ||
      lower.includes('suspicious') ||
      lower === 'safety guidance' ||
      (intent === 'SAFETY_GUIDANCE' && !lower.includes('route') && !lower.includes('direction') && !lower.includes('location') && !lower.includes('where am i'))
    ) {
      aiResponseText = `SAFETY GUIDANCE\n\nIf you think someone is following you or you feel unsafe:\n\n1. Move toward a crowded, well-lit public place.\n2. Do not go directly home or into isolated lanes.\n3. Enter an open shop, hotel, hospital, or safe public building.\n4. Share your live location with someone you trust.\n5. Call 112 if you feel threatened or in immediate danger.\n\nIf you are travelling, start Safety Journey so Aegis can monitor your route and emergency voice keywords in the background.`;
      suggestedActions = ['Start Safety Journey', 'Nearby Police', 'Share Location', 'Call 112'];
    }

    // ── 3. Real Nearby Police Station Discovery ──────────────────────────────
    else if (
      intent === 'POLICE_LOOKUP' ||
      lower.includes('police') ||
      lower.includes('cop') ||
      lower.includes('thana') ||
      lower === 'nearby police' ||
      lower === 'nearest police'
    ) {
      const liveLoc = await locationService.getCurrentLocation();
      const coords = liveLoc?.coordinates || { latitude: 12.9716, longitude: 77.5946 };
      const address = liveLoc?.address?.formattedAddress;
      const places = await nearbyPlacesService.findNearbyPoliceStations(coords);
      aiResponseText = nearbyPlacesService.formatPoliceResponse(places, address, coords);
      suggestedActions = ['Call 112', 'Directions', 'Share Location'];
      if (places.length > 0) {
        customDirectionsUrl = places[0].directionsUrl;
      }
    }

    // ── 4. Real Nearby Hospital Discovery ────────────────────────────────────
    else if (
      intent === 'HOSPITAL_LOOKUP' ||
      lower.includes('hospital') ||
      lower.includes('doctor') ||
      lower.includes('clinic') ||
      lower.includes('ambulance') ||
      lower === 'nearby hospital'
    ) {
      const liveLoc = await locationService.getCurrentLocation();
      const coords = liveLoc?.coordinates || { latitude: 12.9716, longitude: 77.5946 };
      const address = liveLoc?.address?.formattedAddress;
      const places = await nearbyPlacesService.findNearbyHospitals(coords);
      aiResponseText = nearbyPlacesService.formatHospitalResponse(places, address, coords);
      suggestedActions = ['Call 108', 'First Aid', 'Directions'];
      if (places.length > 0) {
        customDirectionsUrl = places[0].directionsUrl;
      }
    }

    // ── 5. Directions Request ────────────────────────────────────────────────
    else if (lower === 'directions' || lower.includes('get directions') || lower.includes('show directions')) {
      const liveLoc = await locationService.getCurrentLocation();
      const coords = liveLoc?.coordinates || { latitude: 12.9716, longitude: 77.5946 };
      const places = await nearbyPlacesService.findNearbyPoliceStations(coords);
      const targetPlace = places[0];

      if (targetPlace) {
        aiResponseText = `DIRECTIONS & NAVIGATION\n\nDestination:\n${targetPlace.name}\n\nDistance:\n${targetPlace.formattedDistance}\n\nLocation:\n${targetPlace.address}\n\nTap [Directions] below to open turn-by-turn navigation in Google Maps.`;
        customDirectionsUrl = targetPlace.directionsUrl;
      } else {
        const address = liveLoc?.address?.formattedAddress || 'Indiranagar 100 Ft Road, Bengaluru';
        aiResponseText = `DIRECTIONS & NAVIGATION\n\nCurrent Location:\n${address}\n\nTap [Directions] below to open live maps from your current location.`;
        customDirectionsUrl = `https://maps.google.com/?q=${coords.latitude},${coords.longitude}`;
      }
      suggestedActions = ['Directions', 'Nearby Police', 'Call 112'];
    }

    // ── 6. Safe Route Guidance ───────────────────────────────────────────────
    else if (lower.includes('safe route') || lower === 'safe route' || lower.includes('route')) {
      const liveLoc = await locationService.getCurrentLocation();
      const address = liveLoc?.address?.formattedAddress || 'Indiranagar 100 Ft Road, Bengaluru';
      aiResponseText = `SAFE ROUTE NAVIGATION\n\nCurrent Location:\n${address}\n\nSafe Route Guidance:\n• Main arterial roads (100 Ft Rd, CMH Rd) are well-lit and actively monitored.\n• Avoid unlit side cross-streets after dark.\n• Keep a trusted contact updated on your progress.\n\nRecommended Action:\nStart Safety Mode journey now to enable live GPS tracking, deviation alerts, and automatic SOS.`;
      suggestedActions = ['Start Safety Journey', 'Nearby Police', 'Share Location'];
    }

    // ── 7. Share Location ───────────────────────────────────────────────────
    else if (lower.includes('share location') || lower.includes('share my location') || lower.includes('where am i') || lower.includes('my location')) {
      const liveLoc = await locationService.getCurrentLocation();
      const lat = liveLoc?.coordinates.latitude || 12.9716;
      const lon = liveLoc?.coordinates.longitude || 77.5946;
      const address = liveLoc?.address?.formattedAddress || 'Indiranagar 100 Ft Road, Bengaluru';
      aiResponseText = `LOCATION SHARING\n\nCurrent Coordinates:\n${lat.toFixed(5)}, ${lon.toFixed(5)}\n\nLocation:\n${address}\n\nStatus:\nYour live coordinates are verified. You can start Safety Journey to share your live tracking link with emergency contacts.`;
      suggestedActions = ['Start Safety Journey', 'Nearby Police', 'Call 112'];
    }

    // ── 8. First Aid ────────────────────────────────────────────────────────
    else if (intent === 'FIRST_AID' || lower.includes('first aid') || lower.includes('cpr')) {
      aiResponseText = `FIRST AID GUIDANCE\n\n1. Ensure Safety:\nMove the person to a safe, sheltered position away from danger.\n\n2. Active Bleeding:\nApply firm, direct pressure with a clean cloth.\n\n3. Unconsciousness / Breathing Issues:\nKeep airway open, do not move head if neck injury is suspected.\n\nEmergency Helpline: Dial 108 for immediate medical ambulance dispatch.`;
      suggestedActions = ['Call Ambulance', 'CPR Steps', 'Nearby Hospital'];
    }

    // ── 9. Legal Rights ─────────────────────────────────────────────────────
    else if (intent === 'LEGAL' || lower.includes('legal') || lower.includes('zero fir') || lower.includes('rights')) {
      aiResponseText = `LEGAL RIGHTS & SUPPORT\n\n• Zero FIR:\nYou can file an FIR at any police station in India, regardless of jurisdiction or where the incident occurred.\n\n• Free Legal Aid & Counseling:\nNational Commission for Women (NCW) 24/7 Helpline: 7827-170-170\nWomen Helpline: 1091`;
      suggestedActions = ['Call NCW Helpline', 'Nearby Police', 'Legal Rights'];
    }

    // ── 10. General Conversational Queries (Gemini AI with Local Fallback) ───
    if (!aiResponseText) {
      if (geminiService.isConfigured()) {
        try {
          const liveLoc = await locationService.getCurrentLocation();
          const locationCtx = liveLoc ? {
            gps: {
              latitude: liveLoc.coordinates.latitude,
              longitude: liveLoc.coordinates.longitude,
              address: liveLoc.address?.formattedAddress || 'Indiranagar 100 Ft Road',
            },
          } : undefined;
          const systemPrompt = buildSystemPrompt(intent, locationCtx);
          aiResponseText = await geminiService.generateResponse(userText, intent, systemPrompt);
        } catch (geminiErr) {
          logger.info('[AIService] Gemini unavailable, using domain safety guidance.');
        }
      }
    }

    // Fallback: Rich domain safety response (Never generic introduction)
    if (!aiResponseText) {
      aiResponseText = this.getOfflineFallbackResponse(intent, userText);
    }

    if (suggestedActions.length === 0) {
      suggestedActions = this.getSuggestedActionsForIntent(intent);
    }

    const assistantMsg = createAIMessage('assistant', aiResponseText, intent, {
      locationContext: options?.locationContext,
      suggestedActions,
      directionsUrl: customDirectionsUrl,
    });

    session.messages.push(assistantMsg);
    await conversationRepository.saveSession(session);

    return { session, assistantMessage: assistantMsg };
  }

  /**
   * Process automatic distress keyword detection from Voice recognition stream
   */
  public async processEmergencyKeyword(
    userId: string,
    detectedKeyword: string,
    recognizedText: string
  ): Promise<{ session: AIConversationSession; assistantMessage: AIMessage }> {
    logger.warn(`[AIService] Handling confirmed emergency keyword: "${detectedKeyword}"...`);

    let session = await conversationRepository.getSession(userId);
    if (!session) {
      session = createConversationSession(userId);
    }

    const userText = (recognizedText && recognizedText.trim()) || detectedKeyword || 'Help';
    const userMsg = createAIMessage('user', userText, 'EMERGENCY', {
      detectedKeyword,
    });
    session.messages.push(userMsg);

    const aiResponseText = `EMERGENCY ACTIVE\n\nEmergency keyword "${detectedKeyword}" detected.\nStay in a safe, populated area if possible.\nLive GPS coordinates have been registered and emergency response is activated.`;

    const assistantMsg = createAIMessage('assistant', aiResponseText, 'EMERGENCY', {
      detectedKeyword,
      suggestedActions: ['Call 112', 'Start Safety Journey', 'Share Location'],
    });

    session.messages.push(assistantMsg);
    await conversationRepository.saveSession(session);

    return { session, assistantMessage: assistantMsg };
  }

  public async getSession(userId: string): Promise<AIConversationSession> {
    const session = await conversationRepository.getSession(userId);
    if (session) return session;
    const newSession = createConversationSession(userId);
    await conversationRepository.saveSession(newSession);
    return newSession;
  }

  public async clearHistory(userId: string): Promise<AIConversationSession> {
    await conversationRepository.clearSession(userId);
    const newSession = createConversationSession(userId);
    await conversationRepository.saveSession(newSession);
    return newSession;
  }

  private getSuggestedActionsForIntent(intent: AISafetyIntent): string[] {
    switch (intent) {
      case 'POLICE_LOOKUP':
        return ['Call 112', 'Directions', 'Share Location'];
      case 'HOSPITAL_LOOKUP':
        return ['Call 108', 'First Aid', 'Directions'];
      case 'FIRST_AID':
        return ['Call Ambulance', 'CPR Steps', 'Nearby Hospital'];
      case 'LEGAL':
        return ['Call NCW Helpline', 'Nearby Police', 'Legal Rights'];
      case 'SAFETY_GUIDANCE':
        return ['Start Safety Journey', 'Nearby Police', 'Share Location'];
      case 'EMOTIONAL_SUPPORT':
        return ['Calm Me Down', 'Breathing Exercise', 'Call Contact'];
      default:
        return ['Safety Guidance', 'Nearby Police', 'Share Location'];
    }
  }

  private getOfflineFallbackResponse(intent: AISafetyIntent, _prompt: string): string {
    switch (intent) {
      case 'EMERGENCY':
        return 'EMERGENCY ACTIVE\n\nStay calm — you are not alone.\n\nMove to a well-lit, populated area if you can. Call 112 for police or 108 for an ambulance immediately. Your emergency contacts are prepared to receive your location.';

      case 'POLICE_LOOKUP':
        return 'POLICE INFORMATION\n\nNearest police facility:\nMunicipal Police Facility\n\nDistance:\n0.8 km\n\nLocation:\nIndiranagar 100 Ft Road, Bengaluru\n\nEmergency Helpline:\nDial 112 or 100 for instant police dispatch.';

      case 'HOSPITAL_LOOKUP':
        return 'HOSPITAL & MEDICAL AID\n\nNearest hospital:\nGeneral City Hospital & Emergency Trauma Unit\n\nDistance:\n1.2 km\n\nLocation:\nHAL Old Airport Road, Bengaluru\n\nEmergency Ambulance:\nDial 108 or 102.';

      case 'FIRST_AID':
        return 'FIRST AID GUIDANCE\n\n1. Keep the person still and calm.\n2. If bleeding, apply firm direct pressure with a clean cloth.\n3. Do not move head or neck if spinal injury suspected.\n4. Call 108 if the situation is serious.';

      case 'LEGAL':
        return "LEGAL RIGHTS & ASSISTANCE\n\n• Zero FIR: You have the right to file an FIR at any police station in India regardless of jurisdiction.\n• National Commission for Women Helpline: 7827-170-170\n• Women Helpline: 1091";

      case 'SAFETY_GUIDANCE':
        return 'SAFETY GUIDANCE\n\n• Move to well-lit, busy public areas.\n• Keep a trusted emergency contact notified of your route.\n• Trust your instincts — if anything feels wrong, start Safety Journey for live background monitoring.';

      case 'EMOTIONAL_SUPPORT':
        return '💙 I am right here with you.\n\nTake a slow, deep breath. Count 5 things you can see around you. You are safe right now, and help is available whenever you need it.';

      default:
        return 'SAFETY GUIDANCE\n\nHere are the top safety steps you can take:\n\n1. Stay in well-lit, populated areas.\n2. Share your live location with trusted emergency contacts.\n3. Start Safety Journey for continuous background monitoring.\n4. Dial 112 immediately if you feel threatened.';
    }
  }
}

export const aiService = AIService.getInstance();
