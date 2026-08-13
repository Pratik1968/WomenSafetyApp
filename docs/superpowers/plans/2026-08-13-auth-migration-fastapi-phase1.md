# Auth Migration Phase 1: FastAPI as Sole Identity Authority — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `public.users.id` (resolved from a verified Firebase ID token) the one canonical
user identity for everything served by the Python FastAPI backend, fix the one concrete stub
this touches (`/auth/verify-token` currently returns hardcoded fake data), and retire the dead
`authentication-service` Supabase edge function.

**Architecture:** FastAPI keeps its existing service-role Supabase Python client
(`backend/app/db/database.py`) and the same Postgres tables — no data migration. A new
`get_current_user_id` dependency resolves the verified Firebase UID to the real
`public.users.id` via the existing `UserRepository`. `get_current_firebase_uid`'s token
verification logic gets extracted into a standalone, unit-testable function so it can be reused
by both the header-based dependency and the body-based `/auth/verify-token` endpoint.

**Tech Stack:** FastAPI, pydantic v2, `firebase-admin` (Admin SDK token verification),
`supabase-py` (service-role client), pytest (already installed in the dev environment, 9.1.1;
not currently pinned in `requirements.txt` — see Task 5).

## Global Constraints

- No data migration: FastAPI must keep reading/writing the same Supabase Postgres tables via the
  existing service-role client — do not stand up a new database.
- Do not touch evidence, incidents, admin dashboard, or reports — those are out of scope for this
  phase per the spec (`docs/superpowers/specs/2026-08-13-auth-migration-fastapi-design.md`) and
  still run on Supabase edge functions unchanged.
- No frontend changes in this phase — `frontend/src/data/supabase.ts`'s `ensureSession()`
  anonymous fallback must keep working unmodified (still-live edge functions depend on it).
- **No commits.** This project's standing convention: write and stage (`git add`) only. The
  owner runs `git commit` themselves. Every task below ends with a staging step, not a commit
  step — do not run `git commit` at any point in this plan.
- Tests assume `DEBUG=True` (the `.env.example` default) so Firebase token verification
  deterministically falls through to the existing unverified-decode dev path when given a
  syntactically-valid-but-unsigned test token — this matches how `get_current_firebase_uid`
  already behaves today in local/dev environments with or without real Firebase credentials
  present.

---

## File Structure

- `backend/app/core/security.py` (modify) — extract `verify_firebase_id_token(token: str) -> str`
  out of `get_current_firebase_uid`, which becomes a thin header-parsing wrapper around it.
- `backend/app/core/identity.py` (create) — new `get_current_user_id` FastAPI dependency.
- `backend/app/api/v1/auth/router.py` (modify) — `/verify-token` becomes real instead of a mock.
- `backend/tests/test_security.py` (create) — unit tests for `verify_firebase_id_token` and
  `get_current_firebase_uid`.
- `backend/tests/test_identity.py` (create) — unit tests for `get_current_user_id`.
- `backend/tests/test_auth_router.py` (create) — `TestClient`-based tests for `/verify-token`.
- `backend/authentication-service/` (delete) — dead edge function.
- `backend/deno.json` (modify) — remove `authentication-service/index.ts` from the `check` task.
- `README.md` (modify) — remove `authentication-service/` from the directory tree listing.

---

### Task 1: Extract `verify_firebase_id_token` from `get_current_firebase_uid`

**Files:**
- Modify: `backend/app/core/security.py:95-152`
- Test: `backend/tests/test_security.py` (create)

**Interfaces:**
- Produces: `verify_firebase_id_token(token: str) -> str` — pure function, no FastAPI
  `Header`/`HTTPException` dependency-injection wrapping, raises plain `ValueError` on any
  failure (missing uid, bad signature and no DEBUG fallback available). Callable directly from
  both the existing header-based dependency and the new body-based `/verify-token` endpoint
  (Task 3).
