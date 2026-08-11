import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")

supabase_client: Client = None

if SUPABASE_URL and SUPABASE_KEY and "your-supabase-project-id" not in SUPABASE_URL:
    try:
        supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("Backend: Connected to Supabase client successfully.")
    except Exception as e:
        print(f"Warning: Failed to initialize Supabase client: {e}")
else:
    print("Warning: SUPABASE_URL or SUPABASE_KEY missing in .env. Supabase client uninitialized.")

def get_supabase() -> Client:
    return supabase_client
