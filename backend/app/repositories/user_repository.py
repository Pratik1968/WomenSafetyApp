from typing import Optional, Dict, Any
from datetime import datetime, timezone
from app.schemas.user import UserCreate
from app.db.database import get_supabase
from app.core.logging import logger

TABLE = "users"

GENDER_ENUM_MAP = {
    "female": "FEMALE",
    "male": "MALE",
    "other": "OTHER",
    "prefer not to say": "PREFER_NOT_TO_SAY",
}


def normalize_gender(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    key = value.strip().lower()
    return GENDER_ENUM_MAP.get(key, value.strip().upper().replace(" ", "_"))


class UserRepository:
    """User profiles are stored exclusively in Supabase (public.users), same as devices."""

    def _client(self):
        client = get_supabase()
        if client is None:
            raise RuntimeError(
                "Supabase is not configured. Set SUPABASE_URL and SUPABASE_KEY (service_role) in .env."
            )
        return client

    def get_by_firebase_uid(self, firebase_uid: str) -> Optional[Dict[str, Any]]:
        client = self._client()
        result = client.table(TABLE).select("*").eq("firebase_uid", firebase_uid).limit(1).execute()
        return result.data[0] if result.data else None

    def upsert_profile(self, payload: UserCreate) -> Dict[str, Any]:
        client = self._client()
        now = datetime.now(timezone.utc).isoformat()

        fields: Dict[str, Any] = {
            "firebase_uid": payload.firebase_uid,
            "full_name": payload.full_name,
            "updated_at": now,
        }
        if payload.phone is not None:
            fields["phone"] = payload.phone
        if payload.email is not None:
            fields["email"] = payload.email
        if payload.gender is not None:
            fields["gender"] = normalize_gender(payload.gender)
        if payload.blood_group is not None:
            fields["blood_group"] = payload.blood_group
        if payload.date_of_birth is not None:
            fields["date_of_birth"] = payload.date_of_birth
        if payload.medical_notes is not None:
            fields["medical_notes"] = payload.medical_notes

        if payload.phone:
            existing_by_phone = self.get_by_identifier(payload.phone)
            if existing_by_phone and existing_by_phone.get("firebase_uid") != payload.firebase_uid:
                result = client.table(TABLE).update(fields).eq("id", existing_by_phone["id"]).execute()
                logger.info(
                    f"Profile merged for phone={payload.phone[-4:]} into firebase_uid={payload.firebase_uid[:8]}..."
                )
                return result.data[0] if result.data else fields

        result = client.table(TABLE).upsert(fields, on_conflict="firebase_uid").execute()
        logger.info(f"Profile upserted for firebase_uid={payload.firebase_uid[:8]}...")
        return result.data[0] if result.data else fields

    def get_by_identifier(self, identifier: str) -> Optional[Dict[str, Any]]:
        """Look up user record in database by phone or email."""
        client = self._client()
        clean_id = identifier.strip()

        # 1. Search by exact phone
        res = client.table(TABLE).select("*").eq("phone", clean_id).limit(1).execute()
        if res.data:
            return res.data[0]

        # 2. Search by email
        res = client.table(TABLE).select("*").eq("email", clean_id).limit(1).execute()
        if res.data:
            return res.data[0]

        # 3. Clean digits for phone match
        digits = "".join(filter(str.isdigit, clean_id))
        if digits and len(digits) >= 7:
            all_users = client.table(TABLE).select("*").execute()
            if all_users.data:
                for u in all_users.data:
                    u_phone = u.get("phone")
                    if u_phone:
                        u_digits = "".join(filter(str.isdigit, u_phone))
                        if u_digits and (u_digits == digits or u_digits.endswith(digits) or digits.endswith(u_digits)):
                            return u

        return None

    def relink_firebase_uid(self, user_id: str, new_firebase_uid: str) -> Dict[str, Any]:
        """Point an existing row (found by phone) at the Firebase UID the caller just verified with."""
        client = self._client()

        now = datetime.now(timezone.utc).isoformat()
        result = (
            client.table(TABLE)
            .update({"firebase_uid": new_firebase_uid, "updated_at": now})
            .eq("id", user_id)
            .execute()
        )
        return result.data[0] if result.data else {}

    def set_password(self, firebase_uid: str, password_hash: str) -> Dict[str, Any]:
        """Store password_hash in database for user."""
        existing = self.get_by_firebase_uid(firebase_uid)
        if not existing:
            raise ValueError("No user profile found for this account. Complete phone signup first.")

        client = self._client()
        now = datetime.now(timezone.utc).isoformat()
        res = client.table(TABLE).update({
            "password_hash": password_hash,
            "updated_at": now,
        }).eq("firebase_uid", firebase_uid).execute()
        if not res.data:
            raise RuntimeError(
                "Could not save password. Ensure the users table has a password_hash column."
            )
        logger.info(f"Password set in DB for firebase_uid={firebase_uid[:8]}...")
        return res.data[0]

    def has_password(self, firebase_uid: str) -> bool:
        user = self.get_by_firebase_uid(firebase_uid)
        return bool(user and user.get("password_hash"))

