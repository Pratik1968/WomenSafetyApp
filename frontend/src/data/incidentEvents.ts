/**
 * Module 19 — Incident Timeline Event Contract & Types
 *
 * Central definition of incident event types and data contract across all modules
 * (Module 3 SOS, Module 4 GPS, Module 6 Audio, Module 7 Video, Module 18 AI Behavior, etc.).
 */

export type IncidentEventType =
  | "SOS_ACTIVATED"
  | "SOS_CANCELLED"
  | "INCIDENT_CREATED"
  | "LOCATION_UPDATED"
  | "AUDIO_STARTED"
  | "AUDIO_STOPPED"
  | "AUDIO_UPLOADED"
  | "VIDEO_STARTED"
  | "VIDEO_STOPPED"
  | "VIDEO_UPLOADED"
  | "EMERGENCY_CONTACT_NOTIFIED"
  | "EMERGENCY_CONTACT_ACKNOWLEDGED"
  | "CALL_INITIATED"
  | "MESSAGE_SENT"
  | "AI_RISK_DETECTED"
  | "AI_WARNING"
  | "EMERGENCY_SERVICE_CONTACTED"
  | "INCIDENT_RESOLVED";

export interface IncidentEventPayload {
  incident_id: string;
  event_type: IncidentEventType;
  title: string;
  description?: string;
  timestamp?: string; // ISO 8601 string
  metadata?: Record<string, unknown>;
}

export interface IncidentEventRecord {
  id: string;
  incident_id: string;
  event_type: IncidentEventType;
  title: string;
  description: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

/** UI display metadata per event type */
export interface EventDisplayConfig {
  title: string;
  tone: "emergency" | "warning" | "brand" | "success" | "neutral";
  iconName: string;
}

export const EVENT_DISPLAY_CONFIG: Record<IncidentEventType, EventDisplayConfig> = {
  SOS_ACTIVATED: { title: "SOS Activated", tone: "emergency", iconName: "Siren" },
  SOS_CANCELLED: { title: "SOS Cancelled", tone: "neutral", iconName: "XCircle" },
  INCIDENT_CREATED: { title: "Incident Created", tone: "warning", iconName: "AlertTriangle" },
  LOCATION_UPDATED: { title: "Location Updated", tone: "brand", iconName: "MapPin" },
  AUDIO_STARTED: { title: "Audio Recording Started", tone: "brand", iconName: "Mic" },
  AUDIO_STOPPED: { title: "Audio Recording Stopped", tone: "neutral", iconName: "MicOff" },
  AUDIO_UPLOADED: { title: "Audio Evidence Uploaded", tone: "success", iconName: "UploadCloud" },
  VIDEO_STARTED: { title: "Video Recording Started", tone: "brand", iconName: "Video" },
  VIDEO_STOPPED: { title: "Video Recording Stopped", tone: "neutral", iconName: "VideoOff" },
  VIDEO_UPLOADED: { title: "Video Evidence Uploaded", tone: "success", iconName: "UploadCloud" },
  EMERGENCY_CONTACT_NOTIFIED: { title: "Contacts Notified", tone: "brand", iconName: "Send" },
  EMERGENCY_CONTACT_ACKNOWLEDGED: { title: "Contact Acknowledged", tone: "success", iconName: "CheckCircle" },
  CALL_INITIATED: { title: "Call Initiated", tone: "brand", iconName: "PhoneCall" },
  MESSAGE_SENT: { title: "SMS Alert Sent", tone: "brand", iconName: "MessageSquare" },
  AI_RISK_DETECTED: { title: "AI Threat Detected", tone: "warning", iconName: "ShieldAlert" },
  AI_WARNING: { title: "AI Pre-Warning Triggered", tone: "warning", iconName: "AlertCircle" },
  EMERGENCY_SERVICE_CONTACTED: { title: "Helpline Contacted", tone: "emergency", iconName: "Phone" },
  INCIDENT_RESOLVED: { title: "Incident Resolved", tone: "success", iconName: "CheckCircle2" },
};
