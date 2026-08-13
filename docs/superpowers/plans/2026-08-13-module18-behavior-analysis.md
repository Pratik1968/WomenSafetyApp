# Module 18: AI Behavior Analysis Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Detect suspicious movement behavior (sudden stops, prolonged inactivity, night travel,
high-risk-zone presence) during an active SOS incident and surface it as a real, visible alert in
the app's existing incident timeline — no new backend service, no new database table.

**Architecture:** A new pure/testable signal-engine module
(`frontend/src/services/behaviorAnalysisService.ts`) is called from the live-location callback
that already exists inside `sosOrchestratorService.ts`. It keeps a short in-memory ring buffer of
recent GPS points, computes movement signals synchronously, does one best-effort Supabase read
against the existing `crime_hotspots` table (Module 11) for zone risk, and returns an alert
decision. The orchestrator appends that decision through the exact same `appendLog` mechanism
already used for every other SOS pipeline step, so it flows through existing, already-tested
sync/storage/render paths untouched. See full rationale (3 approaches considered) in
`docs/superpowers/specs/2026-08-13-module18-behavior-analysis-design.md`.

**Tech Stack:** React Native / Expo, TypeScript, Jest + `@testing-library/react-native`, Supabase
JS client (`@supabase/supabase-js`), AsyncStorage.

## Global Constraints

- TDD required: write the failing test first, confirm it fails, then implement, per this repo's
  established convention (see `.superpowers/sdd/2026-08-10-incident-timeline-module19/progress.md`
  for the pattern this plan follows).
- No `git commit` or `git push` at any point — stage with `git add` only. The owner runs all
  commits themselves (standing project rule).
- Match existing code style in `frontend/src/services/`: plain exported functions with
  module-level `let` state (as in `sosOrchestratorService.ts` / `incidentSyncService.ts`), **not**
  a class — this is a deliberate deviation from the `LocationService`/`JourneyService` singleton
  class style used elsewhere, chosen to match the two files this module integrates with most
  directly.
- `SOSLocation` (existing type in `sosOrchestratorService.ts`) has only `{lat, lon, timestamp,
  accurate}` — no speed/heading field. All movement math must be derived from position deltas
  across the ring buffer, not a device-reported speed.
- Every new/changed function must degrade gracefully on failure (network down, Supabase
  unconfigured) — never throw out of `evaluate()`, matching the "best-effort, never block the SOS
  pipeline" philosophy already documented in `syncStepToBackend`'s doc comment in
  `sosOrchestratorService.ts`.
- Numeric thresholds (from the design doc, do not change without updating both docs):
  ring buffer size `5`; sudden-stop previous-speed `≥ 1.2` m/s and next-speed `≤ 0.3` m/s;
  prolonged-inactivity max pairwise spread `< 15` m over a full 5-point buffer; night travel
  `hour ∈ [21:00, 05:00)`; zone-risk lookup radius `2` km.

---

## File Structure

| File | Responsibility |
|---|---|
| `frontend/src/services/behaviorAnalysisService.ts` (new) | Pure signal engine: ring buffer, movement-signal math, zone-risk lookup, alert decision. Zero side effects beyond one Supabase read. |
| `frontend/src/services/behaviorAnalysisService.test.ts` (new) | Unit tests for all of the above. |
| `frontend/src/services/sosOrchestratorService.ts` (modify) | Call `behaviorAnalysisService` from the existing live-location watcher; reset its buffer on `triggerSOS`/`cancelSOS`. |
| `frontend/src/services/sosOrchestratorService.test.ts` (modify) | Add coverage for the new AI-alert step and buffer reset calls. |
| `frontend/src/screens/HistoryScreens.tsx` (modify) | Add `AI_WARNING`/`AI_RISK_DETECTED` entries to the existing `STEP_LABELS` map so alerts render with a friendly title instead of the raw step name. |
| `frontend/src/screens/HistoryScreens.test.tsx` (modify) | Add a render-level test proving the friendly label appears in `IncidentDetailScreen`. |

---

### Task 1: Ring buffer + pure movement-signal math

**Files:**
- Create: `frontend/src/services/behaviorAnalysisService.ts`
- Test: `frontend/src/services/behaviorAnalysisService.test.ts`

**Interfaces:**
- Produces: `export interface BehaviorPoint { lat: number; lon: number; timestampMs: number }`,
  `export interface MovementSignals { suddenStop: boolean; prolongedInactivity: boolean;
  nightTravel: boolean }`, `export function pushLocation(point: BehaviorPoint): void`,
  `export function reset(): void`, `export function getBuffer(): BehaviorPoint[]`,
  `export function computeMovementSignals(buffer: BehaviorPoint[], nowMs: number):
  MovementSignals`.

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/services/behaviorAnalysisService.test.ts`:

```typescript
import {
  pushLocation,
  reset,
  getBuffer,
  computeMovementSignals,
  BehaviorPoint,
} from "./behaviorAnalysisService";

