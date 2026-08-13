/**
 * Module 18: AI Behavior Analysis
 *
 * Pure, testable signal engine for detecting suspicious movement patterns
 * (sudden stop, prolonged inactivity, night travel) plus a best-effort
 * current-zone risk lookup (Module 11's crime_hotspots table). Called from
 * sosOrchestratorService.ts's live-location watcher during an active SOS —
 * see docs/superpowers/specs/2026-08-13-module18-behavior-analysis-design.md
 * for the full design and rationale.
 */

import { isSupabaseConfigured, supabase, ensureSession } from "../data/supabase";

export interface BehaviorPoint {
  lat: number;
  lon: number;
  timestampMs: number;
}

export interface MovementSignals {
  suddenStop: boolean;
  prolongedInactivity: boolean;
  nightTravel: boolean;
}

export type ZoneRisk = "low" | "moderate" | "high" | "hotspot" | null;

export interface BehaviorAlert {
  eventType: "AI_WARNING" | "AI_RISK_DETECTED";
  title: string;
  detail: string;
}

const BUFFER_SIZE = 5;
const SUDDEN_STOP_PREV_SPEED_MPS = 1.2;
const SUDDEN_STOP_CURR_SPEED_MPS = 0.3;
const INACTIVITY_MAX_SPREAD_M = 15;
const NIGHT_START_HOUR = 21;
const NIGHT_END_HOUR = 5;
const ZONE_RISK_RADIUS_KM = 2;

let buffer: BehaviorPoint[] = [];

export function pushLocation(point: BehaviorPoint): void {
  buffer.push(point);
  if (buffer.length > BUFFER_SIZE) {
    buffer = buffer.slice(buffer.length - BUFFER_SIZE);
  }
}

export function reset(): void {
  buffer = [];
}

export function getBuffer(): BehaviorPoint[] {
  return [...buffer];
}

function haversineMeters(a: BehaviorPoint, b: BehaviorPoint): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function derivedSpeedMps(a: BehaviorPoint, b: BehaviorPoint): number {
  const distanceM = haversineMeters(a, b);
  const dtS = Math.max((b.timestampMs - a.timestampMs) / 1000, 1);
  return distanceM / dtS;
}

function isNightHour(hour: number): boolean {
  return hour >= NIGHT_START_HOUR || hour < NIGHT_END_HOUR;
}

export function computeMovementSignals(pointBuffer: BehaviorPoint[], nowMs: number): MovementSignals {
  const nightTravel = isNightHour(new Date(nowMs).getHours());

  let suddenStop = false;
  if (pointBuffer.length >= 3) {
    const [p1, p2, p3] = pointBuffer.slice(-3);
    const prevSpeed = derivedSpeedMps(p1, p2);
    const currSpeed = derivedSpeedMps(p2, p3);
    suddenStop = prevSpeed >= SUDDEN_STOP_PREV_SPEED_MPS && currSpeed <= SUDDEN_STOP_CURR_SPEED_MPS;
  }

  let prolongedInactivity = false;
  if (pointBuffer.length >= BUFFER_SIZE) {
    let maxSpread = 0;
    for (let i = 0; i < pointBuffer.length; i++) {
      for (let j = i + 1; j < pointBuffer.length; j++) {
        maxSpread = Math.max(maxSpread, haversineMeters(pointBuffer[i], pointBuffer[j]));
      }
    }
    prolongedInactivity = maxSpread < INACTIVITY_MAX_SPREAD_M;
  }

  return { suddenStop, prolongedInactivity, nightTravel };
}

const RISK_RANK: Record<string, number> = { low: 0, moderate: 1, high: 2, hotspot: 3 };

export async function lookupZoneRisk(lat: number, lon: number): Promise<ZoneRisk> {
  if (!isSupabaseConfigured) return null;

  try {
    await ensureSession();

    const latDeltaDeg = ZONE_RISK_RADIUS_KM / 111;
    const lonDeltaDeg = ZONE_RISK_RADIUS_KM / Math.max(111 * Math.cos((lat * Math.PI) / 180), 1e-6);

    const { data, error } = await supabase
      .from("crime_hotspots")
      .select("lat, lng, risk_level")
      .gte("lat", lat - latDeltaDeg)
      .lte("lat", lat + latDeltaDeg)
      .gte("lng", lon - lonDeltaDeg)
      .lte("lng", lon + lonDeltaDeg);

    if (error || !data || data.length === 0) return null;

    const here: BehaviorPoint = { lat, lon, timestampMs: 0 };
    let best: ZoneRisk = null;
    let bestRank = -1;

    for (const row of data as Array<{ lat: number; lng: number; risk_level: string }>) {
      if (typeof row.lat !== "number" || typeof row.lng !== "number") continue;
      const distanceKm = haversineMeters(here, { lat: row.lat, lon: row.lng, timestampMs: 0 }) / 1000;
      if (distanceKm > ZONE_RISK_RADIUS_KM) continue;

      const rank = RISK_RANK[row.risk_level] ?? -1;
      if (rank > bestRank) {
        bestRank = rank;
        best = row.risk_level as ZoneRisk;
      }
    }

    return best;
  } catch {
    return null;
  }
}

function buildAlert(signals: MovementSignals, zoneRisk: ZoneRisk): BehaviorAlert | null {
  const reasons: string[] = [];
  if (signals.suddenStop) reasons.push("Sudden stop in movement pattern");
  if (signals.prolongedInactivity) reasons.push("No significant movement for an extended period");
  if (signals.nightTravel) reasons.push("Travelling during late-night hours");

  if (reasons.length === 0) return null;

  const highZone = zoneRisk === "high" || zoneRisk === "hotspot";
  const eventType: BehaviorAlert["eventType"] =
    reasons.length >= 2 || highZone ? "AI_RISK_DETECTED" : "AI_WARNING";

  let detail = `${reasons.join("; ")}.`;
  if (highZone) detail += ` Current area risk level: ${zoneRisk}.`;

  return {
    eventType,
    title: eventType === "AI_RISK_DETECTED" ? "AI Threat Detected" : "AI Pre-Warning Triggered",
    detail,
  };
}

export async function evaluate(point: BehaviorPoint): Promise<BehaviorAlert | null> {
  pushLocation(point);
  const signals = computeMovementSignals(getBuffer(), point.timestampMs);
  const zoneRisk = await lookupZoneRisk(point.lat, point.lon).catch(() => null);
  return buildAlert(signals, zoneRisk);
}
