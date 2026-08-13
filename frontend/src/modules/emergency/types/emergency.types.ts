/**
 * Emergency Domain Types & Interfaces
 */

export type EmergencySource =
  | 'VOICE'           // Standalone voice keyword (outside a journey)
  | 'JOURNEY_VOICE'   // Voice keyword detected during an active Safety Mode journey
  | 'SOS_BUTTON'      // Manual SOS button press
  | 'FALL_DETECTION'  // Automatic fall/impact detection
  | 'CHAT_ASSISTANT'; // AI assistant escalation

export interface EmergencyPayload {
  userId: string;
  timestamp: string;
  source: EmergencySource;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  detectedKeyword?: string;
  recognizedText?: string;
  confidence?: number;
  language?: string;
  pressType?: string;
  connectedDevice?: string | null;
  /** Journey ID — set when source is JOURNEY_VOICE to link event to a specific journey */
  journeyId?: string;
  audioClipUri?: string;
  batteryLevel?: number;
  /** Emergency contacts to notify (name, phone, relation) */
  contacts?: Array<{ id: string; name: string; phone?: string; relation?: string }>;
}

export interface EmergencyResponse {
  success: boolean;
  emergencyId: string;
  source: EmergencySource;
  timestamp: string;
  payload: EmergencyPayload;
  status: 'DISPATCHED' | 'QUEUED_OFFLINE' | 'FAILED';
}
