# Auth Migration Phase 1: FastAPI as Sole Identity Authority — Design

**Status:** Approved by owner in conversation (2026-08-13) — direction confirmed step by step
(edge-functions-vs-FastAPI decision, then "migrate everything toward FastAPI", then "do full
fix" on the identity gap below). This doc records the resulting design for the first phase.

**Branch:** TBD (new work, not yet started — see `writing-plans` handoff at the end of this doc).

## Problem

Owner's long-term goal: move the backend from the current dual-system split (Supabase Deno edge
functions + a separate, mostly-disconnected Python FastAPI app) onto a single FastAPI server,
started with auth first since every other module depends on identity being correct.

Investigation (this session) found the auth/identity problem is worse than "pick one backend" —
there are **three parallel, disconnected identity systems already live**:

1. **Firebase Auth** — the real end-user login (phone OTP, `firebaseAuthService.ts`). This is
   what `AuthContext`/`useAuth()` actually gates the app on.
2. **FastAPI's own session layer** — `/auth/login`, `/auth/set-password` already verify Firebase
   ID tokens via `get_current_firebase_uid` (`backend/app/core/security.py`) and read/write
   `public.users` (Supabase Postgres table, keyed by `firebase_uid`, via
   `UserRepository`/`get_supabase()` using a **service-role** key — confirmed via
   `backend/.env.example`, bypasses RLS by design).
3. **Supabase Auth** — what every RLS-protected edge function (evidence, incidents, admin,
   reports) checks via `auth.uid()`. `frontend/src/data/supabase.ts`'s `ensureSession()` does
   **not** exchange the Firebase identity for a Supabase session — it calls
   `supabase.auth.signInAnonymously()`. Confirmed by the file's own comment: "for standalone
   testing... we fall back to an anonymous session."

**Consequence:** every `evidence_files`/`sos_incidents` row created today is scoped (by RLS,
`user_id = auth.uid()`-style policies) to an anonymous per-session Supabase identity, not to the
real Firebase-authenticated user who owns it. Schema confirms `user_id` columns are `uuid NOT
NULL` FKs pointing at `public.users.id` (the Firebase-backed table, `id uuid DEFAULT
uuid_generate_v4()`, `firebase_uid text UNIQUE`) — **not** at Supabase Auth's own `auth.users`.
So the FK design already assumes `public.users.id` is the real identity; only the RLS/session
layer never caught up to that.

**Separately, flagged but out of scope for this doc:** `backend/.env.example` contains a live
Supabase **service-role** key (full RLS-bypass DB access) and a live project URL, committed as if
it were a placeholder template. This needs rotating and replacing with a placeholder regardless
of which architecture direction wins — noted here so it isn't lost, not solved by this plan.

## Scope decision: what "Phase 1 / auth first" actually fixes

**In scope:**
- Make Firebase UID → `public.users.id` the one canonical identity resolution path, used by
  every FastAPI route going forward (not just `/auth/*`).
- Require `get_current_firebase_uid` on every protected FastAPI endpoint touched in this phase.
- Retire the dead `authentication-service` edge function (confirmed zero callers — it's a
  request-echo stub, `{service, ok, echo: body}`).
- Verified during this session's investigation: the Python backend's repository layer
  (`backend/app/repositories/*.py` — `user_repository.py`, `emergency_contact_repository.py`,
  `device_repository.py`, `notification_repository.py`) is already sound. Each is standalone
  (no shared base class exists), each genuinely calls `get_supabase()` and persists for real.
  No repository-layer fix is needed in the backend for this phase.

**Explicitly out of scope for this doc (future phases, per the owner-agreed order: auth → GPS/crime-hotspots → evidence/incidents/timeline → admin):**
- Migrating evidence/incidents/admin/reports off Supabase edge functions onto FastAPI.
- Reconciling or backfilling `evidence_files`/`sos_incidents` rows already created under the
  anonymous-Supabase-session identity — those are currently orphaned from any real user and need
  a data decision (accept loss vs. attempt reconciliation) when the evidence/incidents phase is
  scoped. Not solved here.
- Rotating the exposed service-role key / auditing `.gitignore` coverage of `.env` — real and
  urgent, but a security housekeeping task independent of this design.
