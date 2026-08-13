import math
import uuid
from typing import Any, Dict, List, Optional

from app.db.database import get_supabase
from app.core.logging import logger

TABLE = "crowd_reports"
MEDIA_BUCKET = "crowd-report-media"

EXTENSION_BY_CONTENT_TYPE = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/heic": "heic",
    "video/mp4": "mp4",
    "video/quicktime": "mov",
}


def _media_kind(content_type: str) -> str:
    if content_type.startswith("video/"):
        return "VIDEO"
    return "PHOTO"


def _haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    earth_radius_km = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lng2 - lng1)
    a = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    return 2 * earth_radius_km * math.asin(math.sqrt(a))


class IncidentReportRepository:
    """Crowd-sourced incident reports (public.crowd_reports), Supabase-only like
    emergency_contacts/users/devices - no local/SQLite fallback for this feature.
    """

    def _client(self):
        client = get_supabase()
        if client is None:
            raise RuntimeError(
                "Supabase is not configured. Set SUPABASE_URL and SUPABASE_KEY (service_role) in .env."
            )
        return client

    def _ensure_bucket(self, client) -> None:
        try:
            client.storage.create_bucket(MEDIA_BUCKET, options={"public": True})
            logger.info(f"Created Supabase storage bucket '{MEDIA_BUCKET}'")
        except Exception as err:
            # Already exists (the common case, since the migration SQL also creates it) -
            # any other failure surfaces when the upload itself is attempted below.
            logger.debug(f"Bucket '{MEDIA_BUCKET}' ensure step: {err}")

    def upload_media(self, user_id: str, content: bytes, content_type: str) -> Optional[Dict[str, str]]:
        """Uploads one photo/video to Supabase Storage and returns {url, type}.
        Returns None (rather than raising) on failure so one bad file doesn't sink an
        otherwise-valid report submission - the caller logs and continues.
        """
        client = self._client()
        self._ensure_bucket(client)

        extension = EXTENSION_BY_CONTENT_TYPE.get(content_type, "bin")
        path = f"{user_id}/{uuid.uuid4()}.{extension}"

        try:
            client.storage.from_(MEDIA_BUCKET).upload(
                path, content, file_options={"content-type": content_type}
            )
            url = client.storage.from_(MEDIA_BUCKET).get_public_url(path)
            return {"url": url, "type": _media_kind(content_type)}
        except Exception as err:
            logger.error(f"Failed to upload report media to '{path}': {err}")
            return None

    def create(
        self,
        user_id: str,
        report_type: str,
        latitude: float,
        longitude: float,
        description: Optional[str] = None,
        address: Optional[str] = None,
        media: Optional[List[Dict[str, str]]] = None,
    ) -> Dict[str, Any]:
        client = self._client()
        insert_fields = {
            "user_id": user_id,
            "report_type": report_type,
            "description": description,
            "latitude": latitude,
            "longitude": longitude,
            "address": address,
            "media": media or [],
        }
        result = client.table(TABLE).insert(insert_fields).execute()
        logger.info(f"Crowd report created for user_id={user_id}, type={report_type}")
        return result.data[0] if result.data else insert_fields

    def list_by_user(self, user_id: str) -> List[Dict[str, Any]]:
        client = self._client()
        result = (
            client.table(TABLE)
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .execute()
        )
        return result.data or []

    def get(self, report_id: str) -> Optional[Dict[str, Any]]:
        client = self._client()
        result = client.table(TABLE).select("*").eq("id", report_id).limit(1).execute()
        return result.data[0] if result.data else None

    def list_nearby(self, latitude: float, longitude: float, radius_km: float, limit: int = 50) -> List[Dict[str, Any]]:
        """Coarse bounding-box query in SQL (cheap, index-friendly) then an exact
        haversine filter/sort in Python - avoids depending on PostGIS functions being
        enabled/reachable through PostgREST.
        """
        client = self._client()

        # ~1 degree of latitude is ~111km; longitude degrees shrink with cos(latitude).
        lat_delta = radius_km / 111.0
        lng_delta = radius_km / max(111.0 * math.cos(math.radians(latitude)), 1e-6)

        result = (
            client.table(TABLE)
            .select("*")
            .gte("latitude", latitude - lat_delta)
            .lte("latitude", latitude + lat_delta)
            .gte("longitude", longitude - lng_delta)
            .lte("longitude", longitude + lng_delta)
            .order("created_at", desc=True)
            .execute()
        )
        rows = result.data or []

        nearby = [
            row
            for row in rows
            if _haversine_km(latitude, longitude, row["latitude"], row["longitude"]) <= radius_km
        ]
        return nearby[:limit]
