import os
import hashlib
import hmac
import base64
import json
import time
from dataclasses import dataclass
from typing import Optional
from fastapi import Depends, Header, HTTPException
from app.core.config import settings
from app.core.firebase import HAS_FIREBASE, get_firebase_app
from app.core.logging import logger

if HAS_FIREBASE:
    from firebase_admin import auth as firebase_auth
else:
    firebase_auth = None

APP_SESSION_PREFIX = "aegis_session."
APP_SESSION_TTL_SECONDS = 30 * 24 * 60 * 60


def _app_session_secret() -> bytes:
    secret = (
        getattr(settings, "APP_SESSION_SECRET", None)
        or settings.SUPABASE_KEY
        or settings.FIREBASE_PROJECT_ID
        or "aegis-development-session-secret"
    )
    return secret.encode("utf-8")


def create_app_session_token(firebase_uid: str) -> str:
    payload = {
        "uid": firebase_uid,
        "exp": int(time.time()) + APP_SESSION_TTL_SECONDS,
    }
    payload_json = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    payload_b64 = base64.urlsafe_b64encode(payload_json).rstrip(b"=").decode("ascii")
    signature = hmac.new(_app_session_secret(), payload_b64.encode("ascii"), hashlib.sha256).hexdigest()
    return f"{APP_SESSION_PREFIX}{payload_b64}.{signature}"


def _extract_uid_from_app_session_token(token: str) -> str:
    if not token.startswith(APP_SESSION_PREFIX):
        raise ValueError("Not an app session token")

    encoded = token.removeprefix(APP_SESSION_PREFIX)
    payload_b64, separator, signature = encoded.partition(".")
    if not separator or not payload_b64 or not signature:
        raise ValueError("Malformed app session token")

    expected_signature = hmac.new(
        _app_session_secret(), payload_b64.encode("ascii"), hashlib.sha256
    ).hexdigest()
    if not hmac.compare_digest(signature, expected_signature):
        raise ValueError("Invalid app session token signature")

    payload_b64 += "=" * (-len(payload_b64) % 4)
    payload = json.loads(base64.urlsafe_b64decode(payload_b64).decode("utf-8"))
    firebase_uid = payload.get("uid")
    expires_at = payload.get("exp")
    if not firebase_uid or not isinstance(expires_at, int) or expires_at <= int(time.time()):
        raise ValueError("Expired app session token")
    return firebase_uid


def _decode_jwt_payload_unverified(token: str) -> dict:
    try:
        parts = token.split(".")
        if len(parts) != 3:
            raise ValueError("Not a valid JWT (expected 3 parts)")
        payload_b64 = parts[1]
        payload_b64 += "=" * (-len(payload_b64) % 4)
        payload_json = base64.urlsafe_b64decode(payload_b64).decode("utf-8")
        return json.loads(payload_json)
    except Exception as exc:
        raise ValueError(f"Failed to decode JWT payload: {exc}") from exc


def _extract_identity_from_unverified_token(token: str) -> "FirebaseIdentity":
    payload = _decode_jwt_payload_unverified(token)
    uid = payload.get("uid") or payload.get("user_id") or payload.get("sub")
    if not uid:
        raise ValueError("No uid/user_id/sub field found in token payload")
    return FirebaseIdentity(uid=uid, phone_number=payload.get("phone_number"))


@dataclass
class FirebaseIdentity:
    """The verified caller identity extracted from a Firebase ID token or app session token."""
    uid: str
    phone_number: Optional[str] = None


async def get_current_firebase_identity(authorization: Optional[str] = Header(None)) -> FirebaseIdentity:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or malformed Authorization header")

    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(status_code=401, detail="Missing bearer token")

    if token.startswith(APP_SESSION_PREFIX):
        try:
            return FirebaseIdentity(uid=_extract_uid_from_app_session_token(token))
        except Exception as exc:
            logger.warning(f"App session token verification failed: {exc}")
            raise HTTPException(status_code=401, detail="Invalid or expired authentication token") from exc

    firebase_app = get_firebase_app() if (HAS_FIREBASE and firebase_auth) else None

    if firebase_app:
        try:
            decoded = firebase_auth.verify_id_token(token)
            return FirebaseIdentity(uid=decoded["uid"], phone_number=decoded.get("phone_number"))
        except Exception as err:
            logger.warning(f"Firebase ID token verification failed: {err}")
            if settings.DEBUG:
                try:
                    identity = _extract_identity_from_unverified_token(token)
                    logger.info(f"Dev-mode fallback: extracted firebase UID '{identity.uid}' from unverified JWT")
                    return identity
                except Exception as exc:
                    logger.error(f"Dev-mode JWT decode fallback failed: {exc}")
            raise HTTPException(status_code=401, detail="Invalid or expired authentication token")
    else:
        logger.warning("Firebase Admin SDK unavailable - decoding JWT without signature verification (DEV MODE)")
        try:
            identity = _extract_identity_from_unverified_token(token)
            logger.info(f"Dev-mode: extracted firebase UID '{identity.uid}' from unverified JWT")
            return identity
        except Exception as exc:
            logger.error(f"Dev-mode JWT decode failed: {exc}")
            raise HTTPException(status_code=401, detail="Could not extract UID from token (dev mode)")


async def get_current_firebase_uid(identity: FirebaseIdentity = Depends(get_current_firebase_identity)) -> str:
    """Back-compat dependency for routes that only need the UID."""
    return identity.uid
def hash_password(password: str) -> str:
    """Hash a password using PBKDF2 with SHA-256 and a random 16-byte salt."""
    salt = os.urandom(16)
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100000)
    return f"{salt.hex()}:{key.hex()}"


def verify_password(password: str, hashed: str) -> bool:
    """Verify a plain password against a stored PBKDF2 salt:key hash."""
    if not hashed or ":" not in hashed:
        return False
    try:
        salt_hex, key_hex = hashed.split(":", 1)
        if key_hex.startswith("$"):
            key_hex = key_hex[1:]
        salt = bytes.fromhex(salt_hex)
        expected_key = bytes.fromhex(key_hex)
        key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100000)
        return hmac.compare_digest(key, expected_key)
    except Exception:
        return False
