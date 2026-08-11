from typing import Optional, List, Dict, Any

from app.db.database import get_supabase
from app.core.logging import logger

TABLE = "emergency_contacts"


class EmergencyContactRepository:
    """Emergency contacts are stored exclusively in Supabase (public.emergency_contacts),
    same pattern as devices/users - there is no local/SQLite fallback for this feature.
    Requires SUPABASE_URL and SUPABASE_KEY (service_role) to be configured.
    """

    def _client(self):
        client = get_supabase()
        if client is None:
            raise RuntimeError(
                "Supabase is not configured. Set SUPABASE_URL and SUPABASE_KEY (service_role) in .env."
            )
        return client

    def list_by_user(self, user_id: str) -> List[Dict[str, Any]]:
        client = self._client()
        result = (
            client.table(TABLE)
            .select("*")
            .eq("user_id", user_id)
            .order("priority", desc=False)
            .execute()
        )
        return result.data or []

    def create(
        self,
        user_id: str,
        name: str,
        phone: str,
        relationship: str,
        priority: Optional[int] = None,
    ) -> Dict[str, Any]:
        client = self._client()

        if priority is None:
            existing = client.table(TABLE).select("id").eq("user_id", user_id).execute()
            priority = len(existing.data or []) + 1

        insert_fields = {
            "user_id": user_id,
            "name": name,
            "phone": phone,
            "relationship": relationship,
            "priority": priority,
        }
        result = client.table(TABLE).insert(insert_fields).execute()
        logger.info(f"Emergency contact created for user_id={user_id}")
        return result.data[0] if result.data else insert_fields

    def update(
        self,
        contact_id: str,
        user_id: str,
        *,
        name: Optional[str] = None,
        phone: Optional[str] = None,
        relationship: Optional[str] = None,
        priority: Optional[int] = None,
    ) -> Optional[Dict[str, Any]]:
        client = self._client()
        updates = {
            key: value
            for key, value in {
                "name": name,
                "phone": phone,
                "relationship": relationship,
                "priority": priority,
            }.items()
            if value is not None
        }
        if not updates:
            existing = (
                client.table(TABLE)
                .select("*")
                .eq("id", contact_id)
                .eq("user_id", user_id)
                .execute()
            )
            return existing.data[0] if existing.data else None

        result = (
            client.table(TABLE)
            .update(updates)
            .eq("id", contact_id)
            .eq("user_id", user_id)
            .execute()
        )
        if result.data:
            logger.info(f"Emergency contact updated: {contact_id}")
            return result.data[0]
        return None

    def delete(self, contact_id: str, user_id: str) -> bool:
        client = self._client()
        # Filter by user_id too, in the same query, so a contact can only ever be
        # deleted by the user who owns it - not just anyone who knows its id.
        result = client.table(TABLE).delete().eq("id", contact_id).eq("user_id", user_id).execute()
        deleted = bool(result.data)
        if deleted:
            logger.info(f"Emergency contact deleted: {contact_id}")
        return deleted
