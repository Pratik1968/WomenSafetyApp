from typing import Dict, Any, List, Optional
from app.core.firebase import get_firebase_app, HAS_FIREBASE
from app.core.logging import logger
from app.utils.masking import mask_token

if HAS_FIREBASE:
    from firebase_admin import messaging
else:
    messaging = None

# Firebase error codes that mean the token is no longer valid and should be
# removed from storage so we stop sending to it.
INVALID_TOKEN_ERROR_CODES = {"UNREGISTERED", "INVALID_ARGUMENT", "NOT_FOUND"}


def is_invalid_token_error(exc: Exception) -> bool:
    code = getattr(exc, "code", None)
    if code in INVALID_TOKEN_ERROR_CODES:
        return True
    return type(exc).__name__ in {"UnregisteredError", "InvalidArgumentError", "NotFoundError"}


class FirebaseService:
    def __init__(self):
        self.app = get_firebase_app()

    def send_fcm_message(
        self,
        token: str,
        title: str,
        body: str,
        data: Optional[Dict[str, Any]] = None,
        channel_id: str = "sos_channel",
        priority: str = "high",
        ttl: Optional[int] = 3600
    ) -> Optional[str]:
        if not self.app or not messaging:
            logger.info(f"[Dev Mock FCM] Sent single notification to token '{mask_token(token)}': {title} - {body}")
            return f"mock-msg-id-{title[:10]}"

        str_data = {str(k): str(v) for k, v in (data or {}).items()}
        android_config = messaging.AndroidConfig(
            priority="high" if priority.lower() == "high" else "normal",
            ttl=ttl,
            notification=messaging.AndroidNotification(
                channel_id=channel_id,
                sound="default",
                priority="max" if priority.lower() == "high" else "default"
            )
        )

        message = messaging.Message(
            token=token,
            notification=messaging.Notification(title=title, body=body),
            data=str_data,
            android=android_config
        )

        try:
            response = messaging.send(message)
            logger.info(f"Firebase FCM message dispatched successfully. Response ID: {response}")
            return response
        except Exception as e:
            logger.error(f"Error dispatching FCM message to token '{mask_token(token)}': {e}")
            raise e

    def send_multicast_message(
        self,
        tokens: List[str],
        title: str,
        body: str,
        data: Optional[Dict[str, Any]] = None,
        channel_id: str = "sos_channel",
        priority: str = "high",
        ttl: Optional[int] = 3600
    ) -> Dict[str, Any]:
        """Returns {"message_ids": [...], "invalid_tokens": [...]}."""
        if not tokens:
            return {"message_ids": [], "invalid_tokens": []}

        if not self.app or not messaging:
            logger.info(f"[Dev Mock FCM] Sent multicast to {len(tokens)} tokens: {title} - {body}")
            return {"message_ids": [f"mock-multicast-id-{i}" for i in range(len(tokens))], "invalid_tokens": []}

        str_data = {str(k): str(v) for k, v in (data or {}).items()}
        android_config = messaging.AndroidConfig(
            priority="high" if priority.lower() == "high" else "normal",
            ttl=ttl,
            notification=messaging.AndroidNotification(
                channel_id=channel_id,
                sound="default",
                priority="max" if priority.lower() == "high" else "default"
            )
        )

        message = messaging.MulticastMessage(
            tokens=tokens,
            notification=messaging.Notification(title=title, body=body),
            data=str_data,
            android=android_config
        )

        try:
            batch_response = messaging.send_each_for_multicast(message)
            logger.info(
                f"Firebase Multicast sent to {len(tokens)} tokens. "
                f"Successes: {batch_response.success_count}, Failures: {batch_response.failure_count}"
            )
            message_ids = []
            invalid_tokens = []
            for token, result in zip(tokens, batch_response.responses):
                if result.success:
                    message_ids.append(result.message_id)
                elif result.exception is not None and is_invalid_token_error(result.exception):
                    logger.warning(f"FCM token '{mask_token(token)}' is invalid: {result.exception}")
                    invalid_tokens.append(token)
            return {"message_ids": message_ids, "invalid_tokens": invalid_tokens}
        except Exception as e:
            logger.error(f"Error sending Firebase Multicast message: {e}")
            raise e
