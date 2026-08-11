from app.core.config import settings
from app.core.logging import logger
# pyrefly: ignore [missing-import]
from supabase import create_client, Client

supabase_client: Client = None

if settings.SUPABASE_URL and settings.SUPABASE_KEY and "your-supabase-project-id" not in settings.SUPABASE_URL:
    try:
        supabase_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
        logger.info("Connected to Supabase client successfully.")
    except Exception as e:
        logger.warning(f"Failed to initialize Supabase client: {e}")
else:
    logger.info("Supabase URL or Key not set. Using local database/ORM engine.")

def get_supabase() -> Client:
    return supabase_client