- Produces: `get_current_firebase_uid(authorization: Optional[str] = Header(None)) -> str` —
  unchanged public signature and behavior, now implemented as a thin wrapper: parse the
  `Authorization: Bearer <token>` header, call `verify_firebase_id_token`, translate `ValueError`
  into the same `HTTPException(401, ...)` it already raises today.

- [ ] **Step 1: Create the working branch**

```bash
cd D:/Projects/saftey/WomenSafetyApp
git checkout -b feature/auth-migration-fastapi-phase1
```

- [ ] **Step 2: Write the failing tests**

Create `backend/tests/test_security.py`:

```python
import base64
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pytest
from app.core.security import verify_firebase_id_token, get_current_firebase_uid
from fastapi import HTTPException


def _fake_firebase_token(uid: str) -> str:
    """Builds a syntactically-valid, unsigned 3-part JWT carrying {"uid": uid} in its
    payload segment. In DEBUG mode (the .env.example default), real Firebase Admin SDK
    verification fails on the fake signature and the code falls back to unverified decode —
    so this works whether or not real Firebase credentials are configured locally."""
    payload = base64.urlsafe_b64encode(json.dumps({"uid": uid}).encode()).rstrip(b"=").decode()
    return f"header.{payload}.signature"


def test_verify_firebase_id_token_returns_uid_for_valid_shaped_token():
    token = _fake_firebase_token("test-firebase-uid-123")
    assert verify_firebase_id_token(token) == "test-firebase-uid-123"


def test_verify_firebase_id_token_raises_on_malformed_token():
    with pytest.raises(ValueError):
        verify_firebase_id_token("not-a-jwt")


def test_verify_firebase_id_token_raises_when_no_uid_claim():
    payload = base64.urlsafe_b64encode(json.dumps({"nope": "field"}).encode()).rstrip(b"=").decode()
    with pytest.raises(ValueError):
        verify_firebase_id_token(f"header.{payload}.signature")


@pytest.mark.asyncio
async def test_get_current_firebase_uid_accepts_bearer_header():
    token = _fake_firebase_token("test-firebase-uid-456")
    uid = await get_current_firebase_uid(authorization=f"Bearer {token}")
    assert uid == "test-firebase-uid-456"


@pytest.mark.asyncio
async def test_get_current_firebase_uid_rejects_missing_header():
    with pytest.raises(HTTPException) as exc_info:
        await get_current_firebase_uid(authorization=None)
    assert exc_info.value.status_code == 401


@pytest.mark.asyncio
async def test_get_current_firebase_uid_rejects_malformed_bearer_token():
    with pytest.raises(HTTPException) as exc_info:
        await get_current_firebase_uid(authorization="Bearer not-a-jwt")
    assert exc_info.value.status_code == 401
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd backend && python -m pytest tests/test_security.py -v`
Expected: `ImportError: cannot import name 'verify_firebase_id_token' from 'app.core.security'`
(if `pytest-asyncio` isn't installed yet, the `async def` tests will also error — install it now:
`pip install pytest-asyncio` and add `asyncio_mode = auto` handling per Step 4 below if needed).

- [ ] **Step 4: Implement `verify_firebase_id_token`**

In `backend/app/core/security.py`, replace the body of `get_current_firebase_uid` (currently
lines 95-152) with:

