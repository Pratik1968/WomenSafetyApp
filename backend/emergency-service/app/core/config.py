import os
from pydantic_settings import BaseSettings
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    PROJECT_NAME: str = "Aegis Emergency Microservice"
    API_V1_STR: str = "/api/v1"

    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv(
        "SUPABASE_SERVICE_ROLE_KEY", os.getenv("SUPABASE_KEY", os.getenv("SUPABASE_ANON_KEY", ""))
    )

    class Config:
        case_sensitive = True

settings = Settings()

_supabase_client: Client | None = None

def get_supabase() -> Client | None:
    global _supabase_client
    if _supabase_client is not None:
        return _supabase_client

    if settings.SUPABASE_URL and settings.SUPABASE_SERVICE_ROLE_KEY:
        try:
            _supabase_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
            return _supabase_client
        except Exception as e:
            print(f"Failed to initialize Supabase client: {e}")
            return None
    return None
