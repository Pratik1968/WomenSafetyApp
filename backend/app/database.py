import os
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client, Client

# Explicitly load .env from root directory or ai-service directory
ROOT_DIR = Path(__file__).resolve().parent
ai_service_env = ROOT_DIR / "ai-service" / ".env"
root_env = ROOT_DIR / ".env"

if root_env.exists():
    load_dotenv(dotenv_path=root_env)
elif ai_service_env.exists():
    load_dotenv(dotenv_path=ai_service_env)
else:
    load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "").strip()
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "").strip()

supabase_client: Client = None

if SUPABASE_URL and SUPABASE_KEY and "your-supabase-project-id" not in SUPABASE_URL:
    try:
        supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("Backend: Connected to Supabase client successfully.")
    except Exception as e:
        print(f"[Database Warning]: Failed to initialize Supabase client: {e}")
else:
    print("[Database Warning]: SUPABASE_URL or SUPABASE_KEY missing in .env. Supabase client uninitialized.")

def get_supabase() -> Client:
    return supabase_client
