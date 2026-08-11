# New Collaborator Setup

Repo has two independent apps: `backend/` (FastAPI) and `frontend/` (Expo/React Native, native build — not Expo Go, because of `@react-native-firebase`).

## 1. Prerequisites

- Node.js + npm
- Python 3.11 + `venv`
- Android Studio (SDK + at least one emulator) **or** a physical Android device with USB debugging on
- `adb` on PATH (ships with Android Studio's platform-tools)
- Git access to the repo + Supabase project + Firebase project (ask a teammate to add you)

## 2. Files git will NOT give you

Everything below is gitignored. Get these from a teammate (Slack/1Password/etc.) before anything will run.

> The whole `credentials/` folder is gitignored, and git doesn't track empty directories — so after a fresh clone `backend/credentials/` won't exist at all. Create it yourself (`mkdir backend/credentials`) and drop the downloaded JSON in there, named exactly `firebase-service-account.json` (must match `FIREBASE_SERVICE_ACCOUNT_PATH` in `backend/.env`). Never rename/move it without updating that env var to match.

| File | Used by | Get it from |
|---|---|---|
| `backend/.env` | FastAPI settings | copy `backend/.env.example`, fill in real `SUPABASE_KEY`, `DATABASE_URL` |
| `backend/credentials/firebase-service-account.json` | verifies Firebase ID tokens server-side | Firebase Console → Project Settings → Service Accounts → Generate new private key |
| Android debug keystore SHA-1 | Firebase phone-auth (OTP) will silently fail without it | run `cd frontend/android && ./gradlew signingReport` **after** step 3, send the `SHA1` under `debug` to whoever manages the Firebase project, they add it under Project Settings → Your apps → Android app |

`frontend/google-services.json` is the one exception — it **is** committed, so `git clone` already gives it to you. Nothing to request there.

## 3. Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # (source venv/bin/activate on mac/linux)
pip install -r requirements.txt
# drop credentials/firebase-service-account.json in place, create .env from .env.example (step 2)
uvicorn app.main:app --reload --port 8000
```
Verify at `http://localhost:8000/docs`.

## 4. Frontend

```bash
cd frontend
npm install
npx expo run:android      # first run: generates android/, builds & installs a dev client, boots Metro
```
Later runs, once `android/` exists, `npx expo start` + pressing `a` is enough — you only need `expo run:android` again after adding/upgrading a native module (anything with an Expo config plugin, e.g. `@react-native-firebase/*`, `expo-notifications`).

## 5. Connecting the app to the local backend

**The backend itself always starts the same way**, regardless of who's connecting to it:
```bash
cd backend && uvicorn app.main:app --reload --port 8000
```
`backend/.env` has `HOST=0.0.0.0`, so it listens on all network interfaces — reachable as both `localhost:8000` (from the same machine) and `<your-LAN-IP>:8000` (from other devices on the same Wi-Fi). Nothing to configure here.

**What changes is what the frontend points at**, in `frontend/src/api/config.ts` (`http://<host>:8000/api/v1`) — and it depends on where the app is running, because "localhost" always means the device the app itself is running on, never your PC:
- **Android emulator**: `10.0.2.2` (the default) is auto-mapped to your PC's `localhost` — nothing to do.
- **Physical device over USB**: `localhost` on the phone means the phone, not your PC, so it won't reach the backend. Either run `adb reverse tcp:8000 tcp:8000` every time you reconnect the device (doesn't persist across reboots/reconnects)...
- **...or override instead**: copy `frontend/.env.example` → `frontend/.env` and set `EXPO_PUBLIC_API_BASE_URL=http://<your-PC-LAN-IP>:8000/api/v1` — no `adb reverse`, no USB even needed (works over Wi-Fi as long as phone + PC are on the same network). Expo/Metro inlines `EXPO_PUBLIC_*` vars at bundle time, so restart `npx expo start` (no native rebuild) after changing it.

  Find your PC's current LAN IP with `ipconfig` in PowerShell (look under your `Wi-Fi` adapter's `IPv4 Address` — ignore any `vEthernet`/WSL entries) — it changes across networks and sometimes reboots (DHCP), so re-check it if the app suddenly can't reach the backend.

## 6. Sanity check

```bash
cd frontend && npm test     # 43 suites / 131 tests should pass
```

## 7. When pulling someone else's commits

- `package.json` changed → `npm install`
- `requirements.txt` changed → `pip install -r requirements.txt`
- A native module was added/changed (new Expo plugin, `google-services.json`, Android permissions in `app.json`) → `npx expo run:android` again, not just `expo start`
- `backend/.env.example` gained a new key → add it to your own `backend/.env` (it won't auto-populate)
- `backend/database/schema.sql` changed → apply the diff manually against the shared Supabase project (no auto-migration runner wired up yet; `alembic/` exists but isn't part of the day-to-day flow)
