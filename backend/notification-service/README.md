# Aegis Notification Microservice & Supabase Edge Function

This directory contains the dual-mode Notification Service for `WomenSafetyApp`:

1. **FastAPI Microservice** (`app/`): Standalone Python microservice (FastAPI + Uvicorn + Pydantic + Supabase SDK + Firebase Admin SDK). This is the one that sends real FCM pushes — the Edge Function below only registers tokens and logs notifications, it does not call Firebase.
2. **Supabase Edge Function** (`index.ts`): Serverless Deno Edge Function ready for independent deployment to Supabase. Handles device registration and notification logging only.
3. **Database Schema** (`schema.sql`): PostgreSQL schema script for `public.devices` and `public.notifications` tables in Supabase.

---

## 🔥 Firebase Admin SDK setup (required for real push delivery)

`POST /api/v1/notifications/send` looks up the target user's active FCM tokens (from `public.devices`) and sends a real push via the Firebase Admin SDK before logging the result. Without Firebase credentials configured, it silently falls back to log-only "dev mode" — no crash, but no push is sent.

You need a **Firebase service-account JSON** (different from `google-services.json` — that one is client-side only). This one grants full admin access to the Firebase project, so:
- **Never commit it.** `credentials/` is already gitignored.
- Provide it one of two ways, in priority order:
  1. `FIREBASE_SERVICE_ACCOUNT_JSON` — the raw JSON content as a single env var (preferred for cloud/edge deployments where mounting a file isn't convenient):
     ```bash
     export FIREBASE_SERVICE_ACCOUNT_JSON="$(cat credentials/firebase-service-account.json)"
     ```
  2. `FIREBASE_SERVICE_ACCOUNT_PATH` — a file path (defaults to `credentials/firebase-service-account.json`, convenient for local dev / Docker where the file is copied into the image).
- Also set `FIREBASE_PROJECT_ID` (e.g. `women-safety-3d446` — must match the mobile app's `google-services.json` → `project_info.project_id`).

---

## 🗄️ 1. Database Schema Deployment

Before starting either service, apply `schema.sql` to your Supabase project database:

1. Open your **Supabase Dashboard** -> **SQL Editor**.
2. Copy and paste the contents of `schema.sql`.
3. Click **Run** to create the `public.devices` and `public.notifications` tables and indexes.

---

## 🐍 2. Running the FastAPI Microservice

### Option A: Local Python Environment

```bash
cd backend/notification-service

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set environment variables
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Run FastAPI service
uvicorn app.main:app --reload --port 8000
```

- Swagger API Docs: `http://localhost:8000/docs`
- Health Check: `http://localhost:8000/health`

### Option B: Docker Container

```bash
cd backend/notification-service

# Build container image
docker build -t aegis-notification-service .

# Run container
docker run -d -p 8000:8000 \
  -e SUPABASE_URL="https://your-project.supabase.co" \
  -e SUPABASE_SERVICE_ROLE_KEY="your-service-role-key" \
  --name aegis-notification aegis-notification-service
```

---

## ⚡ 3. Deploying as Supabase Edge Function

You can deploy `index.ts` directly as an independent Edge Function using the Supabase CLI:

### Prerequisites:
Install the Supabase CLI:
```bash
# macOS / Linux
brew install supabase/tap/supabase

# Windows (Scoop)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

### Deployment Commands:

```bash
# 1. Login to Supabase CLI
supabase login

# 2. Link your local project to your Supabase Project Reference ID
supabase link --project-ref your-project-ref-id

# 3. Deploy the notification-service Edge Function
supabase functions deploy notification-service --project-ref your-project-ref-id

# 4. Set required secrets for the Edge Function
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="your-service-role-key" --project-ref your-project-ref-id
```

### Invoking the Edge Function:

- **Register Device FCM Token**:
  `POST https://<project-ref>.supabase.co/functions/v1/notification-service/devices/register`
- **Send Push Notification**:
  `POST https://<project-ref>.supabase.co/functions/v1/notification-service/notifications/send`
