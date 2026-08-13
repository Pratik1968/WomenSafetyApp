# Module 18: AI Behavior Analysis — Design

**Status:** Approved (autonomous session — see note below)
**Branch:** `feature/incidenttimeline`
**Author session note:** Owner set auto-mode and went offline mid-brainstorm, explicitly
instructing: build Module 18 first, then Module 5 if time remains; make all design/approach
decisions solo; do not wait for interactive approval; write docs to track state instead of asking
questions; no git commit/push, stage only. This document replaces the interactive
question-by-question and approval steps that `superpowers:brainstorming` normally runs, with the
same rigor applied solo instead of collaboratively. Three approaches were considered per
component below, with rationale for the one chosen.

## Problem

Spec (module list given by owner) for Module 18:

> Monitors: walking patterns, sudden direction changes, repeated following behavior, unusual
> inactivity, device movement. Triggers alerts when suspicious patterns are detected.

Prior to this session, Module 18 was **not started** — confirmed by a full cross-branch code
audit (only forward-looking placeholder event types existed, no detection logic anywhere).

## Scope decisions (v1)

**In scope:**
- Monitor the live GPS stream that already flows during an **active SOS incident**
  (`sosOrchestratorService.ts`'s `watchPositionAsync` callback, firing every 10s / 10m).
- Signals: sudden stop (deceleration between consecutive pings), prolonged inactivity (no
  meaningful movement across a rolling window), current-location risk zone (reusing Module 11's
  `crime_hotspots` table), night-time travel flag.
- Emit alerts into the **same incident timeline mechanism already rendered by the app**
  (`HistoryScreens.tsx`'s `IncidentDetailScreen`), using the existing `AI_WARNING` /
  `AI_RISK_DETECTED` event types that were already reserved for this module in
  `frontend/src/data/incidentEvents.ts`.

**Out of scope (v1), with reasons:**
- **"Repeated following behavior"** — no data source exists anywhere in the app for tracking a
  second party's trajectory (no proximity/BLE/Wi-Fi scanning of nearby unknown devices). Flagged
  as a future module extension, not faked.
- **Pre-emptive monitoring during a Journey**, before any SOS/emergency fires — a `Journey`
  (`journeyService.ts`) has no persistent `incident_id` unless a voice-triggered emergency fires
  inside it. Without a stable incident to attach alerts to, there's nowhere durable to log them.
  Extending this would require a new "journey session" persistence layer — real work, correctly
  a separate module-4-adjacent project, not bundled into this one.
- **Trained ML models** — no historical incident/movement dataset exists in this repo to train
  anything on. Using deterministic, documented heuristics instead. This matches the existing
  precedent already in the codebase: `backend/app/api/v1/ai/router.py` (Module 5's current stub)
  labels itself "AI Risk & Threat Detection Module" while just returning a hardcoded rule-shaped
  response — a heuristic engine is consistent with, not a downgrade from, what's already there.

## Architecture decision: where does signal computation live?

Three approaches considered:

1. **Extend the Python FastAPI app (`backend/app/`).** `/gps/ping` and `/ai/analyze` stubs
   already live there, so this looks like the obvious home. **Rejected**: that app runs its own
   local SQLite database (`sqlite:///./women_safety.db`), completely disconnected from the
   Supabase Postgres database where `crime_hotspots` (Module 11), `crowd_reports` (Module 12),
   and the SOS incident sync (`/emergency/incidents/sync`, confirmed as the real backend the
   frontend calls) all live. Building here means either replicating hotspot data into SQLite
   (drift risk) or having Python call out to Supabase over HTTP for every check — a network hop
   with no benefit over just running where the data already is. Confirmed via grep: nothing in
   the frontend actually calls `/gps/ping` today; it's dead code.

2. **New Supabase Deno edge function**, matching the `incident-report-service` /
   `timeline-service` pattern. Consistent with where `crime_hotspots` and `incident_timeline`
   live. **Rejected for v1**: requires a new network round-trip (frontend → edge function →
   Postgres → response) for something that ideally reacts within the same 10s tick as the GPS
   ping itself, during an active emergency. Also duplicates location data that's already flowing
   through the existing client-side SOS pipeline instead of reusing it.

3. **Client-side signal engine inside the existing SOS pipeline — CHOSEN.** A new
   `frontend/src/services/behaviorAnalysisService.ts`, called from
   `sosOrchestratorService.ts`'s existing `LOCATION_UPDATE` handler (the exact point that already
   fires every 10s during an active SOS). It keeps a short in-memory ring buffer of recent
   points (reusing data already being generated), computes movement signals synchronously (no
   network wait), and does one lightweight Supabase read against `crime_hotspots` for the
   current-zone risk — mirroring exactly how `frontend/src/data/timelineService.ts` already
   queries Supabase directly from the frontend. `crime_hotspots` is readable by any authenticated
   user per its existing RLS policy (`hotspots_read: auth.role() = 'authenticated'`), so no new
   grants are needed.

   When a signal crosses threshold, it's appended via the **same `appendLog` mechanism already
   used for every other SOS step** (`SOS_TRIGGERED`, `LOCATION_ACQUIRED`, `SMS_SENT`, ...), which
   already fire-and-forget syncs to AsyncStorage + the Python backend
   (`/api/v1/emergency/incidents/sync`). This means the alert appears in the real,
   already-rendered `IncidentDetailScreen` (inside `HistoryScreens.tsx`) via the exact same
   `incident.timeline` array — zero changes to rendering logic beyond two new label entries.

   **Trade-off accepted:** the ring buffer is in-memory per app session, lost on restart.
   Acceptable because it only needs a short rolling window (last 5 pings) to detect sudden
   stops/inactivity, not long-term history.

## Components

1. **`frontend/src/services/behaviorAnalysisService.ts`** (new) — pure, side-effect-free signal
   engine:
   - `pushLocation(point: {lat, lng, timestampMs})` — maintains a capped ring buffer (last 5
     points) in module state.
   - `reset()` — clears the buffer; called on `triggerSOS` (new incident) and `cancelSOS`
     (incident ended) so state never leaks across incidents.
   - `computeMovementSignals(buffer, nowMs)` → `{ suddenStop: boolean; prolongedInactivity:
     boolean; nightTravel: boolean }` — pure function, deterministic, fully unit-testable with
     no mocks.
   - `lookupZoneRisk(lat, lng)` → queries `crime_hotspots` for the nearest point within a 2km
     radius (same Haversine formula already used in
     `backend/incident-report-service/index.ts`'s nearby-reports feed, ported to TS), returns
     `risk_level | null`. Wrapped in try/catch — returns `null` on any failure (network,
     unconfigured Supabase) so movement-only signals still work standalone.
   - `evaluate(point)` → orchestrates the above (pushes `point` into the buffer, computes
     signals, looks up zone risk); returns `null` or `{ eventType: "AI_WARNING" |
     "AI_RISK_DETECTED"; title: string; detail: string }`. Severity rule: 2+ movement signals, or
     1 signal while in a `high`/`hotspot` zone → `AI_RISK_DETECTED`; exactly 1 signal otherwise →
     `AI_WARNING`; 0 signals → `null`. No side effects beyond the buffer push and the read-only
     Supabase lookup — it does not append to any timeline itself; the caller (Task 4, inside
     `sosOrchestratorService.ts`) decides what to do with the result and owns the `incidentId`,
     keeping `evaluate` fully unit-testable in isolation without an incident to attach to.

2. **`sosOrchestratorService.ts`** (edit) — in the existing `watchPositionAsync` callback, after
   the existing `appendLog(incidentId, "LOCATION_UPDATE", ...)` call, call
   `behaviorAnalysisService.pushLocation(...)` then `.evaluate(...)`; if it returns a decision,
   `appendLog(incidentId, decision.eventType, { title: decision.title, detail: decision.detail
   })`. Add `behaviorAnalysisService.reset()` at the start of `triggerSOS` and inside
   `cancelSOS`.

3. **`HistoryScreens.tsx`** (edit, small) — add `AI_RISK_DETECTED` / `AI_WARNING` entries to the
   existing `STEP_LABELS` map (currently only has the fixed SOS pipeline steps) so
   `describeTimelineStep`'s **local-timeline branch** (the one that actually renders for real SOS
   incidents, since `incident.timeline` is never empty once `SOS_TRIGGERED` has been logged)
   renders them with a proper title/tone instead of falling through to the raw step-name
   default. Note: `EVENT_DISPLAY_CONFIG` in `incidentEvents.ts` already has display config for
   both event types, but that only feeds the *other* branch (`IncidentEventRecord`, from the
   Deno `timeline-service` fallback), which the merge logic (`displayTimeline`) never reaches
   for a real SOS incident — this `STEP_LABELS` addition is the one that actually matters.

## Thresholds (concrete constants — resolved during spec self-review to remove ambiguity)

`SOSLocation` (the existing type already used by `sosOrchestratorService.ts`) carries only
`{lat, lon, timestamp, accurate}` — no device-reported speed/heading. So movement signals are
derived from position deltas across the ring buffer, not a speed field:

- **Ring buffer size:** last 5 points (≈ last 40–50s at the existing 10s ping cadence).
- **Derived speed** between two consecutive points = Haversine distance (meters) ÷ time delta
  (seconds) = m/s.
- **Sudden stop:** previous derived speed ≥ 1.2 m/s (brisk walking pace) AND the next derived
  speed ≤ 0.3 m/s (near-stationary) — a sharp deceleration between consecutive samples.
- **Prolonged inactivity:** buffer is full (5 points) AND the max pairwise distance between any
  two points in the buffer is < 15m (GPS jitter tolerance) — effectively stationary for the
  whole ~40–50s window. Requiring a full buffer avoids false-triggering on the first couple of
  pings right after SOS starts.
- **Night travel:** local hour of the current point's timestamp (`new Date(timestampMs
  ).getHours()`) is in `[21:00–05:00)`.
- **Zone-risk radius:** 2km — tighter than `incident-report-service`'s 5km crowd-report feed
  default, since this is "current zone," not a browsable feed.

## Data flow

```
Active SOS → watchPositionAsync fires (10s/10m)
  → sosOrchestratorService appends LOCATION_UPDATE (existing, unchanged)
  → behaviorAnalysisService.pushLocation(point) + .evaluate(point, incidentId)
      → movement signals computed synchronously from ring buffer
      → one Supabase read: crime_hotspots near (lat,lng)  [best-effort, never blocks]
  → if alert: appendLog(incidentId, "AI_WARNING"|"AI_RISK_DETECTED", {title, detail})
      → same fire-and-forget path as every other step:
        AsyncStorage (immediate) + POST /api/v1/emergency/incidents/sync (best-effort)
  → visible immediately in HistoryScreens' IncidentDetailScreen via incident.timeline
```

## Error handling

- Zone-risk Supabase lookup wrapped in try/catch; returns `null` on failure — signals still
  evaluate on movement checks alone, degrading gracefully rather than blocking the SOS pipeline
  (matches the existing "best-effort, never block" philosophy documented in
  `syncStepToBackend`'s doc comment).
- `evaluate()` itself never throws.
- Ring buffer capped at a fixed size (5) — no unbounded memory growth over a long-running SOS.

## Testing plan

- `behaviorAnalysisService.test.ts` (new): pure unit tests for `computeMovementSignals` with
  deterministic input point sequences → expected signal booleans (sudden stop, inactivity, night
  travel), no mocks required. `lookupZoneRisk` tested with the Supabase client mocked (same
  `jest.mock('../data/supabase', ...)`-style pattern already used elsewhere in this codebase).
  `evaluate`'s severity-decision table tested directly (0/1/2+ signals × zone risk → expected
  eventType or null).
- `sosOrchestratorService.test.ts` (existing, extended): one new case asserting an
  `AI_WARNING`/`AI_RISK_DETECTED` step gets appended when `behaviorAnalysisService.evaluate` is
  mocked to return a decision, and that `reset()` is called on `triggerSOS`/`cancelSOS`.
  Existing cases must continue to pass unmodified.
- Full verification before marking done: targeted jest run on the two touched/new test files,
  then `tsc --noEmit`, matching the verification pattern already established in this repo's
  `.superpowers/sdd/2026-08-10-incident-timeline-module19/progress.md` ledger.

## Module 5 (AI Threat Detection) — deferred to its own follow-up design

Once `behaviorAnalysisService.ts` exists, Module 5 becomes small: it can expose a composite
`computeDangerScore()` reusing the same signals, rather than extending the currently-dead Python
`/ai/analyze` stub (same SQLite-disconnection problem as Module 4/18 above — confirmed nothing in
the frontend calls `/ai/analyze` either). Left out of this document to keep it focused; will be
scoped in its own short design note if time remains after Module 18 ships, per YAGNI.
