from typing import Optional, Dict, Any
from datetime import datetime, timezone
from sqlalchemy import inspect, text
from sqlalchemy.exc import IntegrityError

from app.db.session import SessionLocal, engine
from app.models.user import User
from app.schemas.user import UserCreate
from app.db.database import get_supabase
from app.core.logging import logger

TABLE = "users"

# public.users.gender is a Postgres enum (gender_enum) with uppercase/underscore
# labels (FEMALE, MALE, OTHER, PREFER_NOT_TO_SAY). The mobile UI shows
# human-friendly labels ("Female", "Prefer not to say") - normalize here so the
# UI never needs to know the backend's enum casing.
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


def _dt_to_iso(value: Any) -> Any:
    return value.isoformat() if hasattr(value, "isoformat") else value


def _user_to_dict(user: User) -> Dict[str, Any]:
    return {
        "id": user.id,
        "firebase_uid": user.firebase_uid,
        "full_name": user.full_name,
        "phone": user.phone,
        "email": user.email,
        "gender": user.gender,
        "blood_group": user.blood_group,
        "date_of_birth": user.date_of_birth,
        "medical_notes": user.medical_notes,
        "password_hash": user.password_hash,
        "is_active": user.is_active,
        "created_at": _dt_to_iso(user.created_at),
        "updated_at": _dt_to_iso(user.updated_at),
    }


