/**
 * Module 19 — Incident Timeline Service
 *
 * Handles fetching and logging timeline events. Connects to Supabase Edge Function
 * (`timeline-service` / `get-incident-timeline`) or direct Supabase client, with automatic
 * fallback to mock data when unconfigured or offline.
 */

import { callFn } from "./functions";
import { isSupabaseConfigured, supabase, ensureSession } from "./supabase";
import { IncidentEventPayload, IncidentEventRecord } from "./incidentEvents";
import { getMockTimelineEvents } from "./mockTimeline";

export async function fetchIncidentTimeline(incidentId: string): Promise<IncidentEventRecord[]> {
  if (!isSupabaseConfigured) {
    console.log("[timelineService] Supabase unconfigured — returning mock timeline data.");
    return getMockTimelineEvents(incidentId);
  }

  try {
    // 1. Try via Edge Function (get-incident-timeline / timeline-service)
    const res = await callFn<{ events?: IncidentEventRecord[] }>(`timeline-service/timeline?incident_id=${incidentId}`).catch(() => null);
    if (res?.events) {
      return res.events;
    }

    // 2. Fall back to direct Supabase database query (protected by RLS)
    await ensureSession();
    const { data, error } = await supabase
      .from("incident_timeline")
      .select("*")
      .eq("incident_id", incidentId)
      .order("created_at", { ascending: true });

    if (!error && data && data.length > 0) {
      return data as IncidentEventRecord[];
    }

    // 3. Fall back to mock timeline if no rows returned or on error
    return getMockTimelineEvents(incidentId);
  } catch (err) {
    console.warn("[timelineService] Failed to fetch timeline, using mock fallback:", err);
    return getMockTimelineEvents(incidentId);
  }
}

/**
 * Log a new timeline event (integration point for Modules 3, 4, 6, 7, 18).
 * Fire-and-forget; never throws so caller modules are never blocked.
 */
export async function logIncidentEvent(payload: IncidentEventPayload): Promise<void> {
  if (!isSupabaseConfigured) return;

  try {
    await ensureSession();
    await supabase.from("incident_timeline").insert({
      incident_id: payload.incident_id,
      event_type: payload.event_type,
      title: payload.title,
      description: payload.description ?? null,
      metadata: payload.metadata ?? {},
      created_at: payload.timestamp ?? new Date().toISOString(),
    });
  } catch (err) {
    console.warn("[timelineService] Best-effort timeline event log failed:", err);
  }
}
