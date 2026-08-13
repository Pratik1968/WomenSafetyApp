/**
 * Module 19: Incident Timeline — backend sync for SOS incidents.
 *
 * Deliberately separate from modules/emergency/services/emergencyService.ts,
 * which handles voice/journey/fall-detection triggers via a different
 * endpoint (EMERGENCY_ALERT) and its own offline queue — do not merge these.
 */
import { apiClient } from "../api/apiClient";
import { API_ENDPOINTS } from "../api/apiEndpoints";

export interface IncidentEventPayload {
  clientIncidentId: string;
  firebaseUid: string;
  source: "BUTTON" | "SHAKE";
  status: "active" | "resolved" | "cancelled";
  startedAt: number;
  endedAt?: number;
  location: { lat: number; lon: number; timestamp: number; accurate: boolean } | null;
  step: string;
  stepData?: Record<string, unknown>;
  occurredAt: number;
}

export interface IncidentSummaryDto {
  id: string;
  clientIncidentId: string;
  source: string;
  status: string;
  startedAt: string;
  endedAt?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

/**
 * Fire-and-forget from the caller's perspective (see sosOrchestratorService.ts's
 * "best-effort, non-blocking" pipeline philosophy) — this function itself does
 * NOT swallow errors, so callers can log/ignore them explicitly.
 */
export async function syncIncidentEvent(payload: IncidentEventPayload): Promise<void> {
  await apiClient.post(API_ENDPOINTS.EMERGENCY_INCIDENTS_SYNC, payload);
}

/**
 * Never throws — returns an empty array on any failure so History screen
 * reconciliation can always fall back to local-only data.
 */
export async function fetchIncidentHistory(firebaseUid: string): Promise<IncidentSummaryDto[]> {
  try {
    const response = await apiClient.get(API_ENDPOINTS.EMERGENCY_INCIDENTS_HISTORY, {
      params: { firebaseUid },
    });
    return response.data?.data ?? [];
  } catch {
    return [];
  }
}
