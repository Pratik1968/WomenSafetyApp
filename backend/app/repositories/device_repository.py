from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from app.schemas.device import DeviceRegisterRequest
from app.db.database import get_supabase
from app.core.logging import logger
from app.utils.masking import mask_token

TABLE = "devices"


class DeviceRepository:
    """Devices are stored exclusively in Supabase (public.devices) - there is no
    local/SQLite fallback for this feature. Requires SUPABASE_URL and SUPABASE_KEY
    (service_role) to be configured.

    NOTE: devices.user_id is currently nullable because there is no auth/user-creation
    flow yet to resolve a real row in `users`. Once that exists, every device should be
    linked to a real user_id and this should go back to being required end-to-end.
    """

    def _client(self):
        client = get_supabase()
        if client is None:
            raise RuntimeError(
                "Supabase is not configured. Set SUPABASE_URL and SUPABASE_KEY (service_role) in .env."
            )
        return client

    def _now(self) -> str:
        return datetime.now(timezone.utc).isoformat()

    def register_device(self, payload: DeviceRegisterRequest) -> Dict[str, Any]:
        client = self._client()
        now = self._now()

        existing = client.table(TABLE).select("*").eq("device_id", payload.device_id).limit(1).execute()
        existing_row = existing.data[0] if existing.data else None

        if existing_row:
            update_fields = {
                "fcm_token": payload.fcm_token,
                "platform": payload.platform or existing_row.get("platform"),
                "device_name": payload.device_name or existing_row.get("device_name"),
                "manufacturer": payload.manufacturer or existing_row.get("manufacturer"),
                "device_model": payload.model or existing_row.get("device_model"),
                "os_version": payload.os_version or existing_row.get("os_version"),
                "app_version": payload.app_version or existing_row.get("app_version"),
                "firebase_uid": payload.firebase_uid or existing_row.get("firebase_uid"),
                "user_id": payload.user_id or existing_row.get("user_id"),
                "notification_enabled": (
                    payload.notification_enabled
                    if payload.notification_enabled is not None
                    else existing_row.get("notification_enabled", True)
                ),
                "is_active": True,
                "last_active": now,
                "updated_at": now,
            }
            result = client.table(TABLE).update(update_fields).eq("device_id", payload.device_id).execute()
            logger.info(f"Device {payload.device_id} already registered, token/details updated")
            return result.data[0] if result.data else {**existing_row, **update_fields}

        # A token can be reassigned to a new device install (e.g. reinstall). Release it
        # from whichever other device row currently holds it so we never fan out to a
        # token that no longer belongs to that device.
        stale = client.table(TABLE).select("id, device_id").eq("fcm_token", payload.fcm_token).neq(
            "device_id", payload.device_id
        ).execute()
        for stale_row in stale.data or []:
            logger.info(f"Releasing stale FCM token {mask_token(payload.fcm_token)} from device {stale_row['device_id']}")
            client.table(TABLE).update({"fcm_token": None, "is_active": False, "updated_at": now}).eq(
                "id", stale_row["id"]
            ).execute()

        insert_fields = {
            "device_id": payload.device_id,
            "user_id": payload.user_id,
            "firebase_uid": payload.firebase_uid,
            "platform": payload.platform,
            "device_name": payload.device_name,
            "manufacturer": payload.manufacturer,
            "device_model": payload.model,
            "os_version": payload.os_version,
            "app_version": payload.app_version,
            "fcm_token": payload.fcm_token,
            "notification_enabled": payload.notification_enabled if payload.notification_enabled is not None else True,
            "is_active": True,
            "last_active": now,
            "created_at": now,
            "updated_at": now,
        }
        result = client.table(TABLE).insert(insert_fields).execute()
        logger.info(f"New device registered: {payload.device_id}")
        return result.data[0] if result.data else insert_fields

    def update_token(self, device_id: str, fcm_token: str) -> Optional[Dict[str, Any]]:
        client = self._client()
        now = self._now()
        result = client.table(TABLE).update(
            {"fcm_token": fcm_token, "is_active": True, "last_active": now, "updated_at": now}
        ).eq("device_id", device_id).execute()
        if not result.data:
            return None
        logger.info(f"FCM token refreshed for device {device_id}")
        return result.data[0]

    def get_active_tokens(self, user_id: str) -> List[str]:
        client = self._client()
        result = (
            client.table(TABLE)
            .select("fcm_token")
            .eq("user_id", user_id)
            .eq("is_active", True)
            .eq("notification_enabled", True)
            .not_.is_("fcm_token", "null")
            .execute()
        )
        return [row["fcm_token"] for row in result.data or [] if row.get("fcm_token")]

    def get_tokens_by_user_ids(self, user_ids: List[str]) -> List[str]:
        if not user_ids:
            return []
        client = self._client()
        result = (
            client.table(TABLE)
            .select("fcm_token")
            .in_("user_id", user_ids)
            .eq("is_active", True)
            .eq("notification_enabled", True)
            .not_.is_("fcm_token", "null")
            .execute()
        )
        return [row["fcm_token"] for row in result.data or [] if row.get("fcm_token")]

    def get_user_devices(self, user_id: str) -> List[Dict[str, Any]]:
        client = self._client()
        result = client.table(TABLE).select("*").eq("user_id", user_id).execute()
        return result.data or []

    def deactivate_device(self, device_id: str) -> Optional[Dict[str, Any]]:
        client = self._client()
        result = client.table(TABLE).update(
            {"is_active": False, "updated_at": self._now()}
        ).eq("device_id", device_id).execute()
        if not result.data:
            return None
        logger.info(f"Device {device_id} deactivated")
        return result.data[0]

    def remove_invalid_token(self, fcm_token: str) -> None:
        if not fcm_token:
            return
        client = self._client()
        result = client.table(TABLE).update(
            {"fcm_token": None, "is_active": False, "updated_at": self._now()}
        ).eq("fcm_token", fcm_token).execute()
        for row in result.data or []:
            logger.warning(f"Invalid FCM token {mask_token(fcm_token)} removed from device {row.get('device_id')}")