- `frontend/src/repositories/voice/VoiceRepository.ts` and its
  `frontend/src/repositories/base/BaseRepository.ts` base class are also confirmed no-op stubs
  (`findById` always `null`, `create` never persists, `saveVoiceConfig` always returns `true`
  without writing anywhere) — but this is frontend TypeScript for Module 15 (voice trigger
  config), unrelated to the backend auth work in this doc, and currently unused (`voiceRepository`
  has zero callers elsewhere in the codebase). Flagged for whoever picks up Module 15, not
  addressed here.

## Architecture

FastAPI keeps its existing Supabase Python client (service-role key, `get_supabase()` in
`backend/app/db/database.py`) and keeps reading/writing the **same** Supabase Postgres — no data
migration, no new database. Service-role access means RLS is bypassed by design for everything
FastAPI touches, so **authorization moves fully into FastAPI application code**: every repository
method must resolve and filter by the real `public.users.id`, resolved once per request from the
verified Firebase UID.

```
Client → Authorization: Bearer <Firebase ID token>
       → FastAPI: get_current_firebase_uid(token) → firebase_uid
       → UserRepository.get_by_firebase_uid(firebase_uid) → public.users.id
       → every downstream repository call scoped to that id (service-role client, RLS bypassed,
         isolation enforced here instead)
```

This sidesteps the `auth.uid()` mismatch entirely for anything migrated to FastAPI — there is no
longer a Supabase Auth session in the loop for those routes. Modules still served by edge
functions (everything not yet migrated) are unaffected and keep working exactly as today,
including their existing (imperfect) anonymous-session behavior, until their own migration phase.

## Components

1. **`backend/app/core/security.py`** (existing, extend) — `get_current_firebase_uid` becomes a
   required dependency on every FastAPI route touched from here on, not just `/auth/*`. No
   change to its verification logic (already correct: real Firebase Admin SDK verification in
   production, clearly-labeled unverified-decode fallback gated by `DEBUG` for local dev).

2. **New: `backend/app/core/identity.py`** (or similar) — a small
   `get_current_user_id(firebase_uid: str = Depends(get_current_firebase_uid)) -> str` dependency
   that resolves to `public.users.id` via `UserRepository.get_by_firebase_uid`, raising 404/401
   if no profile exists yet. This becomes the dependency every new/migrated route actually uses
   for scoping — routes should stop passing `firebase_uid` around directly once a real `users.id`
   is available.

3. **`backend/authentication-service/`** (delete) — remove the dead edge function and its
   deployment entry.

4. **Frontend: no change in this phase.** `ensureSession()`'s anonymous Supabase fallback stays
   until the modules that depend on it (evidence/incidents/admin/reports) migrate in a later
   phase — removing it now would break those.

## Error handling

- Missing/invalid Firebase token → 401, unchanged from existing `get_current_firebase_uid`
  behavior.
- Valid Firebase token but no `public.users` row yet (new user, profile not created) → the new
  `get_current_user_id` dependency returns 404 with a clear "complete profile setup first"
  message, matching the existing pattern in `/auth/login`'s "No account found" error.
- Supabase (service-role client) unreachable → `UserRepository` already falls back to local
  SQLite in dev; production has no fallback and should surface a 503, not silently use stale/local
  data — confirm this is current behavior and make it explicit if not.

## Testing plan

- Unit tests for the new `get_current_user_id` dependency: valid uid → resolves id; unknown
  Firebase uid → 404; missing/invalid token → 401 (delegated to existing
  `get_current_firebase_uid` coverage).
- Regression: existing `/auth/login`, `/auth/set-password`, `/auth/password-status` tests (if
  any exist — verify) must keep passing unmodified.
- Confirm zero callers of `authentication-service` before deleting it (already grepped this
  session — zero matches in `frontend/src`) — re-grep at implementation time in case something
  changed.

## Open questions for later phases (not blocking this one)

- How/whether to reconcile evidence/incident rows already created under anonymous Supabase
  sessions once that migration phase is scoped.
- Whether `APP_SESSION_SECRET`-based custom session tokens (`create_app_session_token`) stay as
  an alternate credential type alongside raw Firebase ID tokens, or get folded into one scheme —
  not touched in this phase since both already resolve to the same `firebase_uid` via
  `get_current_firebase_uid`.