```python
def verify_firebase_id_token(token: str) -> str:
    """
    Verifies a raw Firebase ID token string and returns the caller's real Firebase UID.

    In production, the Firebase Admin SDK performs full cryptographic verification.
    In dev/CI mode (no service-account credentials, or DEBUG=True and verification fails),
    the JWT payload is decoded without signature verification so that local development
    works end-to-end. Raises ValueError on any failure — callers translate this into
    whatever transport-level error fits their context (see get_current_firebase_uid below).
    """
    if not token:
        raise ValueError("Missing token")

    if token.startswith(APP_SESSION_PREFIX):
        return _extract_uid_from_app_session_token(token)

    firebase_app = get_firebase_app() if (HAS_FIREBASE and firebase_auth) else None

    if firebase_app:
        # --- PRODUCTION PATH: full cryptographic verification ---
        try:
            decoded = firebase_auth.verify_id_token(token)
            return decoded["uid"]
        except Exception as err:
            logger.warning(f"Firebase ID token verification failed: {err}")
            if settings.DEBUG:
                logger.warning(
                    "DEBUG mode: falling back to unverified JWT decode. "
                    "Ensure the backend service-account JSON matches the mobile app's Firebase project "
                    "(see frontend/google-services.json project_id)."
                )
                uid = _extract_uid_from_unverified_token(token)
                logger.info(f"Dev-mode fallback: extracted firebase UID '{uid}' from unverified JWT")
                return uid
            raise ValueError("Invalid or expired authentication token") from err
    else:
        # --- DEV / CI PATH: signature NOT verified, payload decoded only ---
        logger.warning(
            "Firebase Admin SDK unavailable - decoding JWT without signature verification "
            "(DEV MODE ONLY, not safe for production)"
        )
        uid = _extract_uid_from_unverified_token(token)
        logger.info(f"Dev-mode: extracted firebase UID '{uid}' from unverified JWT")
        return uid


async def get_current_firebase_uid(authorization: Optional[str] = Header(None)) -> str:
    """
    Verifies the Firebase ID token from the `Authorization: Bearer <token>` header
    and returns the caller's real Firebase UID. Thin header-parsing wrapper around
    verify_firebase_id_token — see that function for the actual verification logic.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or malformed Authorization header")

    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(status_code=401, detail="Missing bearer token")

    try:
        return verify_firebase_id_token(token)
    except ValueError as exc:
        logger.warning(f"Token verification failed: {exc}")
        raise HTTPException(status_code=401, detail="Invalid or expired authentication token") from exc
```

Note: `_extract_uid_from_app_session_token` already raises `ValueError` on any failure (see its
existing implementation) so it composes directly into `verify_firebase_id_token`'s `ValueError`
contract with no change needed.

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd backend && python -m pytest tests/test_security.py -v`
Expected: all 6 tests PASS. If the async tests fail with "async def functions are not natively
supported", add `pytest-asyncio>=0.24.0` to `backend/requirements.txt` and either mark each
async test with `@pytest.mark.asyncio` (already shown above) plus a `backend/pytest.ini` with:

```ini
[pytest]
asyncio_mode = auto
```

- [ ] **Step 6: Run the existing password-hash regression test**

Run: `cd backend && python -m pytest tests/test_password_hash.py -v`
Expected: PASS, unchanged — confirms the refactor didn't disturb unrelated code in the same file.

- [ ] **Step 7: Stage (do NOT commit)**

```bash
cd D:/Projects/saftey/WomenSafetyApp
git add backend/app/core/security.py backend/tests/test_security.py backend/pytest.ini backend/requirements.txt
```

---

### Task 2: Build the `get_current_user_id` identity-resolution dependency

**Files:**
- Create: `backend/app/core/identity.py`
- Test: `backend/tests/test_identity.py` (create)

**Interfaces:**
- Consumes: `get_current_firebase_uid` from Task 1 (`backend/app/core/security.py`).
- Consumes: `UserRepository.get_by_firebase_uid(firebase_uid: str) -> Optional[Dict[str, Any]]`
  (existing, `backend/app/repositories/user_repository.py:93-104`) — returns a dict containing
  an `"id"` key (the `public.users.id` UUID) when found, `None` otherwise.
- Produces: `get_current_user_id(firebase_uid: str = Depends(get_current_firebase_uid)) -> str`
  — the dependency every future migrated route will use for data scoping. Raises
  `HTTPException(404, ...)` if the Firebase UID has no matching `public.users` row yet, and
  `HTTPException(503, ...)` if the profile lookup itself fails (Supabase unreachable) — per the
  spec's error-handling section, this must never silently fall through to stale/local data.

- [ ] **Step 1: Write the failing tests**

Create `backend/tests/test_identity.py`:

```python
import sys
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pytest
from fastapi import HTTPException
from app.core.identity import get_current_user_id


