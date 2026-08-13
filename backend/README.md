# Aegis Women Safety App - Backend

Unified FastAPI Backend Server integrated with Supabase for FCM tokens, push notifications, emergency contacts, and SOS incidents.

## Directory Structure

```
backend/
├── app/
│   ├── main.py               # FastAPI entrypoint & router inclusion
│   ├── database.py           # Supabase DB connection client
│   ├── schemas/              # Pydantic data schemas
│   └── routers/              # API Route Handlers
├── database/                 # SQL schemas & migration scripts
├── tests/                    # Backend automated tests
├── .env                      # Local environment configuration
├── requirements.txt          # Python dependencies
└── README.md
```

## Setup & Running locally

1. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Run Server**:
   ```bash
   uvicorn app.main:app --reload --port 8000 --host 0.0.0.0
   ```

3. **API Documentation**:
   Once running, access Swagger interactive API docs at `http://localhost:8000/docs`.
