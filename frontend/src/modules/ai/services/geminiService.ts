/**
 * Gemini Service Placeholder Implementation
 * Ready for Google Gemini API (Generative Language SDK) integration.
 * DO NOT INTEGRATE GEMINI API KEY / SDK YET — Architectural Placeholder.
 */

import { AISafetyIntent } from '../types/ai.types';
import { logger } from '../../../utils/logger';

export class GeminiService {
  private static instance: GeminiService;
  private apiKey: string | null = null;

  private constructor() {
    logger.info('GeminiService initialized (Placeholder Architecture).');
  }

  public static getInstance(): GeminiService {
    if (!GeminiService.instance) {
      GeminiService.instance = new GeminiService();
    }
    return GeminiService.instance;
  }

  public setApiKey(key: string): void {
    this.apiKey = key;
    logger.info('Gemini API Key configured.');
  }

  /**
   * Placeholder generation method — returns domain-specific intent guidance until Gemini SDK is attached.
   */
  public async generateResponse(
    prompt: string,
    intent: AISafetyIntent,
    _historyContext?: string
  ): Promise<string> {
    logger.info(`[GeminiService Placeholder] Generating response for intent [${intent}]...`);

    // Simulate AI network inference delay (400ms)
    await new Promise(resolve => setTimeout(resolve, 400));

    switch (intent) {
      case 'POLICE_LOOKUP':
        return '🚨 **Nearby Police Assistance**: The nearest station is Central Police Station (0.8 km away, 24/7 Desk). Dial **112** or **100** immediately for emergency dispatch.';

      case 'HOSPITAL_LOOKUP':
        return '🏥 **Nearby Hospital & Medical Aid**: General City Hospital is 1.2 km away. Emergency Medical Services can be reached directly at **108** or **102**.';

      case 'FIRST_AID':
        return '🩹 **First Aid Guidance**:\n1. Ensure you are in a safe, sheltered position.\n2. Apply firm pressure with a clean cloth to any active bleeding.\n3. Keep calm and take deep breaths while help is en route.';

      case 'LEGAL':
        return "⚖️ **Legal Assistance & Women's Rights**:\n- **Zero FIR**: You can file an FIR at any police station regardless of jurisdiction.\n- **NCW Helpline**: Call **7827170170** for 24/7 legal support & emergency intervention.";

      case 'EMERGENCY':
        return '🚨 **EMERGENCY CONFIRMED**:\n1. Stay in a populated, well-lit area.\n2. Aegis is sharing your live GPS coordinates with emergency contacts.\n3. Help is on the way. Hold tight.';

      case 'SAFETY_GUIDANCE':
        return '🛡️ **Safety Guidance**: Main 100 Ft Road is bright and monitored. 5th Cross has low lighting reports — stay on the illuminated main road until your destination.';

      case 'EMOTIONAL_SUPPORT':
        return '💙 **I am right here with you**: Take a slow, deep breath. Count 5 things you see around you. You are not alone, and help is available whenever you need it.';

      case 'NORMAL_CHAT':
      default:
        return `I am Aegis, your safety assistant. You asked: "${prompt}". Let me know if you need route advice, police, hospital, or emergency dispatch.`;
    }
  }
}

export const geminiService = GeminiService.getInstance();