@pytest.mark.asyncio
async def test_get_current_user_id_resolves_existing_profile():
    with patch("app.core.identity.UserRepository") as MockRepo:
        MockRepo.return_value.get_by_firebase_uid.return_value = {
            "id": "11111111-1111-1111-1111-111111111111",
            "firebase_uid": "fb-uid-abc",
        }
        result = await get_current_user_id(firebase_uid="fb-uid-abc")
        assert result == "11111111-1111-1111-1111-111111111111"
        MockRepo.return_value.get_by_firebase_uid.assert_called_once_with("fb-uid-abc")


@pytest.mark.asyncio
async def test_get_current_user_id_raises_404_when_no_profile():
    with patch("app.core.identity.UserRepository") as MockRepo:
        MockRepo.return_value.get_by_firebase_uid.return_value = None
        with pytest.raises(HTTPException) as exc_info:
            await get_current_user_id(firebase_uid="fb-uid-unknown")
        assert exc_info.value.status_code == 404


@pytest.mark.asyncio
async def test_get_current_user_id_raises_503_when_supabase_unreachable():
    """Spec requirement (error-handling section): an unreachable Supabase must surface as
    an explicit error, never a silent fallback to stale/local data in production."""
    with patch("app.core.identity.UserRepository") as MockRepo:
        MockRepo.return_value.get_by_firebase_uid.side_effect = ConnectionError("network down")
        with pytest.raises(HTTPException) as exc_info:
            await get_current_user_id(firebase_uid="fb-uid-abc")
        assert exc_info.value.status_code == 503
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && python -m pytest tests/test_identity.py -v`
Expected: `ModuleNotFoundError: No module named 'app.core.identity'`

- [ ] **Step 3: Implement `get_current_user_id`**

Create `backend/app/core/identity.py`:

```python
from fastapi import Depends, HTTPException
from app.core.security import get_current_firebase_uid
from app.core.logging import logger
from app.repositories.user_repository import UserRepository


async def get_current_user_id(firebase_uid: str = Depends(get_current_firebase_uid)) -> str:
    """
    Resolves the verified Firebase UID (see get_current_firebase_uid) to the real
    public.users.id — the canonical identity used for scoping every table's user_id
    foreign key. Raises 404 if the caller has a valid Firebase token but no profile
    row yet (new signup that hasn't completed profile setup). Raises 503 if the lookup
    itself fails (e.g. Supabase unreachable) — never silently falls through to stale or
    partial data.
    """
    try:
        user = UserRepository().get_by_firebase_uid(firebase_uid)
    except Exception as exc:
        logger.error(f"Profile lookup failed for firebase_uid={firebase_uid[:8]}...: {exc}")
        raise HTTPException(
            status_code=503,
            detail="Profile lookup temporarily unavailable. Please try again.",
        ) from exc

    if user is None:
        raise HTTPException(
            status_code=404,
            detail="No profile found for this account. Complete profile setup first.",
        )
    return user["id"]
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && python -m pytest tests/test_identity.py -v`
Expected: all three tests PASS.

- [ ] **Step 5: Stage (do NOT commit)**

```bash
cd D:/Projects/saftey/WomenSafetyApp
git add backend/app/core/identity.py backend/tests/test_identity.py
```

---

### Task 3: Make `/auth/verify-token` real

**Files:**
- Modify: `backend/app/api/v1/auth/router.py:10-12`
- Test: `backend/tests/test_auth_router.py` (create)

**Interfaces:**
- Consumes: `verify_firebase_id_token` from Task 1, `UserRepository.get_by_firebase_uid` (as in
  Task 2), `create_app_session_token` (existing, `backend/app/core/security.py:32-40`).
- Produces: `POST /api/v1/auth/verify-token` now does real work instead of returning
  `TokenResponse(access_token="mock_access_token_jwt", user_id="user_mock_123")` unconditionally.

**Context:** `LoginRequest` (`backend/app/schemas/auth.py:15-16`) already carries a real
`firebase_id_token: str` field that the current handler silently ignores — confirmed during
planning that this endpoint is a complete stub despite receiving real input.

- [ ] **Step 1: Write the failing tests**

Create `backend/tests/test_auth_router.py`:

```python
import base64
import json
import sys
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def _fake_firebase_token(uid: str) -> str:
    payload = base64.urlsafe_b64encode(json.dumps({"uid": uid}).encode()).rstrip(b"=").decode()
    return f"header.{payload}.signature"


