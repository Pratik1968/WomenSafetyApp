# Module 5: AI Threat Detection — Design (condensed)

**Status:** Approved (autonomous session — see Module 18's spec doc for the standing note on why
this run has no interactive approval step; same conditions apply here).

## Problem & scope

Spec: "Detect abnormal movement, running detection, sudden stop detection, night travel
monitoring, high-risk area prediction, suspicious route identification, unsafe travel alerts."

Prior state, confirmed during Module 18's audit and re-confirmed here: `backend/app/api/v1/ai
/router.py`'s `/ai/analyze` endpoint hardcodes `danger_score: 15` and **nothing in the frontend
calls it** (grepped `analyze` and `ThreatAssessment` across `frontend/src` — zero matches beyond
the schema/router themselves). Same disconnected-Python/SQLite problem documented for Module 4
and Module 18 in `docs/superpowers/specs/2026-08-13-module18-behavior-analysis-design.md`.

Also confirmed: `frontend/src/data/mockTimeline.ts` already has a demo `AI_RISK_DETECTED` event
with `metadata: { confidence: 88, danger_score: 75, model_version: "v2.1" }` — this is mock/demo
data (not live), but it shows whoever scaffolded Module 19's timeline event shape already
expected a numeric 0–100 `danger_score` to travel alongside an AI alert. This module makes that
real instead of mock.

## Decision: extend Module 18's engine, don't build a second one

`behaviorAnalysisService.ts` already computes exactly the signals this module needs (movement
anomalies + zone risk) every 10s during an active SOS, via the exact `evaluate()` call already
wired into `sosOrchestratorService.ts`. Building a second, separate "threat detection" pipeline
would duplicate that work and reintroduce the dead-Python-stub problem this whole design
explicitly avoids. Instead: add a pure `computeDangerScore()` function to the same file, call it
from the same `evaluate()`, and thread the number through the same alert → `appendLog` →
`IncidentDetailScreen` path Module 18 already built and verified (42/42 tests, full suite clean).

## Scoring (concrete, rule-based — same "no training data, so use documented heuristics"
rationale as Module 18)

```
score = 0
if suddenStop:            score += 35
if prolongedInactivity:   score += 35
if nightTravel:           score += 15
score += { low: 0, moderate: 5, high: 15, hotspot: 25 }[zoneRisk] ?? 0
score = clamp(score, 0, 100)
```

Rationale for weights: the two movement anomalies (sudden stop, prolonged inactivity) are the
strongest individual behavioral evidence of a problem, so they're weighted equally and heavily;
night travel is corroborating context, not evidence on its own, so it's weighted lower; zone risk
is an environmental multiplier layered on top, capped so it alone can't reach a high score without
at least one real behavioral signal firing.

## Components (all in already-touched files — no new files)

1. `behaviorAnalysisService.ts`: add `export function computeDangerScore(signals:
   MovementSignals, zoneRisk: ZoneRisk): number` (pure). Extend `BehaviorAlert` with `dangerScore:
   number`. `evaluate()` computes it and includes it even when `buildAlert` returns non-null
   (dangerScore is attached to whatever alert fires — there's no case where signals exist but no
   alert fires, since `buildAlert` returns null only when zero signals, which means score is also
   necessarily 0 in that case, so no separate "score-only, no alert" event type is needed for v1).
2. `sosOrchestratorService.ts`: the existing `appendLog(incidentId, alert.eventType, { detail:
   alert.detail })` call (added in Module 18 Task 4) becomes `{ detail: alert.detail,
   dangerScore: alert.dangerScore }`.
3. `HistoryScreens.tsx`: the existing `AI_WARNING`/`AI_RISK_DETECTED` detail-extraction branch in
   `describeTimelineStep` (added in Module 18 Task 5) appends the score: `` `${detail}
   Danger score: ${dangerScore}/100.` `` when `entry.data?.dangerScore` is a number.

## Testing

Unit tests for `computeDangerScore` (pure, all weight combinations + clamp boundary). Extend
`evaluate()` tests to assert `dangerScore` is present and correct on the returned alert. Extend
`sosOrchestratorService.test.ts`'s existing AI-alert-adjacent coverage to assert `dangerScore` is
forwarded. Extend `HistoryScreens.test.tsx`'s AI-alert render test to assert the score appears in
rendered text.
