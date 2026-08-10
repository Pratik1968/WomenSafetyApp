/**
 * Unified AI Assistant Type Definitions
 * Supports Chat, Voice, Emergency Intent Recognition, Safety Guidance, First Aid, Police & Hospital Lookup, and Legal Advice.
 */

export type AISafetyIntent =
  | 'NORMAL_CHAT'
  | 'EMERGENCY'
  | 'FIRST_AID'
  | 'LEGAL'
  | 'POLICE_LOOKUP'
  | 'HOSPITAL_LOOKUP'
  | 'SAFETY_GUIDANCE'
  | 'EMOTIONAL_SUPPORT';

export type AIMessageRole = 'user' | 'assistant' | 'system';

export interface AILocationContext {
  gps?: { latitude: number; longitude: number; address?: string };
  nearestPoliceStation?: { name: string; distanceKm: number; phone?: string };
  nearestHospital?: { name: string; distanceKm: number; phone?: string };
  emergencyContactsCount?: number;
}

export interface AIMessage {
  id: string;
  role: AIMessageRole;
  content: string;
  timestamp: string; // ISO 8601 string
  intent?: AISafetyIntent;
  actionPayload?: {
    locationContext?: AILocationContext;
    detectedKeyword?: string;
    suggestedActions?: string[];
    directionsUrl?: string;
  };
}

export interface AIConversationSession {
  id: string;
  userId: string;
  messages: AIMessage[];
  createdAt: string;
  updatedAt: string;
}

export type AIAssistantState = 'IDLE' | 'THINKING' | 'LISTENING' | 'SPEAKING' | 'EMERGENCY_ALERT';

export interface AIQueryOptions {
  source?: 'CHAT' | 'VOICE' | 'EMERGENCY_TRIGGER';
  locale?: string;
  locationContext?: AILocationContext;
  isOffline?: boolean;
}