def test_verify_token_returns_real_session_for_known_profile():
    token = _fake_firebase_token("fb-uid-known")
    with patch("app.api.v1.auth.router.UserRepository") as MockRepo:
        MockRepo.return_value.get_by_firebase_uid.return_value = {
            "id": "22222222-2222-2222-2222-222222222222",
            "firebase_uid": "fb-uid-known",
            "full_name": "Test User",
        }
        resp = client.post("/api/v1/auth/verify-token", json={"firebase_id_token": token})
    assert resp.status_code == 200
    body = resp.json()
    assert body["user_id"] == "22222222-2222-2222-2222-222222222222"
    assert body["access_token"] != "mock_access_token_jwt"


def test_verify_token_returns_404_for_unknown_profile():
    token = _fake_firebase_token("fb-uid-unknown")
    with patch("app.api.v1.auth.router.UserRepository") as MockRepo:
        MockRepo.return_value.get_by_firebase_uid.return_value = None
        resp = client.post("/api/v1/auth/verify-token", json={"firebase_id_token": token})
    assert resp.status_code == 404


def test_verify_token_rejects_malformed_token():
    resp = client.post("/api/v1/auth/verify-token", json={"firebase_id_token": "not-a-jwt"})
    assert resp.status_code == 401
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && python -m pytest tests/test_auth_router.py -v`
Expected: FAIL — `test_verify_token_returns_real_session_for_known_profile` and
`test_verify_token_returns_404_for_unknown_profile` fail because the current handler always
returns the hardcoded mock 200 response regardless of input;
`test_verify_token_rejects_malformed_token` fails because it currently also returns 200.

- [ ] **Step 3: Implement the real handler**

In `backend/app/api/v1/auth/router.py`, add the import and replace the `/verify-token` handler:

```python
from app.core.security import create_app_session_token, get_current_firebase_uid, hash_password, verify_password, verify_firebase_id_token
from app.repositories.user_repository import UserRepository
```

```python
@router.post("/verify-token", response_model=TokenResponse)
async def verify_id_token(payload: LoginRequest):
    """
    Verifies the Firebase ID token supplied by the client, resolves it to the caller's
    real public.users profile, and returns an app session token. 404 if the token is
    valid but no profile exists yet (client should route the user to profile setup).
    """
    try:
        firebase_uid = verify_firebase_id_token(payload.firebase_id_token)
    except ValueError as exc:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired authentication token",
        ) from exc

    user_repo = UserRepository()
    user_record = user_repo.get_by_firebase_uid(firebase_uid)
    if user_record is None:
        raise HTTPException(
            status_code=404,
            detail="No profile found for this account. Complete profile setup first.",
        )

    safe_user = {k: v for k, v in user_record.items() if k != "password_hash"}
    return TokenResponse(
        access_token=create_app_session_token(firebase_uid),
        user_id=user_record.get("id"),
        user=safe_user,
    )
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && python -m pytest tests/test_auth_router.py -v`
Expected: all 3 tests PASS.

- [ ] **Step 5: Stage (do NOT commit)**

```bash
cd D:/Projects/saftey/WomenSafetyApp
git add backend/app/api/v1/auth/router.py backend/tests/test_auth_router.py
```

---

### Task 4: Delete the dead `authentication-service` edge function

**Files:**
- Delete: `backend/authentication-service/` (entire directory)
- Modify: `backend/deno.json:8`
- Modify: `README.md:12`

**Interfaces:** None — this task has no code dependency on Tasks 1-3 and can run independently,
but is sequenced last among the code-touching tasks so a reviewer can confirm Tasks 1-3 land
cleanly first.

- [ ] **Step 1: Confirm zero callers before deleting**

```bash
cd D:/Projects/saftey/WomenSafetyApp
grep -rn "authentication-service" frontend/src
```

Expected: no output (zero matches — already confirmed during spec investigation; re-confirm
here in case something changed since).

- [ ] **Step 2: Delete the edge function directory**

```bash
cd D:/Projects/saftey/WomenSafetyApp
rm -rf backend/authentication-service
```

- [ ] **Step 3: Remove it from `backend/deno.json`'s check task**

In `backend/deno.json`, change:

```json
"check": "deno check authentication-service/index.ts user-service/index.ts emergency-service/index.ts gps-service/index.ts notification-service/index.ts ai-service/index.ts incident-report-service/index.ts storage/index.ts"
```

to:

```json
"check": "deno check user-service/index.ts emergency-service/index.ts gps-service/index.ts notification-service/index.ts ai-service/index.ts incident-report-service/index.ts storage/index.ts"
```

- [ ] **Step 4: Remove it from the README directory tree**

In `README.md`, delete the line:

```
  authentication-service/
