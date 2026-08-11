from typing import List, Optional, Dict, Any

from app.repositories.device_repository import DeviceRepository
from app.repositories.user_repository import UserRepository
from app.schemas.device import DeviceRegisterRequest
from app.core.logging import logger
from app.utils.masking import mask_token


class DeviceService:
    """Devices are stored in Supabase only (see DeviceRepository) - no DB session needed here."""

    def __init__(self):
        self.device_repo = DeviceRepository()
        self.user_repo = UserRepository()

    def register_device(self, payload: DeviceRegisterRequest) -> Dict[str, Any]:
        logger.info(
            f"Registering device {payload.device_id} (platform={payload.platform}, "
            f"token={mask_token(payload.fcm_token)})"
        )
        self._resolve_real_user_id(payload)
        return self.device_repo.register_device(payload)

    def _resolve_real_user_id(self, payload: DeviceRegisterRequest) -> None:
        """Link the device to the real users.id via firebase_uid, so device rows point
        at an actual authenticated user instead of a client-supplied/absent user_id."""
        if not payload.firebase_uid:
            return
        try:
            user = self.user_repo.get_by_firebase_uid(payload.firebase_uid)
        except Exception as err:
            logger.warning(f"Could not resolve user for firebase_uid during device registration: {err}")
            return
        if user:
            payload.user_id = user["id"]
        else:
            logger.info(
                f"No user profile found yet for firebase_uid={payload.firebase_uid[:8]}... "
                "- device registered without a linked user_id"
            )

    def refresh_token(self, device_id: str, fcm_token: str) -> Optional[Dict[str, Any]]:
        logger.info(f"Refreshing FCM token for device {device_id} (token={mask_token(fcm_token)})")
        return self.device_repo.update_token(device_id, fcm_token)

    def get_user_devices(self, user_id: str) -> List[Dict[str, Any]]:
        return self.device_repo.get_user_devices(user_id)

    def deactivate_device(self, device_id: str) -> Optional[Dict[str, Any]]:
        logger.info(f"Deactivating device {device_id} (logout)")
        return self.device_repo.deactivate_device(device_id)
