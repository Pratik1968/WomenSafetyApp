from typing import Optional, Dict, Any

from app.repositories.user_repository import UserRepository
from app.schemas.user import UserCreate
from app.core.logging import logger


class UserService:
    """User profiles are stored in Supabase only (see UserRepository)."""

    def __init__(self):
        self.user_repo = UserRepository()

    def get_profile(self, firebase_uid: str, phone_number: Optional[str] = None) -> Optional[Dict[str, Any]]:
        profile = self.user_repo.get_by_firebase_uid(firebase_uid)
        if profile:
            return profile

        if not phone_number:
            return None

        profile = self.user_repo.get_by_identifier(phone_number)
        if not profile:
            return None

        logger.info(
            f"Relinking existing profile (phone match) to firebase_uid={firebase_uid[:8]}..."
        )
        relinked = self.user_repo.relink_firebase_uid(profile["id"], firebase_uid)
        return relinked or {**profile, "firebase_uid": firebase_uid}

    def save_profile(self, payload: UserCreate) -> Dict[str, Any]:
        logger.info(f"Saving profile for firebase_uid={payload.firebase_uid[:8]}...")
        return self.user_repo.upsert_profile(payload)