describe("behaviorAnalysisService — ring buffer", () => {
  beforeEach(() => {
    reset();
  });

  it("starts empty", () => {
    expect(getBuffer()).toEqual([]);
  });

  it("accumulates pushed points in order", () => {
    pushLocation({ lat: 1, lon: 1, timestampMs: 1000 });
    pushLocation({ lat: 2, lon: 2, timestampMs: 2000 });

    expect(getBuffer()).toEqual([
      { lat: 1, lon: 1, timestampMs: 1000 },
      { lat: 2, lon: 2, timestampMs: 2000 },
    ]);
  });

  it("caps the buffer at the last 5 points", () => {
    for (let i = 0; i < 8; i++) {
      pushLocation({ lat: i, lon: i, timestampMs: i * 1000 });
    }

    const buffer = getBuffer();
    expect(buffer).toHaveLength(5);
    expect(buffer[0]).toEqual({ lat: 3, lon: 3, timestampMs: 3000 });
    expect(buffer[4]).toEqual({ lat: 7, lon: 7, timestampMs: 7000 });
  });

  it("reset() empties the buffer", () => {
    pushLocation({ lat: 1, lon: 1, timestampMs: 1000 });
    reset();
    expect(getBuffer()).toEqual([]);
  });
});

describe("behaviorAnalysisService — computeMovementSignals: sudden stop", () => {
  it("flags a sudden stop when speed drops sharply between the last two intervals", () => {
    // ~28m in 10s ≈ 2.8 m/s (brisk) then ~1m in 10s ≈ 0.1 m/s (stopped)
    const buffer: BehaviorPoint[] = [
      { lat: 12.9716, lon: 77.5946, timestampMs: 0 },
      { lat: 12.97185, lon: 77.5946, timestampMs: 10_000 },
      { lat: 12.971859, lon: 77.5946, timestampMs: 20_000 },
    ];

    const signals = computeMovementSignals(buffer, 20_000 + 12 * 3600 * 1000); // noon, not night
    expect(signals.suddenStop).toBe(true);
  });

  it("does not flag a sudden stop for steady walking pace", () => {
    const buffer: BehaviorPoint[] = [
      { lat: 12.9716, lon: 77.5946, timestampMs: 0 },
      { lat: 12.97185, lon: 77.5946, timestampMs: 10_000 },
      { lat: 12.972, lon: 77.5946, timestampMs: 20_000 },
    ];

    const signals = computeMovementSignals(buffer, 20_000 + 12 * 3600 * 1000);
    expect(signals.suddenStop).toBe(false);
  });

  it("does not flag a sudden stop with fewer than 3 points", () => {
    const buffer: BehaviorPoint[] = [{ lat: 12.9716, lon: 77.5946, timestampMs: 0 }];
    const signals = computeMovementSignals(buffer, 12 * 3600 * 1000);
    expect(signals.suddenStop).toBe(false);
  });
});

describe("behaviorAnalysisService — computeMovementSignals: prolonged inactivity", () => {
  it("flags prolonged inactivity when a full 5-point buffer barely moves", () => {
    const buffer: BehaviorPoint[] = [
      { lat: 12.97160, lon: 77.59460, timestampMs: 0 },
      { lat: 12.97161, lon: 77.59460, timestampMs: 10_000 },
      { lat: 12.97160, lon: 77.59461, timestampMs: 20_000 },
      { lat: 12.97161, lon: 77.59461, timestampMs: 30_000 },
      { lat: 12.97160, lon: 77.59460, timestampMs: 40_000 },
    ];

    const signals = computeMovementSignals(buffer, 40_000 + 12 * 3600 * 1000);
    expect(signals.prolongedInactivity).toBe(true);
  });

  it("does not flag prolonged inactivity with fewer than 5 points", () => {
    const buffer: BehaviorPoint[] = [
      { lat: 12.9716, lon: 77.5946, timestampMs: 0 },
      { lat: 12.9716, lon: 77.5946, timestampMs: 10_000 },
    ];
    const signals = computeMovementSignals(buffer, 10_000 + 12 * 3600 * 1000);
    expect(signals.prolongedInactivity).toBe(false);
  });

  it("does not flag prolonged inactivity when the buffer actually spans real distance", () => {
    const buffer: BehaviorPoint[] = [
      { lat: 12.9716, lon: 77.5946, timestampMs: 0 },
      { lat: 12.9720, lon: 77.5946, timestampMs: 10_000 },
      { lat: 12.9724, lon: 77.5946, timestampMs: 20_000 },
      { lat: 12.9728, lon: 77.5946, timestampMs: 30_000 },
      { lat: 12.9732, lon: 77.5946, timestampMs: 40_000 },
    ];
    const signals = computeMovementSignals(buffer, 40_000 + 12 * 3600 * 1000);
    expect(signals.prolongedInactivity).toBe(false);
  });
});

