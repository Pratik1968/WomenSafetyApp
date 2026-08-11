/**
 * Safety Mode — Journey Domain Types
 *
 * Completely independent of AI Assistant types.
 * AI chat has zero awareness of these types.
 */

import { SupportedLanguage } from '../../voice/types/voiceRecognition.types';

/** Journey lifecycle state */
export type JourneyState =
  | 'IDLE'
  | 'ACTIVE'
  | 'EMERGENCY'
  | 'ENDED';

/** User-selected transport mode */
export type TransportMode = 'walk' | 'bike' | 'cab' | 'transit';

/** Contact selected to watch this journey */
export interface JourneyContact {
  id: string;
  name: string;
  relation: string;
  phone?: string;
}

/** Destination chosen by the user */
export interface JourneyDestination {
  id?: string;
  name: string;
  address: string;
}

/** Full journey configuration collected across the 4-step wizard */
export interface JourneyConfig {
  destination: JourneyDestination;
  transport: TransportMode;
  contacts: JourneyContact[];
}

/** A single emergency event that occurred during an active journey */
export interface JourneyEmergencyEvent {
  /** Stable ID linking this event to the EmergencyService record */
  emergencyId: string;
  journeyId: string;
  detectedKeyword: string;
  recognizedText: string;
  confidence: number;
  language: SupportedLanguage;
  timestamp: string;
  location: {
    latitude: number;
    longitude: number;
    address?: string;
  };
}

/** Runtime state of an in-progress journey */
export interface ActiveJourney {
  journeyId: string;
  config: JourneyConfig;
  startedAt: string;
  state: JourneyState;
  /** GPS coordinates received since journey start */
  locationHistory: Array<{ latitude: number; longitude: number; timestamp: string }>;
  /** Emergency events that fired during this journey */
  emergencyEvents: JourneyEmergencyEvent[];
}
