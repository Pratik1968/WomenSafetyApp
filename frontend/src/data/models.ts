// Shared model types for modules #17 (Evidence) and #20 (Admin Dashboard).
// These mirror the SQL schema in `database/schema/*.sql` and the edge-function responses.

export type EvidenceType = "audio" | "video" | "image" | "gps_track" | "incident_log";
export type IncidentType = "sos" | "journey" | "report" | "alert";
export type IncidentStatus = "active" | "resolved" | "under_review" | "cancelled";
export type RiskLevel = "low" | "moderate" | "high" | "hotspot";

export interface Evidence {
  id: string;
  user_id: string;
  incident_id: string | null;
  type: EvidenceType;
  storage_bucket: string;
  storage_path: string;
  file_name: string | null;
  mime_type: string | null;
  size_bytes: number;
  duration_seconds: number | null;
  checksum_sha256: string | null;
  is_encrypted: boolean;
  encryption_algo: string;
  tamper_seal: string | null;
  status: string;
  captured_at: string | null;
  uploaded_at: string;
  created_at: string;
  metadata: Record<string, unknown>;
}

export interface EvidenceAccessLog {
  id: string;
  evidence_id: string;
  accessed_by: string | null;
  action: string; // view | download | retrieve | delete | upload
  signed_url_expires_at: string | null;
  accessed_at: string;
  ip: string | null;
}

export interface SecureRetrieval {
  evidence: Evidence;
  signedUrl: string;
  expiresIn: number;
  expiresAt: string;
}

export interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  blood_group: string | null;
  is_admin: boolean;
  status: string; // active | suspended
  created_at: string;
  last_active_at: string | null;
}

export interface Incident {
  id: string;
  user_id: string | null;
  type: IncidentType;
  status: IncidentStatus;
  severity: number;
  lat: number | null;
  lng: number | null;
  address: string | null;
  started_at: string;
  resolved_at: string | null;
  response_time_seconds: number | null;
}

export interface CrimeHotspot {
  id: string;
  name: string;
  lat: number | null;
  lng: number | null;
  risk_level: RiskLevel;
  incident_count: number;
  updated_at: string;
}

export interface HealthMetric {
  service: string;
  metric: string;
  value: number;
  unit: string | null;
  recorded_at: string;
}

export interface AdminOverview {
  total_users: number;
  active_users_7d: number;
  suspended_users: number;
  total_incidents: number;
  active_incidents: number;
  avg_response_seconds: number;
  total_evidence: number;
  storage_bytes_used: number;
}

export interface IncidentAnalytics {
  daily: { day: string; incident_count: number }[];
  by_type: { type: string; incident_count: number }[];
  avg_response_seconds: number;
}
