// Module #12 data access — talks to the `incident-report-service` edge function.
import { callFn } from "./functions";
import { ensureSession, supabase, supabaseAnonKey, supabaseUrl } from "./supabase";

export type ReportType = "harassment" | "theft" | "assault" | "stalking" | "suspicious_person" | "unsafe_location";

export interface ReportMedia {
  url: string;
  type: "photo" | "video";
}

export interface IncidentReport {
  id: string;
  user_id?: string;
  report_type: ReportType;
  description: string | null;
  lat: number;
  lng: number;
  address: string | null;
  media: ReportMedia[];
  status: "pending" | "reviewed" | "resolved";
  created_at: string;
}

export interface ReportMediaFile {
  uri: string;
  name: string;
  mimeType: string;
}

export interface CreateReportInput {
  reportType: ReportType;
  lat: number;
  lng: number;
  description?: string;
  address?: string;
  files?: ReportMediaFile[];
}

/**
 * Submits a crowd-sourced incident report, uploading any attached photos/videos.
 * Sent as multipart/form-data via a raw `fetch` straight to the functions gateway — the
 * `callFn`/functions-js wrapper JSON-stringifies non-FormData bodies, so this one call bypasses
 * it (same as the storage service's signed-upload flow bypasses it for binary bytes). The
 * function itself hands each file off to `storage`'s POST /media rather than uploading inline.
 */
export async function submitIncidentReport(input: CreateReportInput): Promise<IncidentReport> {
  await ensureSession();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Not signed in");

  const form = new FormData();
  form.append("report_type", input.reportType);
  form.append("latitude", String(input.lat));
  form.append("longitude", String(input.lng));
  if (input.description) form.append("description", input.description);
  if (input.address) form.append("address", input.address);
  for (const file of input.files ?? []) {
    // React Native's fetch/FormData accepts this {uri, name, type} shape for file parts.
    form.append("files", { uri: file.uri, name: file.name, type: file.mimeType } as unknown as Blob);
  }

  const res = await fetch(`${supabaseUrl}/functions/v1/incident-report-service/reports`, {
    method: "POST",
    headers: { Authorization: `Bearer ${session.access_token}`, apikey: supabaseAnonKey },
    body: form,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error ?? `Failed to submit report (${res.status})`);
  return body.report as IncidentReport;
}

/** Community feed of nearby reports. Reporter identity is never included by the backend. */
export function fetchNearbyReports(lat: number, lng: number, radiusKm = 5): Promise<IncidentReport[]> {
  const qs = new URLSearchParams({ lat: String(lat), lng: String(lng), radius_km: String(radiusKm) });
  return callFn<{ reports: IncidentReport[] }>(`incident-report-service/reports?${qs.toString()}`).then((r) => r.reports);
}

/** The current user's own submitted reports, with full (non-anonymized) detail. */
export function fetchMyReports(): Promise<IncidentReport[]> {
  return callFn<{ reports: IncidentReport[] }>(`incident-report-service/reports/me`).then((r) => r.reports);
}
