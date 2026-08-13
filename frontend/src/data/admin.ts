// Module #20 data access — talks to the `user-service` edge function (admin-only).
import { callFn } from "./functions";
import type { AdminOverview, CrimeHotspot, HealthMetric, IncidentAnalytics, Profile } from "./models";

export function getOverview(): Promise<AdminOverview> {
  return callFn<{ overview: AdminOverview }>(`user-service/admin/overview`).then((r) => r.overview);
}

export function listUsers(params?: { q?: string; limit?: number; offset?: number }): Promise<Profile[]> {
  const qs = new URLSearchParams();
  if (params?.q) qs.set("q", params.q);
  if (params?.limit != null) qs.set("limit", String(params.limit));
  if (params?.offset != null) qs.set("offset", String(params.offset));
  const q = qs.toString();
  return callFn<{ users: Profile[] }>(`user-service/admin/users${q ? `?${q}` : ""}`).then((r) => r.users);
}

export function updateUser(id: string, patch: { status?: string; is_admin?: boolean }): Promise<Profile> {
  return callFn<{ user: Profile }>(`user-service/admin/users/${id}`, { method: "PATCH", body: patch }).then((r) => r.user);
}

export function getIncidentAnalytics(): Promise<IncidentAnalytics> {
  return callFn<IncidentAnalytics>(`user-service/admin/incidents/analytics`);
}

export function getHotspots(): Promise<CrimeHotspot[]> {
  return callFn<{ hotspots: CrimeHotspot[] }>(`user-service/admin/hotspots`).then((r) => r.hotspots);
}

export function getHealth(): Promise<HealthMetric[]> {
  return callFn<{ health: HealthMetric[] }>(`user-service/admin/health`).then((r) => r.health);
}
