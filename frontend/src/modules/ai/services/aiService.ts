/**
 * Unified AI Service Orchestrator
 * Connects Chat, Voice, and Emergency intent parsing with Gemini AI placeholder & Conversation Repository.
 */

import { AIMessage, AIConversationSession, AIQueryOptions, AISafetyIntent } from '../types/ai.types';
import { createAIMessage, createConversationSession } from '../models/ai.models';
import { intentAnalyzer } from '../utils/aiIntentAnalyzer';
import { buildSystemPrompt, formatConversationHistoryForAI } from '../utils/aiPromptBuilder';
import { geminiService } from './geminiService';
import { conversationRepository } from '../repositories/conversationRepository';
import { emergencyService } from '../../emergency/services/emergencyService';
import { apiClient } from '../../../api/apiClient';
import { API_ENDPOINTS } from '../../../api/apiEndpoints';
import { networkMonitor } from '../../../api/networkMonitor';
import { locationService } from '../../location/services/locationService';
import { logger } from '../../../utils/logger';

export class AIService {
  private static instance: AIService;

  private constructor() {
    logger.info('AIService initialized.');
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
    logger.info(`AIService processing user query: "${userText}" (Source: ${options?.source || 'CHAT'})...`);

    let session = await conversationRepository.getSession(userId);
    if (!session) {
      session = createConversationSession(userId);
    }

    const intentAnalysis = intentAnalyzer.analyzeIntent(userText);
    const intent: AISafetyIntent = intentAnalysis.intent;

    // RULE: If Intent Analyzer detects EMERGENCY, trigger EmergencyService dispatch immediately BEFORE AI guidance
    if (intentAnalysis.requiresImmediateEmergencyDispatch) {
      logger.info('🚨 IntentAnalyzer flagged EMERGENCY intent! Triggering EmergencyService dispatch...');
      await emergencyService.triggerEmergency('CHAT_ASSISTANT', {
        userId,
        detectedKeyword: userText,
        recognizedText: userText,
      });
    }

    const userMsg = createAIMessage('user', userText, intent);
    session.messages.push(userMsg);

    const historyPayload = session.messages.slice(-20).map(m => ({
      role: m.role,
      content: m.content,
    }));

    let locationCtx = options?.locationContext;
    if (!locationCtx) {
      try {
        const liveLoc = await locationService.getCurrentLocation();
        if (liveLoc) {
          locationCtx = {
            gps: {
              latitude: liveLoc.coordinates.latitude,
              longitude: liveLoc.coordinates.longitude,
              address: liveLoc.address?.formattedAddress || 'Indiranagar 100 Ft Road',
            },
            nearestPoliceStation: { name: 'Central Police Station', distanceKm: 0.8, phone: '112' },
            nearestHospital: { name: 'General City Hospital', distanceKm: 1.2, phone: '108' },
          };
        }
      } catch (err) {
        logger.warn('Failed to build location context for AI query:', err);
      }
    }

    let aiResponseText: string;
    const aiQueryPayload = {
      userId,
      prompt: userText,
      intent,
      history: historyPayload,
      locationContext: locationCtx,
      sessionId: session.id,
    };

    try {
      // Always attempt the backend call; offline status is derived from health checks, not a send gate.
      console.log(`📤 [AIService] POST ${API_ENDPOINTS.AI_QUERY} → ${API_ENDPOINTS.AI_QUERY}`);
      const response = await apiClient.post(API_ENDPOINTS.AI_QUERY, aiQueryPayload);
      aiResponseText =
        response.data?.response ||
        response.data?.reply ||
        this.getOfflineFallbackResponse(intent, userText);
    } catch (err) {
      logger.error('FastAPI Gemini AI query request failed. Using local fallback response:', err);
      await networkMonitor.queueOfflineRequest('AI_QUERY', API_ENDPOINTS.AI_QUERY, {
        ...aiQueryPayload,
        timestamp: new Date().toISOString(),
      });
      aiResponseText = this.getOfflineFallbackResponse(intent, userText);
    }

    const assistantMsg = createAIMessage('assistant', aiResponseText, intent, {
      locationContext: options?.locationContext,
      suggestedActions: this.getSuggestedActionsForIntent(intent),
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
    logger.info(`AIService handling confirmed emergency keyword: "${detectedKeyword}"...`);

    let session = await conversationRepository.getSession(userId);
    if (!session) {
      session = createConversationSession(userId);
    }

    const userText = (recognizedText && recognizedText.trim()) || detectedKeyword || 'Help';
    const userMsg = createAIMessage('user', userText, 'EMERGENCY', {
      detectedKeyword,
    });
    session.messages.push(userMsg);

    const aiResponseText = `Emergency detected.
Stay calm.
Your emergency contacts are being prepared.
Share your live location if possible.`;

    const assistantMsg = createAIMessage('assistant', aiResponseText, 'EMERGENCY', {
      detectedKeyword,
      suggestedActions: ['Start Safety Mode', 'Alert Emergency Contacts', 'Call 112'],
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
        return ['Call 112', 'Share Location', 'Directions'];
      case 'HOSPITAL_LOOKUP':
        return ['Call 108', 'First Aid Guide', 'Directions'];
      case 'FIRST_AID':
        return ['CPR Steps', 'Call Ambulance', 'Check Pulse'];
      case 'LEGAL':
        return ['File Zero FIR', 'Call NCW Helpline', 'Legal Rights'];
      case 'SAFETY_GUIDANCE':
        return ['Start Safety Mode', 'Share Route', 'Check Lighting'];
      case 'EMOTIONAL_SUPPORT':
        return ['Calm Me Down', 'Breathing Exercise', 'Call Contact'];
      default:
        return ['Safety Guidance', 'Nearby Police', 'First Aid'];
    }
  }

  private getOfflineFallbackResponse(intent: AISafetyIntent, _prompt: string): string {
    switch (intent) {
      case 'EMERGENCY':
        return 'Stay calm — you are not alone.\n\nMove to a well-lit, populated area if you can. Call 112 for police or 108 for an ambulance. Your emergency contacts are being prepared to receive your location.';

      case 'POLICE_LOOKUP':
        return 'The national police emergency number is 112.\n\nFor non-emergency assistance, try 100. If you share your location when the connection returns, I can find the nearest station for you.';

      case 'HOSPITAL_LOOKUP':
        return 'Call 108 for an ambulance — it\'s free and available 24/7 across India.\n\nFor non-emergency medical queries, 104 is the health helpline. I\'ll find the nearest hospital as soon as your connection is restored.';

      case 'FIRST_AID':
        return 'Here are the basics while help is on the way:\n\n• Keep the person still and calm\n• If bleeding, apply firm pressure with a clean cloth\n• Do not move someone with a possible neck or spine injury\n• Call 108 if the situation is serious';

      case 'LEGAL':
        return 'You have the right to file a Zero FIR at any police station — it doesn\'t matter which district the incident happened in.\n\nThe NCW helpline is 7827-170-170. I\'ll give you more detailed guidance once you\'re back online.';

      case 'SAFETY_GUIDANCE':
        return 'A few things that help right now:\n\n• Stay in well-lit, busy areas\n• Keep a trusted contact aware of your location\n• Trust your instincts — if something feels wrong, act on it\n\nStart Safety Mode when you\'re ready and I\'ll monitor your route.';

      case 'EMOTIONAL_SUPPORT':
        return 'I hear you, and what you\'re feeling is completely valid.\n\nTake a slow, deep breath. You\'re safe right now. Reach out to someone you trust, or I can help you find a support helpline when you\'re back online.';

      default:
        return 'I\'m in offline mode right now, but I\'m still here.\n\nFor immediate danger: call 112. For medical help: call 108. I\'ll give you a full answer as soon as your connection returns.';
    }
  }
}

export const aiService = AIService.getInstance();
