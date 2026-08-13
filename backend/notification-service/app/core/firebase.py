import json
from pathlib import Path

from app.core.config import settings
from app.core.logging import logger

try:
    import firebase_admin
    from firebase_admin import credentials, messaging
    HAS_FIREBASE = True
except ImportError:
    HAS_FIREBASE = False
    firebase_admin = None
    credentials = None
    messaging = None

_firebase_app = None


def initialize_firebase():
    global _firebase_app
    if _firebase_app is not None:
        return _firebase_app

    if not HAS_FIREBASE:
        logger.warning("firebase_admin package not installed. Running in FCM dev/mock mode.")
        return None

    try:
        if settings.FIREBASE_SERVICE_ACCOUNT_JSON:
            cred = credentials.Certificate(json.loads(settings.FIREBASE_SERVICE_ACCOUNT_JSON))
        elif settings.FIREBASE_SERVICE_ACCOUNT_PATH and Path(settings.FIREBASE_SERVICE_ACCOUNT_PATH).exists():
            cred = credentials.Certificate(settings.FIREBASE_SERVICE_ACCOUNT_PATH)
        else:
            logger.warning(
                "No Firebase credentials configured (set FIREBASE_SERVICE_ACCOUNT_JSON or "
                "FIREBASE_SERVICE_ACCOUNT_PATH). Running in FCM dev/mock mode."
            )
            return None

        _firebase_app = firebase_admin.initialize_app(cred, {"projectId": settings.FIREBASE_PROJECT_ID})
        logger.info("Firebase Admin SDK initialized successfully.")
    except Exception as e:
        logger.warning(f"Failed to initialize Firebase Admin SDK: {e}")

    return _firebase_app


def get_firebase_app():
    global _firebase_app
    if _firebase_app is None:
        return initialize_firebase()
    return _firebase_app