describe("behaviorAnalysisService — computeMovementSignals: night travel", () => {
  it("flags night travel at 23:00 local time", () => {
    const now = new Date();
    now.setHours(23, 0, 0, 0);
    const signals = computeMovementSignals([], now.getTime());
    expect(signals.nightTravel).toBe(true);
  });

  it("flags night travel at 03:00 local time", () => {
    const now = new Date();
    now.setHours(3, 0, 0, 0);
    const signals = computeMovementSignals([], now.getTime());
    expect(signals.nightTravel).toBe(true);
  });

  it("does not flag night travel at 14:00 local time", () => {
    const now = new Date();
    now.setHours(14, 0, 0, 0);
    const signals = computeMovementSignals([], now.getTime());
    expect(signals.nightTravel).toBe(false);
  });

  it("does not flag night travel exactly at 05:00 local time (boundary)", () => {
    const now = new Date();
    now.setHours(5, 0, 0, 0);
    const signals = computeMovementSignals([], now.getTime());
    expect(signals.nightTravel).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npx jest behaviorAnalysisService.test.ts --verbose`
Expected: FAIL — `Cannot find module './behaviorAnalysisService'`

- [ ] **Step 3: Write the implementation**

Create `frontend/src/services/behaviorAnalysisService.ts`:

```typescript
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npx jest behaviorAnalysisService.test.ts --verbose`
Expected: PASS (all cases in Step 1)

- [ ] **Step 5: Stage (no commit)**

```bash
git add frontend/src/services/behaviorAnalysisService.ts frontend/src/services/behaviorAnalysisService.test.ts
```

---

### Task 2: Zone-risk lookup (`crime_hotspots`)

**Files:**
- Modify: `frontend/src/services/behaviorAnalysisService.ts`
- Modify: `frontend/src/services/behaviorAnalysisService.test.ts`

**Interfaces:**
- Consumes: `isSupabaseConfigured: boolean`, `supabase: SupabaseClient`, `ensureSession(): Promise<void>` from `../data/supabase` (already used identically by `frontend/src/data/timelineService.ts`).
- Produces: `export async function lookupZoneRisk(lat: number, lon: number): Promise<ZoneRisk>`.

- [ ] **Step 1: Write the failing tests**

Add to the top of `frontend/src/services/behaviorAnalysisService.test.ts`, **before** the existing imports (jest.mock calls must be hoisted to the top of the file):

```typescript
jest.mock("../data/supabase", () => ({
  isSupabaseConfigured: true,
  ensureSession: jest.fn().mockResolvedValue(undefined),
  supabase: {
    from: jest.fn(),
  },
}));
```

Then add this describe block to the end of the file:

```typescript
import { isSupabaseConfigured, supabase } from "../data/supabase";
import { lookupZoneRisk } from "./behaviorAnalysisService";

const mockedFrom = supabase.from as jest.Mock;

function mockHotspotQuery(rows: Array<{ lat: number; lng: number; risk_level: string }>) {
  const chain = {
    select: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockResolvedValue({ data: rows, error: null }),
  };
  mockedFrom.mockReturnValue(chain);
  return chain;
}

describe("behaviorAnalysisService — lookupZoneRisk", () => {
  beforeEach(() => {
    mockedFrom.mockReset();
  });

  it("returns null when Supabase is not configured", async () => {
    (isSupabaseConfigured as unknown as boolean) = false;
    const risk = await lookupZoneRisk(12.9716, 77.5946);
    expect(risk).toBeNull();
    (isSupabaseConfigured as unknown as boolean) = true;
  });

  it("returns null when no hotspots are nearby", async () => {
    mockHotspotQuery([]);
    const risk = await lookupZoneRisk(12.9716, 77.5946);
    expect(risk).toBeNull();
  });

  it("returns the risk_level of a nearby hotspot within 2km", async () => {
    mockHotspotQuery([{ lat: 12.9716, lng: 77.5946, risk_level: "high" }]);
    const risk = await lookupZoneRisk(12.9716, 77.5946);
    expect(risk).toBe("high");
  });

  it("ignores a hotspot row further than 2km away even if the bounding box matched", async () => {
    // ~0.03 deg lat ≈ 3.3km — inside the bounding box but outside the 2km radius filter
    mockHotspotQuery([{ lat: 12.9716 + 0.03, lng: 77.5946, risk_level: "hotspot" }]);
    const risk = await lookupZoneRisk(12.9716, 77.5946);
    expect(risk).toBeNull();
  });

  it("returns the highest risk_level when multiple hotspots are nearby", async () => {
    mockHotspotQuery([
      { lat: 12.9716, lng: 77.5946, risk_level: "low" },
      { lat: 12.9717, lng: 77.5947, risk_level: "hotspot" },
      { lat: 12.9715, lng: 77.5945, risk_level: "moderate" },
    ]);
    const risk = await lookupZoneRisk(12.9716, 77.5946);
    expect(risk).toBe("hotspot");
  });

  it("returns null (never throws) when the Supabase query errors", async () => {
    mockedFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockResolvedValue({ data: null, error: { message: "boom" } }),
    });
    const risk = await lookupZoneRisk(12.9716, 77.5946);
    expect(risk).toBeNull();
  });

  it("returns null (never throws) when the Supabase client rejects", async () => {
    mockedFrom.mockImplementation(() => {
      throw new Error("network down");
    });
    await expect(lookupZoneRisk(12.9716, 77.5946)).resolves.toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npx jest behaviorAnalysisService.test.ts --verbose`
Expected: FAIL — `lookupZoneRisk is not a function` (existing buffer/signal tests from Task 1 still pass)

- [ ] **Step 3: Write the implementation**

Append to `frontend/src/services/behaviorAnalysisService.ts`:

```typescript
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npx jest behaviorAnalysisService.test.ts --verbose`
Expected: PASS (all cases from Task 1 and Task 2)

- [ ] **Step 5: Stage (no commit)**

```bash
git add frontend/src/services/behaviorAnalysisService.ts frontend/src/services/behaviorAnalysisService.test.ts
```

---

### Task 3: Alert decision (`evaluate`)

**Files:**
- Modify: `frontend/src/services/behaviorAnalysisService.ts`
- Modify: `frontend/src/services/behaviorAnalysisService.test.ts`

**Interfaces:**
- Consumes: `computeMovementSignals`, `lookupZoneRisk`, `pushLocation` (all from Tasks 1–2, same file).
- Produces: `export async function evaluate(point: BehaviorPoint): Promise<BehaviorAlert | null>` — titles must be exactly `"AI Threat Detected"` / `"AI Pre-Warning Triggered"` to match the existing `EVENT_DISPLAY_CONFIG` titles in `frontend/src/data/incidentEvents.ts` (type-consistency requirement — do not invent different wording).

- [ ] **Step 1: Write the failing tests**

Add to the end of `frontend/src/services/behaviorAnalysisService.test.ts`:

```typescript
import { evaluate, reset as resetBuffer } from "./behaviorAnalysisService";

describe("behaviorAnalysisService — evaluate (alert decision)", () => {
  beforeEach(() => {
    resetBuffer();
    mockedFrom.mockReset();
  });

  it("returns null when no signals fire and the zone is unknown", async () => {
    mockHotspotQuery([]);
    const now = new Date();
    now.setHours(14, 0, 0, 0);

    const alert = await evaluate({ lat: 12.9716, lon: 77.5946, timestampMs: now.getTime() });
    expect(alert).toBeNull();
  });

  it("returns an AI_WARNING for exactly one signal in a non-high-risk zone", async () => {
    mockHotspotQuery([{ lat: 12.9716, lng: 77.5946, risk_level: "low" }]);
    const now = new Date();
    now.setHours(23, 0, 0, 0); // night travel only

    const alert = await evaluate({ lat: 12.9716, lon: 77.5946, timestampMs: now.getTime() });

    expect(alert).not.toBeNull();
    expect(alert!.eventType).toBe("AI_WARNING");
    expect(alert!.title).toBe("AI Pre-Warning Triggered");
    expect(alert!.detail).toContain("late-night");
  });

  it("returns AI_RISK_DETECTED when 2+ signals fire", async () => {
    mockHotspotQuery([]);
    const now = new Date();
    now.setHours(23, 0, 0, 0);
    const nowMs = now.getTime();

    // Prime the buffer with 5 stationary points ending "now" -> prolongedInactivity + nightTravel
    resetBuffer();
    for (let i = 0; i < 5; i++) {
      pushLocation({ lat: 12.9716, lon: 77.5946, timestampMs: nowMs - (4 - i) * 10_000 });
    }

    const alert = await evaluate({ lat: 12.9716, lon: 77.5946, timestampMs: nowMs });

    expect(alert).not.toBeNull();
    expect(alert!.eventType).toBe("AI_RISK_DETECTED");
    expect(alert!.title).toBe("AI Threat Detected");
    expect(alert!.detail).toContain("late-night");
    expect(alert!.detail).toContain("No significant movement");
  });

  it("returns AI_RISK_DETECTED for exactly one signal in a high-risk zone", async () => {
    mockHotspotQuery([{ lat: 12.9716, lng: 77.5946, risk_level: "hotspot" }]);
    const now = new Date();
    now.setHours(23, 0, 0, 0); // night travel only, but zone is a hotspot

    const alert = await evaluate({ lat: 12.9716, lon: 77.5946, timestampMs: now.getTime() });

    expect(alert).not.toBeNull();
    expect(alert!.eventType).toBe("AI_RISK_DETECTED");
    expect(alert!.detail).toContain("Current area risk level: hotspot");
  });

  it("pushes the evaluated point into the buffer as a side effect", async () => {
    mockHotspotQuery([]);
    resetBuffer();
    const now = new Date();
    now.setHours(14, 0, 0, 0);

    await evaluate({ lat: 1, lon: 1, timestampMs: now.getTime() });

    expect(getBuffer()).toHaveLength(1);
  });
});
```

Note: `pushLocation` and `getBuffer` are already imported at the top of the test file from Task 1 — reuse those imports rather than re-importing.

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npx jest behaviorAnalysisService.test.ts --verbose`
Expected: FAIL — `evaluate is not a function` (all Task 1/2 tests still pass)

- [ ] **Step 3: Write the implementation**

Append to `frontend/src/services/behaviorAnalysisService.ts`:

```typescript
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npx jest behaviorAnalysisService.test.ts --verbose`
Expected: PASS (all cases from Tasks 1–3)

- [ ] **Step 5: Stage (no commit)**

```bash
git add frontend/src/services/behaviorAnalysisService.ts frontend/src/services/behaviorAnalysisService.test.ts
```

---

### Task 4: Wire into `sosOrchestratorService.ts`

**Files:**
- Modify: `frontend/src/services/sosOrchestratorService.ts`
- Modify: `frontend/src/services/sosOrchestratorService.test.ts`

**Interfaces:**
- Consumes: `evaluate(point: BehaviorPoint): Promise<BehaviorAlert | null>`, `reset(): void` from `./behaviorAnalysisService` (Tasks 1–3).
- Produces: no new exports — `triggerSOS`, `cancelSOS` keep their existing signatures. Behavior change only: `AI_WARNING`/`AI_RISK_DETECTED` steps may now appear in an incident's `timeline`.

- [ ] **Step 1: Write the failing tests**

Add to the top of `frontend/src/services/sosOrchestratorService.test.ts`, alongside the existing `jest.mock` calls (before the imports):

```typescript
jest.mock("./behaviorAnalysisService", () => ({
  evaluate: jest.fn().mockResolvedValue(null),
  reset: jest.fn(),
}));
```

Add `import * as behaviorAnalysisService from "./behaviorAnalysisService";` to the existing import block, then add this describe block at the end of the file:

```typescript
describe("sosOrchestratorService — Module 18 AI behavior analysis integration", () => {
  const mockedEvaluate = behaviorAnalysisService.evaluate as jest.Mock;
  const mockedReset = behaviorAnalysisService.reset as jest.Mock;

  beforeEach(async () => {
    await AsyncStorage.clear();
    mockedSync.mockClear();
    mockedSync.mockResolvedValue(undefined);
    mockedEvaluate.mockClear();
    mockedEvaluate.mockResolvedValue(null);
    mockedReset.mockClear();
  });

  it("resets the behavior-analysis buffer when a new SOS incident starts", async () => {
    await triggerSOS("BUTTON");
    expect(mockedReset).toHaveBeenCalled();
  });

  it("resets the behavior-analysis buffer when an SOS incident ends", async () => {
    const incidentId = await triggerSOS("BUTTON");
    mockedReset.mockClear();

    await cancelSOS(incidentId, "resolved");
    expect(mockedReset).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npx jest sosOrchestratorService.test.ts --verbose`
Expected: FAIL — the two new tests fail (`mockedReset` never called); all pre-existing tests in this file still pass.

- [ ] **Step 3: Write the implementation**

In `frontend/src/services/sosOrchestratorService.ts`, add the import near the top (alongside the existing `import { syncIncidentEvent } from "./incidentSyncService";` at line 31):

```typescript
import * as behaviorAnalysisService from "./behaviorAnalysisService";
```

In `triggerSOS` (starts at line 314), add a reset call as the very first line of the function body, before `await ensureAndroidPermissions();`:

```typescript
export async function triggerSOS(source: SOSTriggerSource): Promise<string> {
  behaviorAnalysisService.reset();
  await ensureAndroidPermissions();
  // ... rest of the function unchanged
```

In `cancelSOS` (starts at line 445), add a reset call as the first line of the function body:

```typescript
export async function cancelSOS(
  incidentId: string,
  status: "resolved" | "cancelled" = "resolved"
): Promise<void> {
  behaviorAnalysisService.reset();
  // Stop live location tracking
  if (locationWatcher) {
    // ... rest of the function unchanged
```

In the `watchPositionAsync` callback inside `triggerSOS` (around lines 404–424), the existing code is:

```typescript
      async (pos) => {
        const loc: SOSLocation = {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          timestamp: pos.timestamp,
          accurate: true,
        };
        await cacheLocation(loc);
        await patchIncident(incidentId, (inc) => ({ ...inc, location: loc }));
        await appendLog(incidentId, "LOCATION_UPDATE", {
          lat: loc.lat,
          lon: loc.lon,
        });
      }
```

Replace it with (adds the behavior-analysis call after the existing `LOCATION_UPDATE` append, fire-and-forget so it never delays the location-watch callback):

```typescript
      async (pos) => {
        const loc: SOSLocation = {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          timestamp: pos.timestamp,
          accurate: true,
        };
        await cacheLocation(loc);
        await patchIncident(incidentId, (inc) => ({ ...inc, location: loc }));
        await appendLog(incidentId, "LOCATION_UPDATE", {
          lat: loc.lat,
          lon: loc.lon,
        });

        // Module 18: AI Behavior Analysis — best-effort, never blocks the
        // location watcher. See behaviorAnalysisService.ts for the signal
        // engine and docs/superpowers/specs/2026-08-13-module18-behavior-analysis-design.md
        // for the design.
        behaviorAnalysisService
          .evaluate({ lat: loc.lat, lon: loc.lon, timestampMs: loc.timestamp })
          .then((alert) => {
            if (!alert) return;
            return appendLog(incidentId, alert.eventType, { detail: alert.detail });
          })
          .catch(() => {
            // Best-effort — a failed behavior check must never affect the SOS pipeline.
          });
      }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npx jest sosOrchestratorService.test.ts --verbose`
Expected: PASS — all pre-existing tests plus the two new ones from Step 1.

- [ ] **Step 5: Stage (no commit)**

```bash
git add frontend/src/services/sosOrchestratorService.ts frontend/src/services/sosOrchestratorService.test.ts
```

---

### Task 5: Friendly labels in `HistoryScreens.tsx`

**Files:**
- Modify: `frontend/src/screens/HistoryScreens.tsx`
- Modify: `frontend/src/screens/HistoryScreens.test.tsx`

**Interfaces:**
- Consumes: `AI_WARNING`/`AI_RISK_DETECTED` step strings as produced by Task 4's `appendLog(incidentId, alert.eventType, ...)` call — these land in `SOSLogEntry.step`, read by the existing (unexported, module-local) `STEP_LABELS` map and `describeTimelineStep` function already in this file (around lines 209–252).
- Produces: no new exports — `STEP_LABELS` gains two entries; behavior change only.

- [ ] **Step 1: Write the failing test**

**Correction found during implementation:** the `jest.mock("../services/behaviorAnalysisService", ...)` call originally planned here does not work — `HistoryScreens.tsx` is imported statically at the top of this test file and already pulls in the real `behaviorAnalysisService` transitively (via `sosOrchestratorService`) before any `jest.mock` call placed inside an `it()` body ever runs; Jest's module registry has already resolved the real module by then. It's also unnecessary: the test never exercises `evaluate()` — it injects the timeline entry directly into `AsyncStorage`. Drop that dead mock call entirely.

Add to the end of `frontend/src/screens/HistoryScreens.test.tsx`, inside the existing `describe("HistoryScreens", ...)` block (after the last `it(...)`, before the closing `});`):

```typescript
  it("renders a friendly label for an AI behavior-analysis alert in the timeline", async () => {
    const { triggerSOS } = require("../services/sosOrchestratorService");
    const incidentId = await triggerSOS("BUTTON");

    // Manually append the step the way the real pipeline would once
    // behaviorAnalysisService.evaluate resolves with a decision (that resolution
    // is async and fire-and-forget in the real pipeline; append directly here to
    // keep this test deterministic rather than racing the fire-and-forget timer).
    const AsyncStorage = require("@react-native-async-storage/async-storage").default;
    const raw = await AsyncStorage.getItem("@aegis_incidents_v2");
    const incidents = JSON.parse(raw);
    const idx = incidents.findIndex((i: { id: string }) => i.id === incidentId);
    incidents[idx].timeline.push({
      step: "AI_RISK_DETECTED",
      timestamp: Date.now(),
      data: { detail: "No significant movement for an extended period." },
    });
    await AsyncStorage.setItem("@aegis_incidents_v2", JSON.stringify(incidents));

    await render(<IncidentDetailScreen incidentId={incidentId} />);

    expect(await screen.findByText("AI Threat Detected")).toBeTruthy();
  });
```

No new top-level imports needed — matches the existing inline-`require` style already used for `fireEvent` and `sosOrchestratorService` in this same file.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx jest HistoryScreens.test.tsx --verbose --forceExit`
Expected: FAIL — the new test fails because `describeTimelineStep` falls through to the raw `entry.step` string (`"AI_RISK_DETECTED"`) instead of a friendly label, so `screen.findByText("AI Threat Detected")` finds nothing. All pre-existing tests in this file still pass.

- [ ] **Step 3: Write the implementation**

In `frontend/src/screens/HistoryScreens.tsx`, the existing `STEP_LABELS` map (around line 209) is:

```typescript
const STEP_LABELS: Record<string, { title: string; tone: TimelineTone }> = {
  SOS_TRIGGERED: { title: "SOS triggered", tone: "emergency" },
  LOCATION_ACQUIRED: { title: "Location acquired", tone: "brand" },
  SMS_SENT: { title: "Contacts notified", tone: "brand" },
  SMS_SKIPPED: { title: "No contacts configured", tone: "warning" },
  CALL_PLACED: { title: "Call placed to primary contact", tone: "brand" },
  LIVE_TRACKING_STARTED: { title: "Live location tracking started", tone: "brand" },
  LIVE_TRACKING_FAILED: { title: "Live location tracking failed", tone: "warning" },
  LOCATION_UPDATE: { title: "Location updated", tone: "brand" },
  SOS_ENDED: { title: "Emergency ended", tone: "success" },
};
```

Add two entries so it becomes:

```typescript
const STEP_LABELS: Record<string, { title: string; tone: TimelineTone }> = {
  SOS_TRIGGERED: { title: "SOS triggered", tone: "emergency" },
  LOCATION_ACQUIRED: { title: "Location acquired", tone: "brand" },
  SMS_SENT: { title: "Contacts notified", tone: "brand" },
  SMS_SKIPPED: { title: "No contacts configured", tone: "warning" },
  CALL_PLACED: { title: "Call placed to primary contact", tone: "brand" },
  LIVE_TRACKING_STARTED: { title: "Live location tracking started", tone: "brand" },
  LIVE_TRACKING_FAILED: { title: "Live location tracking failed", tone: "warning" },
  LOCATION_UPDATE: { title: "Location updated", tone: "brand" },
  SOS_ENDED: { title: "Emergency ended", tone: "success" },
  AI_WARNING: { title: "AI Pre-Warning Triggered", tone: "warning" },
  AI_RISK_DETECTED: { title: "AI Threat Detected", tone: "warning" },
};
```

Then, in `describeTimelineStep` (around line 238), the existing detail-extraction `if/else if` chain only special-cases `SMS_SENT`, `LOCATION_ACQUIRED`/`LOCATION_UPDATE`, and `SOS_ENDED`. Add a case for the two new steps so their `detail` (set by Task 4's `appendLog(incidentId, alert.eventType, { detail: alert.detail })`) actually surfaces instead of being dropped:

```typescript
  const label = STEP_LABELS[entry.step] ?? { title: entry.step, tone: "brand" as const };
  let detail: string | undefined;
  if (entry.step === "SMS_SENT" && Array.isArray(entry.data?.numbers)) {
    detail = `Sent to ${(entry.data!.numbers as string[]).length} contact(s).`;
  } else if (entry.step === "LOCATION_ACQUIRED" || entry.step === "LOCATION_UPDATE") {
    const lat = entry.data?.lat;
    const lon = entry.data?.lon;
    if (typeof lat === "number" && typeof lon === "number") {
      detail = `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
    }
  } else if (entry.step === "SOS_ENDED" && typeof entry.data?.status === "string") {
    detail = `Marked as ${entry.data.status}.`;
  } else if (
    (entry.step === "AI_WARNING" || entry.step === "AI_RISK_DETECTED") &&
    typeof entry.data?.detail === "string"
  ) {
    detail = entry.data.detail;
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx jest HistoryScreens.test.tsx --verbose --forceExit`
Expected: PASS — the new test plus all pre-existing tests in this file.

- [ ] **Step 5: Stage (no commit)**

```bash
git add frontend/src/screens/HistoryScreens.tsx frontend/src/screens/HistoryScreens.test.tsx
```

---

### Task 6: Full verification + progress ledger

**Files:**
- Create: `.superpowers/sdd/2026-08-13-module18-behavior-analysis/progress.md` (ledger, matching this repo's established convention from the Module 19 run)

**Interfaces:**
- Consumes: nothing new — this task only runs and records verification of Tasks 1–5.
- Produces: nothing new — final sign-off task.

- [ ] **Step 1: Run the full targeted test suite for every file touched**

Run: `cd frontend && npx jest behaviorAnalysisService.test.ts sosOrchestratorService.test.ts HistoryScreens.test.tsx --verbose --forceExit`
Expected: PASS — every test in all three files.

- [ ] **Step 2: Type-check**

Run: `cd frontend && npx tsc --noEmit`
Expected: no new errors introduced by this change. (This repo has known pre-existing, unrelated TS errors from mid-sequence Module 19 work per `.superpowers/sdd/2026-08-10-incident-timeline-module19/progress.md` — compare the error list before/after this task's changes if any appear, and only investigate ones whose file paths match Tasks 1–5.)

- [ ] **Step 3: Run the full frontend suite once to check for regressions**

Run: `cd frontend && npx jest --forceExit`
Expected: no new failures beyond the pre-existing, documented flaky suites (`HistoryScreens.test.tsx` and `ProfileScreens.test.tsx` time out only in full-suite runs due to background network/timer contention — same known issue noted in the Module 19 ledger, not a regression from this work).

- [ ] **Step 4: Write the progress ledger**

Create `.superpowers/sdd/2026-08-13-module18-behavior-analysis/progress.md`:

```markdown
# Module 18: AI Behavior Analysis — Progress Ledger

Spec: docs/superpowers/specs/2026-08-13-module18-behavior-analysis-design.md
Plan: docs/superpowers/plans/2026-08-13-module18-behavior-analysis.md
Branch: feature/incidenttimeline (working tree, staged-only — no commits made, per standing
owner rule; owner was offline/auto-mode for this entire run).

Task 1: pushLocation/reset/getBuffer + computeMovementSignals (sudden stop, prolonged
inactivity, night travel) — implemented + staged (files: behaviorAnalysisService.ts,
behaviorAnalysisService.test.ts). [fill in: pass/fail + notes when executed]

Task 2: lookupZoneRisk against crime_hotspots — implemented + staged. [fill in]

Task 3: evaluate()/buildAlert severity decision — implemented + staged. [fill in]

Task 4: wired into sosOrchestratorService.ts's live-location watcher + reset on
triggerSOS/cancelSOS — implemented + staged (files: sosOrchestratorService.ts,
sosOrchestratorService.test.ts). [fill in]

Task 5: STEP_LABELS + describeTimelineStep detail extraction for AI_WARNING/AI_RISK_DETECTED
in HistoryScreens.tsx — implemented + staged. [fill in]

Task 6: full verification — [fill in jest/tsc results]

Resume point: all 6 tasks complete as of this write. Nothing committed — owner reviews staged
diff (`git diff --cached`) and commits when awake. Module 5 (AI Threat Detection) was deferred
per the design doc's own scope note; if picked up next, it can reuse
behaviorAnalysisService.ts's signal functions directly rather than starting fresh.
```

(The implementer executing this task should fill in each `[fill in: ...]` with the actual
pass/fail output and any findings from Steps 1–3 above, not leave the placeholder text — this
mirrors the real ledger format already used in
`.superpowers/sdd/2026-08-10-incident-timeline-module19/progress.md`.)

- [ ] **Step 5: Stage (no commit)**

```bash
git add .superpowers/sdd/2026-08-13-module18-behavior-analysis/progress.md
git status --short
```

Expected final `git status --short` output includes (among any pre-existing unrelated staged/
unstaged files from before this plan started):

```
A  .superpowers/sdd/2026-08-13-module18-behavior-analysis/progress.md
A  docs/superpowers/plans/2026-08-13-module18-behavior-analysis.md
A  docs/superpowers/specs/2026-08-13-module18-behavior-analysis-design.md
M  frontend/src/screens/HistoryScreens.tsx
M  frontend/src/screens/HistoryScreens.test.tsx
A  frontend/src/services/behaviorAnalysisService.ts
A  frontend/src/services/behaviorAnalysisService.test.ts
M  frontend/src/services/sosOrchestratorService.ts
M  frontend/src/services/sosOrchestratorService.test.ts
```

**Do not run `git commit` or `git push`.** The owner reviews and commits this work themselves.
