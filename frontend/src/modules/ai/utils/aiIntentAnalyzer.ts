/**
 * Intent Analyzer Engine
 * Analyzes incoming user messages / speech transcripts and classifies into 8 supported intents:
 * (NORMAL_CHAT, EMERGENCY, FIRST_AID, LEGAL, POLICE_LOOKUP, HOSPITAL_LOOKUP, SAFETY_GUIDANCE, EMOTIONAL_SUPPORT)
 *
 * CRITICAL RULE: AI model NEVER decides whether an emergency exists.
 * Emergency classification triggers EmergencyService dispatch immediately before querying AI.
 */

import { AISafetyIntent } from '../types/ai.types';
import { INTENT_KEYWORD_MAP } from '../constants/ai.constants';

export interface IntentAnalysisResult {
  intent: AISafetyIntent;
  confidence: number;
  requiresImmediateEmergencyDispatch: boolean;
}

export class IntentAnalyzer {
  private static instance: IntentAnalyzer;

  private constructor() {}

  public static getInstance(): IntentAnalyzer {
    if (!IntentAnalyzer.instance) {
      IntentAnalyzer.instance = new IntentAnalyzer();
    }
    return IntentAnalyzer.instance;
  }

  public analyzeIntent(text: string): IntentAnalysisResult {
    if (!text || !text.trim()) {
      return {
        intent: 'NORMAL_CHAT',
        confidence: 1.0,
        requiresImmediateEmergencyDispatch: false,
      };
    }

    const lower = text.toLowerCase();

    for (const [intentKey, keywords] of Object.entries(INTENT_KEYWORD_MAP)) {
      if (keywords.some(kw => lower.includes(kw))) {
        const intent = intentKey as AISafetyIntent;
        const isEmergency = intent === 'EMERGENCY';
        return {
          intent,
          confidence: 0.95,
          requiresImmediateEmergencyDispatch: isEmergency,
        };
      }
    }

    return {
      intent: 'NORMAL_CHAT',
      confidence: 0.8,
      requiresImmediateEmergencyDispatch: false,
    };
  }
}

export const intentAnalyzer = IntentAnalyzer.getInstance();
