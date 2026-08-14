import json

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
        logger.warning("firebase_admin package not installed in active Python environment. Running in FCM dev/mock mode.")
        return None

    # Serverless environments (Lambda) set the service-account JSON directly as an env var
    # rather than shipping a credentials file in the deployment package — check that first.
    if settings.FIREBASE_SERVICE_ACCOUNT_JSON:
        try:
            cred_dict = json.loads(settings.FIREBASE_SERVICE_ACCOUNT_JSON)
            cred = credentials.Certificate(cred_dict)
            _firebase_app = firebase_admin.initialize_app(cred, {
                "projectId": settings.FIREBASE_PROJECT_ID,
                "storageBucket": settings.FIREBASE_STORAGE_BUCKET
            })
            logger.info("Firebase Admin SDK initialized successfully from FIREBASE_SERVICE_ACCOUNT_JSON env var")
            return _firebase_app
        except Exception as e:
            logger.warning(f"Failed to initialize Firebase Admin SDK from FIREBASE_SERVICE_ACCOUNT_JSON: {e}")
            return None

    cred_path = settings.absolute_firebase_credentials_path

    if cred_path.exists():
        try:
            cred = credentials.Certificate(str(cred_path))
            _firebase_app = firebase_admin.initialize_app(cred, {
                "projectId": settings.FIREBASE_PROJECT_ID,
                "storageBucket": settings.FIREBASE_STORAGE_BUCKET
            })
            logger.info(f"Firebase Admin SDK initialized successfully with certificate from {cred_path}")
        except Exception as e:
            logger.warning(f"Failed to initialize Firebase Admin SDK with certificate: {e}")
    else:
        logger.warning(f"Firebase credentials file not found at '{cred_path}'. Running in FCM dev/mock mode.")

    return _firebase_app

def get_firebase_app():
    global _firebase_app
    if _firebase_app is None:
        return initialize_firebase()
    return _firebase_app
