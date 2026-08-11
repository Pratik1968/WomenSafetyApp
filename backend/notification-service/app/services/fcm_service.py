from typing import Any, Dict, List, Optional

from firebase_admin import messaging

from app.core.config import get_supabase
from app.core.firebase import get_firebase_app
from app.core.logging import logger


def get_active_tokens_for_user(user_id: str) -> List[str]:
    """Look up active FCM tokens for a user from the devices table."""
    supabase = get_supabase()
    if supabase is None or not user_id:
        return []
    try:
        res = (
            supabase.table("devices")
            .select("fcm_token")
            .or_(f"user_id.eq.{user_id},firebase_uid.eq.{user_id}")
            .eq("is_active", True)
            .execute()
        )
        return [row["fcm_token"] for row in res.data if row.get("fcm_token")]
    except Exception as err:
        logger.warning(f"Failed to fetch device tokens for user {user_id}: {err}")
        return []


def deactivate_tokens(tokens: List[str]) -> None:
    """Mark stale/unregistered FCM tokens inactive so they stop being targeted."""
    if not tokens:
        return
    supabase = get_supabase()
    if supabase is None:
        return
    try:
        supabase.table("devices").update({"is_active": False}).in_("fcm_token", tokens).execute()
    except Exception as err:
        logger.warning(f"Failed to deactivate stale tokens: {err}")


def send_push_to_tokens(
    tokens: List[str],
    title: str,
    body: str,
    data: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Sends an FCM push to each token via the Firebase Admin SDK (FCM HTTP v1 API).
    Returns {"sent": int, "failed": int, "invalid_tokens": [str]}.
    Stale/unregistered tokens are deactivated in Supabase automatically.
    """
    result: Dict[str, Any] = {"sent": 0, "failed": 0, "invalid_tokens": []}

    if not tokens:
        return result

    app = get_firebase_app()
    if app is None:
        logger.warning("Firebase not initialized — skipping FCM send (dev/mock mode).")
        result["failed"] = len(tokens)
        return result

    for token in tokens:
        try:
            message = messaging.Message(
                notification=messaging.Notification(title=title, body=body),
                data={k: str(v) for k, v in (data or {}).items()},
                token=token,
                android=messaging.AndroidConfig(priority="high"),
            )
            messaging.send(message, app=app)
            result["sent"] += 1
        except messaging.UnregisteredError:
            result["failed"] += 1
            result["invalid_tokens"].append(token)
        except Exception as err:
            logger.warning(f"FCM send failed for token {token[:12]}...: {err}")
            result["failed"] += 1

    if result["invalid_tokens"]:
        deactivate_tokens(result["invalid_tokens"])

    return result
