// Module #17 data access — talks to the `emergency-service` edge function.
import * as FileSystem from "expo-file-system/legacy";
import * as Crypto from "expo-crypto";
import { decode } from "base64-arraybuffer";
import { callFn } from "./functions";
import { supabase } from "./supabase";
import type { Evidence, EvidenceAccessLog, EvidenceType, SecureRetrieval } from "./models";

export function listEvidence(params?: { type?: EvidenceType; incidentId?: string }): Promise<Evidence[]> {
  const qs = new URLSearchParams();
  if (params?.type) qs.set("type", params.type);
  if (params?.incidentId) qs.set("incident_id", params.incidentId);
  const q = qs.toString();
  return callFn<{ evidence: Evidence[] }>(`emergency-service/evidence${q ? `?${q}` : ""}`).then((r) => r.evidence);
}

/** Secure retrieval — returns the row plus a short-lived signed URL (server logs the access). */
export function getEvidence(id: string): Promise<SecureRetrieval> {
  return callFn<SecureRetrieval>(`emergency-service/evidence/${id}`);
}

export function getAccessLog(id: string): Promise<EvidenceAccessLog[]> {
  return callFn<{ access_log: EvidenceAccessLog[] }>(`emergency-service/evidence/${id}/access-log`).then((r) => r.access_log);
}

export function requestUploadUrl(input: {
  file_name: string;
  type: EvidenceType;
  mime_type?: string;
  incident_id?: string;
}): Promise<{ evidence_id: string; path: string; token: string; signedUrl: string }> {
  return callFn(`emergency-service/evidence/upload-url`, { method: "POST", body: input });
}

export function finalizeEvidence(input: {
  evidence_id: string;
  size_bytes: number;
  duration_seconds?: number;
  checksum_sha256?: string;
  captured_at?: string;
  tamper_seal?: string;
}): Promise<Evidence> {
  return callFn<{ evidence: Evidence }>(`emergency-service/evidence`, { method: "POST", body: input }).then((r) => r.evidence);
}

export function deleteEvidence(id: string): Promise<void> {
  return callFn(`emergency-service/evidence/${id}`, { method: "DELETE" }).then(() => undefined);
}

/**
 * Full capture flow: pick a local file, then upload + register it as evidence.
 *   1. ask the server for a signed upload URL (also creates a pending row)
 *   2. read the file bytes and upload them straight to Storage via the signed URL
 *   3. compute a SHA-256 checksum + tamper seal and finalize the row
 * Optionally attaches the evidence to an incident.
 */
export async function uploadEvidenceFile(input: {
  uri: string;
  name: string;
  mimeType?: string;
  type: EvidenceType;
  incidentId?: string;
  durationSeconds?: number;
}): Promise<Evidence> {
  const { evidence_id, path, token } = await requestUploadUrl({
    file_name: input.name,
    type: input.type,
    mime_type: input.mimeType,
    incident_id: input.incidentId,
  });

  const base64 = await FileSystem.readAsStringAsync(input.uri, { encoding: FileSystem.EncodingType.Base64 });
  const bytes = decode(base64);

  const { error: upErr } = await supabase.storage
    .from("evidence")
    .uploadToSignedUrl(path, token, bytes, { contentType: input.mimeType ?? "application/octet-stream" });
  if (upErr) throw new Error(upErr.message);

  const checksum = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, base64);
  const tamperSeal = `seal:${checksum.slice(0, 8)}…${checksum.slice(-2)}`;

  return finalizeEvidence({
    evidence_id,
    size_bytes: bytes.byteLength,
    duration_seconds: input.durationSeconds,
    checksum_sha256: checksum,
    tamper_seal: tamperSeal,
    captured_at: new Date().toISOString(),
  });
}
