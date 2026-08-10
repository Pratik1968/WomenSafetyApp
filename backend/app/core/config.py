import os
from pathlib import Path
from typing import Optional

try:
    from pydantic_settings import BaseSettings
    from pydantic import field_validator
except ImportError:
    try:
        from pydantic import BaseSettings  # Fallback for Pydantic v1
        from pydantic import validator

        def field_validator(*fields, mode=None, **kwargs):
            return validator(*fields, pre=(mode == "before"), **kwargs)
    except ImportError:
        from pydantic import BaseModel as BaseSettings  # Fallback for standard Pydantic

        def field_validator(*fields, mode=None, **kwargs):
            def decorator(func):
                return func
            return decorator

BASE_DIR = Path(__file__).resolve().parent.parent.parent

class Settings(BaseSettings):
    PROJECT_NAME: str = "Aegis AI Women Safety Backend"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    DEBUG: bool = True
    
    # Firebase
    FIREBASE_PROJECT_ID: Optional[str] = "women-safety-3d446"
    FIREBASE_STORAGE_BUCKET: Optional[str] = "women-safety-3d446.appspot.com"
    FIREBASE_SERVICE_ACCOUNT_PATH: str = "credentials/firebase-service-account.json"
    
    # Database
    DATABASE_URL: str = "sqlite:///./women_safety.db"
    SUPABASE_URL: Optional[str] = None
    SUPABASE_KEY: Optional[str] = None
    APP_SESSION_SECRET: Optional[str] = None

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore"
    }

    @property
    def absolute_firebase_credentials_path(self) -> Path:
        path = Path(self.FIREBASE_SERVICE_ACCOUNT_PATH)
        if not path.is_absolute():
            return BASE_DIR / path
        return path

    @field_validator("DEBUG", mode="before")
    @classmethod
    def parse_debug(cls, value):
        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized in {"release", "prod", "production", "false", "0", "no", "off"}:
                return False
            if normalized in {"debug", "dev", "development", "true", "1", "yes", "on"}:
                return True
        return value

settings = Settings()
