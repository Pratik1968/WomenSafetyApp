# Fix Broken SOS Incident Sync — Design

**Status:** Approved by owner in conversation (2026-08-13, Auto Mode). Follows the same direction
as `2026-08-13-auth-migration-fastapi-design.md`: consolidate onto the live FastAPI monolith
(`backend/app`), not the orphaned microservice or the dead unauthenticated router.

## Problem

Confirmed via direct code reading (not just the earlier audit) that **no SOS incident, from
either trigger pipeline, currently reaches any live backend**:

- Button/shake (`sosOrchestratorService.ts` → `incidentSyncService.ts`) posts to
  `API_ENDPOINTS.EMERGENCY_INCIDENTS_SYNC`, which only exists as a route in
  `backend/emergency-service` — a separate microservice `docker-compose.yml` never starts.
- Voice/journey (`emergencyService.ts`) posts to `API_ENDPOINTS.EMERGENCY_ALERT`
  (`/emergency/alert`). That path doesn't exist on the one router that's actually mounted
  (`backend/app/api/v1/emergency/router.py`) — only on `backend/app/routers/emergency.py`,
  which is dead code (defined, exported from `app/routers/__init__.py`, but never
  `include_router`'d by `main.py` or `app/api/v1/__init__.py`) and has no auth on any of its
  endpoints.
- Even the one endpoint that IS live and authenticated — `/emergency/sos/trigger` on
  `backend/app/api/v1/emergency/router.py` — is a stub: it sends a push notification and
  returns a hardcoded `SOSIncidentResponse(id="sos-456", danger_score=90, ...)` without ever
  writing to the database.

**Net effect:** if a phone is lost, destroyed, or the app is killed after an SOS fires, the
incident record exists only in local `AsyncStorage` — nothing survives on a server. For a
safety app, this is the core threat model failing silently.

**Secondary problem, schema-level:** `sos_incidents` (Postgres) is a single-row-per-incident
table (status, trigger_type, danger_score, lat/lng, started_at/ended_at) with location pings
split into a separate `location_history` table. But the client's actual data model
(`incidentSyncService.ts`'s `IncidentEventPayload`, driven by `sosOrchestratorService.ts`'s
`appendLog()`) is a generic step-event log — `{step, stepData, occurredAt}` — firing arbitrary
named steps (`SOS_TRIGGERED`, `LOCATION_ACQUIRED`, `SMS_SENT`, `LOCATION_UPDATE`, `AI_WARNING`,
`AI_RISK_DETECTED`, `SOS_ENDED`, ...). No existing table matches that shape. This is also exactly
what `HistoryScreens.tsx`/`IncidentDetailScreen` already render from (`incident.timeline` as a
flat array) — the client-side contract already assumes a generic event log; the backend just
never had one.

## Scope decision: keep the two trigger pipelines, unify the storage destination

A comment in `incidentSyncService.ts` says button/shake and voice/journey are "deliberately
separate... do not merge these." Read literally, that's about trigger-handling and
offline-queue logic staying separate per source (confirmed: `emergencyService.ts`'s
`EmergencyPayload` carries voice-specific fields — `detectedKeyword`, `recognizedText`,
`confidence`, `language`, `pressType`, `connectedDevice`, `audioClipUri` — that button/shake
never has) — not a requirement that the two sources write to different backend tables.

**Decision:** both pipelines keep their separate client-side trigger/queue code untouched, but
now write to the **same** `sos_incidents` + `incident_events` tables via the **same**
already-authenticated router. Voice/journey triggers log their first event using the exact same
`"SOS_TRIGGERED"` step name button/shake already uses, with the voice-specific fields folded
into `step_data` — this means `HistoryScreens.tsx`'s existing `STEP_LABELS` entry for
`SOS_TRIGGERED` renders it correctly with **zero new frontend rendering code**. If a voice
trigger detected an emergency keyword (e.g. "help me", "call police"), that keyword and its
recognition confidence are visible in the same History/IncidentDetail screen as every other SOS
step, not siloed elsewhere.

**Out of scope for this doc:**
- Resurrecting `backend/emergency-service` (the orphaned microservice) or reusing
  `backend/app/routers/emergency.py` (dead, unauthenticated) as-is — both rejected per the
  auth-migration doc's direction.
- Any change to `sosOrchestratorService.ts`'s or `emergencyService.ts`'s own trigger-detection,
  offline-queue, or retry logic — only their sync *destination* changes.
- AWS Lambda / deployment architecture — separate follow-on piece, not part of this design.

## Architecture

```
Button/Shake trigger                    Voice/Journey trigger
  sosOrchestratorService.ts                emergencyService.ts
        │                                        │
        ▼                                        ▼
  incidentSyncService.ts                 (new call, same shape)
        │                                        │
        └──────────────┬─────────────────────────┘
                        ▼
      backend/app/api/v1/emergency/router.py   (live, Depends(get_current_firebase_uid))
                        │
          ┌─────────────┴──────────────┐
          ▼                             ▼
   POST /emergency/sos/trigger   POST /emergency/sos/{id}/events
   (or /emergency/alert for      (every subsequent step, both
    voice/journey's richer        sources, including SOS_ENDED)
    first-event payload)
          │                             │
          ▼                             ▼
     sos_incidents (1 row)      incident_events (N rows, FK'd)
                        │
                        ▼
        HistoryScreens.tsx / IncidentDetailScreen
        (renders incident.timeline exactly as today —
         reconciliation logic unchanged)
```

## Components

1. **New table: `incident_events`** (Postgres/Supabase, added via a new migration file
   alongside the existing schema) —
   ```sql
   CREATE TABLE public.incident_events (
     id uuid NOT NULL DEFAULT uuid_generate_v4(),
     incident_id uuid NOT NULL REFERENCES public.sos_incidents(id),
     step text NOT NULL,
     step_data jsonb,
     occurred_at timestamp with time zone NOT NULL DEFAULT now(),
     created_at timestamp with time zone DEFAULT now(),
     CONSTRAINT incident_events_pkey PRIMARY KEY (id)
   );
   ```
   Deliberately generic (`step text` + `step_data jsonb`) rather than one column per step type —
   matches the client's existing arbitrary-step model exactly, and needs zero schema changes for
   any future step type (e.g. whatever Module 5's real threat-detection or Module 7's video
   capture eventually log).

2. **`backend/app/api/v1/emergency/router.py`** (modify) —
   - `/sos/trigger`: replace the hardcoded `SOSIncidentResponse(id="sos-456", ...)` with a real
     insert into `sos_incidents`, reusing `_resolve_caller_user_id` (already there) for ownership
     — port the actual insert logic from the dead `app/routers/emergency.py` (which already has
     working Supabase-insert code), but call it through the authenticated path, not copy its
     missing-auth version.
   - `/alert` (new): voice/journey's entry point. Same `_resolve_caller_user_id` ownership check,
     creates one `sos_incidents` row (`trigger_type` set from the payload's `source` field) then
     one `incident_events` row with `step="SOS_TRIGGERED"`, `step_data` = the voice-specific
     fields (`detectedKeyword`, `recognizedText`, `confidence`, `language`, `pressType`,
     `connectedDevice`, `journeyId`).
   - `/sos/{incident_id}/events` (new): appends one row to `incident_events` for any subsequent
     step from either pipeline (`LOCATION_UPDATE`, `SMS_SENT`, `AI_WARNING`, `SOS_ENDED`, etc.).
     Ownership check: the incident's `user_id` must resolve to the caller.

3. **Frontend — `incidentSyncService.ts`** (modify) — `API_ENDPOINTS.EMERGENCY_INCIDENTS_SYNC`
   is replaced by two real endpoints: incident creation (first call) hits `/sos/trigger`,
   subsequent `syncIncidentEvent` calls hit `/sos/{incident_id}/events`. No change to the
   function signatures `sosOrchestratorService.ts` already calls — only the URL(s)
   underneath.

4. **Frontend — `emergencyService.ts`** (modify) — `API_ENDPOINTS.EMERGENCY_ALERT` now points at
   the new, real `/alert` endpoint (was pointing at a 404 before). No change to
   `triggerEmergency`'s own signature, offline-queue behavior, or the `EmergencyPayload` shape it
   already builds — the backend now actually consumes what it already sends.

## Error handling

Unchanged philosophy from `syncStepToBackend`'s existing doc comment: sync is best-effort and
must never block the SOS pipeline itself. Confirmed the two pipelines currently differ here and
this doc does **not** change that gap: `emergencyService.ts` already retries via
`networkMonitor.queueOfflineRequest` on failure; `syncStepToBackend` (button/shake) only
`console.warn`s and drops the event. Both keep exactly their current failure behavior — only the
URLs and payloads they hit become real. Giving button/shake the same offline-queue retry
`emergencyService.ts` already has would be a legitimate follow-up, but it's a behavior change
independent of "make the endpoints persist," so it's deferred rather than bundled in here.

## Testing plan

- Backend: unit tests for `/sos/trigger`, `/alert`, `/sos/{id}/events` with a mocked Supabase
  client — assert real inserts happen (not hardcoded responses), assert ownership check rejects
  a caller whose resolved `user_id` doesn't match the incident's.
- Backend: regression test that `/sos/trigger`'s response shape (`SOSIncidentResponse`) is
  unchanged so nothing downstream breaks.
- Frontend: extend `incidentSyncService.test.ts` and `sosOrchestratorService.test.ts` to assert
  the new URLs are hit with the same payload shapes as before.
- Frontend: extend `emergencyService`'s existing tests to assert a successful `/alert` call
  produces an incident visible via the same reconciliation path `HistoryScreens.tsx` already
  uses — end-to-end proof the voice path now surfaces in the UI.
- Manual: trigger a voice-detected emergency phrase in a dev build, confirm the resulting
  `SOS_TRIGGERED` step (with `detectedKeyword` in its data) appears in `IncidentDetailScreen`
  identically to a button-triggered one.