class UserRepository:
    """User profiles use Supabase when configured, with SQLite fallback for local development."""

    _local_schema_checked = False

    def _client(self):
        return get_supabase()

    def _ensure_local_schema(self) -> None:
        if UserRepository._local_schema_checked:
            return

        inspector = inspect(engine)
        if "users" not in inspector.get_table_names():
            UserRepository._local_schema_checked = True
            return

        existing_columns = {column["name"] for column in inspector.get_columns("users")}
        missing_columns = {
            "gender": "VARCHAR(50)",
            "blood_group": "VARCHAR(20)",
            "date_of_birth": "VARCHAR(20)",
            "medical_notes": "TEXT",
            "password_hash": "VARCHAR(255)",
        }

        with engine.begin() as conn:
            for column_name, column_type in missing_columns.items():
                if column_name not in existing_columns:
                    conn.execute(text(f"ALTER TABLE users ADD COLUMN {column_name} {column_type}"))
                    logger.info(f"Added missing local users.{column_name} column")

        UserRepository._local_schema_checked = True

    def _local_session(self):
        self._ensure_local_schema()
        return SessionLocal()

    def get_by_firebase_uid(self, firebase_uid: str) -> Optional[Dict[str, Any]]:
        client = self._client()
        if client is not None:
            result = client.table(TABLE).select("*").eq("firebase_uid", firebase_uid).limit(1).execute()
            return result.data[0] if result.data else None

        db = self._local_session()
        try:
            user = db.query(User).filter(User.firebase_uid == firebase_uid).first()
            return _user_to_dict(user) if user else None
        finally:
            db.close()

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

        # If this phone is already registered under a different firebase_uid, update that
        # row instead of inserting a duplicate (user verified OTP on this phone).
        if payload.phone:
            existing_by_phone = self.get_by_identifier(payload.phone)
            if existing_by_phone and existing_by_phone.get("firebase_uid") != payload.firebase_uid:
                if client is None:
                    return self._update_local_profile(existing_by_phone["id"], fields)
                result = client.table(TABLE).update(fields).eq("id", existing_by_phone["id"]).execute()
                logger.info(
                    f"Profile merged for phone={payload.phone[-4:]} into firebase_uid={payload.firebase_uid[:8]}..."
                )
                return result.data[0] if result.data else fields

        if client is None:
            return self._upsert_local_profile(fields)

        result = client.table(TABLE).upsert(fields, on_conflict="firebase_uid").execute()
        logger.info(f"Profile upserted for firebase_uid={payload.firebase_uid[:8]}...")
        return result.data[0] if result.data else fields

    def _update_local_profile(self, user_id: str, fields: Dict[str, Any]) -> Dict[str, Any]:
        db = self._local_session()
        try:
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                raise RuntimeError("Local user profile disappeared before update.")
            for key, value in fields.items():
                if hasattr(user, key):
                    setattr(user, key, self._local_value(key, value))
            db.commit()
            db.refresh(user)
            logger.info(f"Local profile merged for firebase_uid={fields['firebase_uid'][:8]}...")
            return _user_to_dict(user)
        finally:
            db.close()

    def _set_local_password(self, firebase_uid: str, password_hash: str) -> Dict[str, Any]:
        db = self._local_session()
        try:
            user = db.query(User).filter(User.firebase_uid == firebase_uid).first()
            if not user:
                raise ValueError("No user profile found for this account. Complete phone signup first.")
            user.password_hash = password_hash
            user.updated_at = datetime.utcnow()
            db.commit()
            db.refresh(user)
            logger.info(f"Password set in local DB for firebase_uid={firebase_uid[:8]}...")
            return _user_to_dict(user)
        finally:
            db.close()

    def _local_value(self, key: str, value: Any) -> Any:
        if key == "updated_at":
            return datetime.utcnow()
        return value

    def _upsert_local_profile(self, fields: Dict[str, Any]) -> Dict[str, Any]:
        db = self._local_session()
        try:
            user = db.query(User).filter(User.firebase_uid == fields["firebase_uid"]).first()
            if user is None:
                user = User(**{key: self._local_value(key, value) for key, value in fields.items() if hasattr(User, key)})
                db.add(user)
            else:
                for key, value in fields.items():
                    if hasattr(user, key):
                        setattr(user, key, self._local_value(key, value))

            try:
                db.commit()
            except IntegrityError as err:
                db.rollback()
                raise RuntimeError("A profile already exists with this phone number or email.") from err

            db.refresh(user)
            logger.info(f"Local profile upserted for firebase_uid={fields['firebase_uid'][:8]}...")
            return _user_to_dict(user)
        finally:
            db.close()

    def get_by_identifier(self, identifier: str) -> Optional[Dict[str, Any]]:
        """Look up user record in database by phone or email."""
        client = self._client()
        clean_id = identifier.strip()

        if client is None:
            db = self._local_session()
            try:
                user = db.query(User).filter(User.phone == clean_id).first()
                if user:
                    return _user_to_dict(user)

                user = db.query(User).filter(User.email == clean_id).first()
                if user:
                    return _user_to_dict(user)

                digits = "".join(filter(str.isdigit, clean_id))
                if digits and len(digits) >= 7:
                    for candidate in db.query(User).all():
                        if candidate.phone:
                            candidate_digits = "".join(filter(str.isdigit, candidate.phone))
                            if (
                                candidate_digits
                                and (
                                    candidate_digits == digits
                                    or candidate_digits.endswith(digits)
                                    or digits.endswith(candidate_digits)
                                )
                            ):
                                return _user_to_dict(candidate)
                return None
            finally:
                db.close()

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

    def set_password(self, firebase_uid: str, password_hash: str) -> Dict[str, Any]:
        """Store password_hash in database for user."""
        existing = self.get_by_firebase_uid(firebase_uid)
        if not existing:
            raise ValueError("No user profile found for this account. Complete phone signup first.")

        client = self._client()
        now = datetime.now(timezone.utc).isoformat()
        if client is None:
            return self._set_local_password(firebase_uid, password_hash)

        res = client.table(TABLE).update({
            "password_hash": password_hash,
            "updated_at": now,
        }).eq("firebase_uid", firebase_uid).execute()
        if not res.data:
            raise RuntimeError(
                "Could not save password. Ensure the users table has a password_hash column "
                "(run backend/database/supabase_password_hash_migration.sql in Supabase)."
            )
        logger.info(f"Password set in DB for firebase_uid={firebase_uid[:8]}...")
        return res.data[0]

    def has_password(self, firebase_uid: str) -> bool:
        user = self.get_by_firebase_uid(firebase_uid)
        return bool(user and user.get("password_hash"))

