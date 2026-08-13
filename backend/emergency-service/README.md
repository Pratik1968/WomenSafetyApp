# Aegis Emergency Microservice — Incident Timeline (Module 19)

FastAPI microservice for `WomenSafetyApp` that persists SOS incident timelines:
activation time, GPS history, calls made, messages sent, and response status.

This is a **separate system** from `modules/emergency/services/emergencyService.ts`
on the frontend (which handles voice/journey/fall-detection triggers via
`/api/v1/emergency/alert` — do not confuse the two). This service owns
`/api/v1/emergency/incidents/*` only.

## Endpoints

- `POST /api/v1/emergency/incidents/sync` — upsert an incident + append one
  timeline event. Called once per pipeline step by the mobile app's
  `sosOrchestratorService.ts`. Idempotent per `clientIncidentId`.
- `GET /api/v1/emergency/incidents/history?firebaseUid=...` — list a user's
  incidents, newest first.
- `GET /api/v1/emergency/incidents/history/{incident_id}` — full incident
  detail: header fields + timeline + GPS history + contacts notified.

## Database Schema Deployment

Apply `schema.sql` to your Supabase project before starting the service:

```bash
psql "$SUPABASE_DB_URL" -f schema.sql
```

Or paste its contents into the Supabase SQL editor.

## Running locally

```bash
pip install -r requirements.txt
export SUPABASE_URL="https://<project>.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"
uvicorn app.main:app --reload
```

Without `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` set, the service falls back
to an in-memory store automatically (dev/test mode — data is lost on restart).

## Running tests

```bash
python -m pytest tests/ -v
```

Tests run entirely in in-memory mode (no `SUPABASE_URL` needed) — they patch
`get_supabase` to return `None` or a mock, never hitting a real database.