```

(immediately under the `backend/                    # microservices` line).

- [ ] **Step 5: Verify `deploy-functions.sh` needs no change**

Run: `grep -n "authentication-service" deployment/deploy-functions.sh`
Expected: no output. (Confirmed during planning — the script stages `backend/*/` directories
generically by scanning for an `index.ts`, no hardcoded service list, so deleting the directory
in Step 2 is sufficient on its own.)

- [ ] **Step 6: Stage (do NOT commit)**

```bash
cd D:/Projects/saftey/WomenSafetyApp
git add -A backend/authentication-service backend/deno.json README.md
git status --short
```

Expected: shows `D  backend/authentication-service/index.ts` (or similar deletion marker) plus
the two modified files.

---

### Task 5: Full regression pass

**Files:** None modified — verification only.

**Interfaces:** None.

- [ ] **Step 1: Pin `pytest`/`pytest-asyncio` if Task 1 added them**

Confirm `backend/requirements.txt` includes `pytest>=8.0.0` and `pytest-asyncio>=0.24.0` if
Task 1's Step 5 needed them (pytest itself is present in the dev environment at 9.1.1 but was
not previously pinned in `requirements.txt` — pin it now so CI/other machines get it too).

- [ ] **Step 2: Run the full backend test suite**

```bash
cd D:/Projects/saftey/WomenSafetyApp/backend
python -m pytest tests/ -v
```

Expected: every test PASSES — `test_password_hash.py` (pre-existing, unmodified),
`test_security.py`, `test_identity.py`, `test_auth_router.py` (all new, from Tasks 1-3).

- [ ] **Step 3: Re-grep to confirm the dead edge function has no remaining references**

```bash
cd D:/Projects/saftey/WomenSafetyApp
grep -rn "authentication-service" . --include="*.ts" --include="*.py" --include="*.md" --include="*.json" --include="*.sh"
```

Expected: no output, or only the (pre-existing, out-of-scope per the spec) cosmetic seed-data
row in `database/seed/mock_dashboard.sql` — leave that one alone, it's mock uptime-dashboard
data unrelated to the actual service.

- [ ] **Step 4: Confirm the FastAPI app still boots**

```bash
cd D:/Projects/saftey/WomenSafetyApp/backend
python -c "from app.main import app; print('OK:', app.title)"
```

Expected: prints `OK: Aegis AI Women Safety Backend` with no import errors — confirms Task 3's
new imports in `router.py` and Task 1's refactor in `security.py` didn't break app startup.

- [ ] **Step 5: Final status check (no commit)**

```bash
cd D:/Projects/saftey/WomenSafetyApp
git status --short
```

Confirm everything from Tasks 1-4 shows as staged (`A`/`M`/`D` in the left column, not the
right) and nothing unrelated got picked up. **Do not commit** — report the branch name
(`feature/auth-migration-fastapi-phase1`) and staged file list back to the owner.
