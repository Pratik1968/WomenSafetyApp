import { API_BASE_URL } from "../api/config";
import { getAuthHeader } from "./firebaseConfig";

export type ReportType =
  | "HARASSMENT"
  | "THEFT"
  | "ASSAULT"
  | "STALKING"
  | "SUSPICIOUS_PERSON"
  | "UNSAFE_LOCATION";

export interface ReportMediaAttachment {
  uri: string;
  type: string; // mime type, e.g. "image/jpeg" or "video/mp4"
  name: string;
}

export interface ReportMedia {
  url: string;
  type: "PHOTO" | "VIDEO";
}

export interface IncidentReport {
  id: string;
  user_id?: string;
  report_type: ReportType;
  description?: string | null;
  latitude: number;
  longitude: number;
  address?: string | null;
  media: ReportMedia[];
  status: string;
  created_at?: string | null;
}

export interface SubmitReportPayload {
  reportType: ReportType;
  latitude: number;
  longitude: number;
  description?: string;
  address?: string;
  mediaFiles?: ReportMediaAttachment[];
}

/**
 * Submits a crowd-sourced incident report, uploading any attached photos/videos.
 * Uses multipart/form-data since the backend accepts real file uploads.
 */
export async function submitIncidentReport(payload: SubmitReportPayload): Promise<IncidentReport> {
  const form = new FormData();
  form.append("report_type", payload.reportType);
  form.append("latitude", String(payload.latitude));
  form.append("longitude", String(payload.longitude));
  if (payload.description) form.append("description", payload.description);
  if (payload.address) form.append("address", payload.address);

  for (const file of payload.mediaFiles ?? []) {
    // React Native's fetch/FormData accepts this {uri, name, type} shape for file parts.
    form.append("files", { uri: file.uri, name: file.name, type: file.type } as unknown as Blob);
  }

  const response = await fetch(`${API_BASE_URL}/reports`, {
    method: "POST",
    headers: await getAuthHeader(),
    body: form,
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Failed to submit report (${response.status}): ${body}`);
  }
  return await response.json();
}

/** Community feed of nearby reports. Reporter identity is never included by the backend. */
export async function fetchNearbyReports(
  latitude: number,
  longitude: number,
  radiusKm = 5
): Promise<IncidentReport[]> {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    radius_km: String(radiusKm),
  });
  const response = await fetch(`${API_BASE_URL}/reports?${params.toString()}`, {
    headers: await getAuthHeader(),
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch nearby reports (${response.status})`);
  }
  return await response.json();
}

/** The current user's own submitted reports, with full (non-anonymized) detail. */
export async function fetchMyReports(): Promise<IncidentReport[]> {
  const response = await fetch(`${API_BASE_URL}/reports/me`, {
    headers: await getAuthHeader(),
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch your reports (${response.status})`);
  }
  return await response.json();
}
