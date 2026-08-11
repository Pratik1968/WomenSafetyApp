/**
 * Prompt Engineering & History Formatting Utilities for Gemini Integration
 * Supports Location Context (GPS, Nearest Police Station, Nearest Hospital, Emergency Contacts Count)
 */

import { AISafetyIntent, AIMessage, AILocationContext } from '../types/ai.types';
import { DEFAULT_SYSTEM_PROMPT } from '../constants/ai.constants';

export const buildSystemPrompt = (intent: AISafetyIntent, locationContext?: AILocationContext): string => {
  let prompt = DEFAULT_SYSTEM_PROMPT;

  if (locationContext) {
    if (locationContext.gps) {
      prompt += `\nUser GPS: ${locationContext.gps.latitude}, ${locationContext.gps.longitude} (${locationContext.gps.address || 'Location active'}).`;
    }
    if (locationContext.nearestPoliceStation) {
      prompt += `\nNearest Police Station: ${locationContext.nearestPoliceStation.name} (${locationContext.nearestPoliceStation.distanceKm} km away).`;
    }
    if (locationContext.nearestHospital) {
      prompt += `\nNearest Hospital: ${locationContext.nearestHospital.name} (${locationContext.nearestHospital.distanceKm} km away).`;
    }
    if (typeof locationContext.emergencyContactsCount === 'number') {
      prompt += `\nActive Emergency Contacts: ${locationContext.emergencyContactsCount} configured.`;
    }
  }

  switch (intent) {
    case 'POLICE_LOOKUP':
      prompt += '\nFocus: Provide immediate police station coordinates, emergency helpline 112/100, and direct safety advice to head to well-lit public zones.';
      break;
    case 'HOSPITAL_LOOKUP':
      prompt += '\nFocus: Provide emergency hospital lookup info and medical helpline contact instructions (108/102).';
      break;
    case 'FIRST_AID':
      prompt += '\nFocus: Provide clear, numbered step-by-step first-aid instructions for trauma, panic, or injury.';
      break;
    case 'LEGAL':
      prompt += "\nFocus: Outline women's legal rights under Section 354, Zero FIR filing procedures, and National Commission for Women helpline details (7827170170).";
      break;
    case 'EMERGENCY':
      prompt += '\nCRITICAL EMERGENCY CONFIRMED: User is in distress. Respond immediately with 3 urgent survival steps and confirm emergency dispatch.';
      break;
    case 'SAFETY_GUIDANCE':
      prompt += '\nFocus: Offer proactive safety guidance, route precautions, and live tracking recommendations.';
      break;
    case 'EMOTIONAL_SUPPORT':
      prompt += '\nFocus: Provide empathetic, calming words, grounding exercise (5-4-3-2-1 technique), and reassuring tone.';
      break;
    case 'NORMAL_CHAT':
    default:
      break;
  }

  return prompt;
};

export const formatConversationHistoryForAI = (messages: AIMessage[]): string => {
  return messages
    .map(m => `${m.role.toUpperCase()}: ${m.content}`)
    .join('\n');
};
