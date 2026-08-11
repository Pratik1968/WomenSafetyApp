// Incident data access — talks to the `incident-report-service` edge function.
import { callFn } from "./functions";
import type { Incident, IncidentType } from "./models";

export interface CreateIncidentInput {
  type: IncidentType;
  address?: string;
  severity?: number;
  lat?: number;
  lng?: number;
}

export function createIncident(input: CreateIncidentInput): Promise<Incident> {
  return callFn<{ incident: Incident }>(`incident-report-service/incidents`, { method: "POST", body: input }).then((r) => r.incident);
}

export function listIncidents(): Promise<Incident[]> {
  return callFn<{ incidents: Incident[] }>(`incident-report-service/incidents`).then((r) => r.incidents);
}
