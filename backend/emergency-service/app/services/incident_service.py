from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import uuid4

from app.core.config import get_supabase
from app.core.logging import logger
from app.schemas.incident_schema import IncidentEventRequest

# In-memory fallback store, keyed by incident id, used when Supabase isn't
# configured (dev mode / tests) — mirrors notification-service's memory_devices pattern.
_memory_incidents: Dict[str, Dict[str, Any]] = {}


def _epoch_ms_to_iso(ms: Optional[int]) -> Optional[str]:
    if ms is None:
        return None
    return datetime.fromtimestamp(ms / 1000, tz=timezone.utc).isoformat()


def _find_memory_incident_by_client_id(client_incident_id: str) -> Optional[str]:
    for incident_id, incident in _memory_incidents.items():
        if incident["client_incident_id"] == client_incident_id:
            return incident_id
    return None


def _extract_notified_numbers(step_data: Optional[Dict[str, Any]]) -> List[str]:
    if not step_data:
        return []
    return step_data.get("numbers") or (
        [step_data["number"]] if step_data.get("number") else []
    )


def _update_memory_contacts_notified(incident: Dict[str, Any], payload: IncidentEventRequest) -> None:
    """Mirrors the Supabase contacts_notified upsert: only set the flag that's true
    for this event, keyed by phone, so a later CALL_PLACED doesn't clobber an
    earlier SMS_SENT=True (same clobber-avoidance as the Supabase path)."""
    for phone in _extract_notified_numbers(payload.stepData):
        contact = incident["contacts_notified"].setdefault(
            phone, {"phone": phone, "sms_sent": False, "call_placed": False}
        )
        if payload.step == "SMS_SENT":
            contact["sms_sent"] = True
        elif payload.step == "CALL_PLACED":
            contact["call_placed"] = True


def record_incident_event(payload: IncidentEventRequest) -> str:
    """
    Upserts the incident (by clientIncidentId) and appends one timeline event.
    Returns the backend incident id (UUID in Supabase mode, generated id in memory mode).
    """
    supabase = get_supabase()

    if supabase is not None:
        incident_row = {
            "client_incident_id": payload.clientIncidentId,
            "firebase_uid": payload.firebaseUid,
            "source": payload.source,
            "status": payload.status,
            "started_at": _epoch_ms_to_iso(payload.startedAt),
            "ended_at": _epoch_ms_to_iso(payload.endedAt),
            "latitude": payload.location.lat if payload.location else None,
            "longitude": payload.location.lon if payload.location else None,
            "location_accurate": payload.location.accurate if payload.location else None,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        try:
            res = (
                supabase.table("sos_incidents")
                .upsert(incident_row, on_conflict="client_incident_id")
                .execute()
            )
            incident_id = res.data[0]["id"]

            supabase.table("incident_timeline").insert(
                {
                    "incident_id": incident_id,
                    "step": payload.step,
                    "metadata": payload.stepData,
                    "occurred_at": _epoch_ms_to_iso(payload.occurredAt),
                }
            ).execute()

            if payload.step == "LOCATION_UPDATE" and payload.location:
                supabase.table("location_history").insert(
                    {
                        "incident_id": incident_id,
                        "latitude": payload.location.lat,
                        "longitude": payload.location.lon,
                        "accurate": payload.location.accurate,
                        "recorded_at": _epoch_ms_to_iso(payload.location.timestamp or payload.occurredAt),
                    }
                ).execute()

            if payload.step in ("SMS_SENT", "CALL_PLACED") and payload.stepData:
                numbers = payload.stepData.get("numbers") or (
                    [payload.stepData["number"]] if payload.stepData.get("number") else []
                )
                for phone in numbers:
                    # Only include the flag that's true for this event; an omitted
                    # column keeps its existing value on conflict (PostgREST upsert),
                    # so a later CALL_PLACED doesn't clobber an earlier SMS_SENT=True.
                    contact_row: Dict[str, Any] = {"incident_id": incident_id, "phone": phone}
                    if payload.step == "SMS_SENT":
                        contact_row["sms_sent"] = True
                    elif payload.step == "CALL_PLACED":
                        contact_row["call_placed"] = True
                    supabase.table("contacts_notified").upsert(
                        contact_row,
                        on_conflict="incident_id,phone",
                    ).execute()

            return incident_id
        except Exception as err:
            logger.warning(f"Supabase write failed for incident {payload.clientIncidentId}: {err}")
            raise

    # In-memory dev-mode fallback
    incident_id = _find_memory_incident_by_client_id(payload.clientIncidentId)
    if incident_id is None:
        incident_id = str(uuid4())
        _memory_incidents[incident_id] = {
            "id": incident_id,
            "client_incident_id": payload.clientIncidentId,
            "firebase_uid": payload.firebaseUid,
            "source": payload.source,
            "status": payload.status,
            "started_at": payload.startedAt,
            "ended_at": payload.endedAt,
            "latitude": payload.location.lat if payload.location else None,
            "longitude": payload.location.lon if payload.location else None,
            "timeline": [],
            "location_history": [],
            "contacts_notified": {},
        }

    incident = _memory_incidents[incident_id]
    incident["status"] = payload.status
    if payload.endedAt is not None:
        incident["ended_at"] = payload.endedAt
    incident["timeline"].append(
        {"step": payload.step, "metadata": payload.stepData, "occurredAt": payload.occurredAt}
    )

    if payload.step == "LOCATION_UPDATE" and payload.location:
        incident["location_history"].append(
            {
                "latitude": payload.location.lat,
                "longitude": payload.location.lon,
                "accurate": payload.location.accurate,
                "recorded_at": payload.location.timestamp or payload.occurredAt,
            }
        )

    if payload.step in ("SMS_SENT", "CALL_PLACED") and payload.stepData:
        _update_memory_contacts_notified(incident, payload)

    return incident_id


def list_incidents(firebase_uid: str) -> List[Dict[str, Any]]:
    supabase = get_supabase()
    if supabase is not None:
        try:
            res = (
                supabase.table("sos_incidents")
                .select("*")
                .eq("firebase_uid", firebase_uid)
                .order("started_at", desc=True)
                .execute()
            )
            return [
                {
                    "id": row["id"],
                    "clientIncidentId": row["client_incident_id"],
                    "source": row["source"],
                    "status": row["status"],
                    "startedAt": row["started_at"],
                    "endedAt": row.get("ended_at"),
                    "latitude": row.get("latitude"),
                    "longitude": row.get("longitude"),
                }
                for row in res.data
            ]
        except Exception as err:
            logger.warning(f"Failed to list incidents for {firebase_uid}: {err}")
            return []

    return [
        {
            "id": inc["id"],
            "clientIncidentId": inc["client_incident_id"],
            "source": inc["source"],
            "status": inc["status"],
            "startedAt": _epoch_ms_to_iso(inc["started_at"]),
            "endedAt": _epoch_ms_to_iso(inc.get("ended_at")),
            "latitude": inc.get("latitude"),
            "longitude": inc.get("longitude"),
        }
        for inc in sorted(
            _memory_incidents.values(), key=lambda i: i["started_at"], reverse=True
        )
        if inc["firebase_uid"] == firebase_uid
    ]


def get_incident_detail(incident_id: str) -> Optional[Dict[str, Any]]:
    supabase = get_supabase()
    if supabase is not None:
        try:
            inc_res = supabase.table("sos_incidents").select("*").eq("id", incident_id).execute()
            if not inc_res.data:
                return None
            row = inc_res.data[0]

            timeline_res = (
                supabase.table("incident_timeline")
                .select("*")
                .eq("incident_id", incident_id)
                .order("occurred_at")
                .execute()
            )
            location_res = (
                supabase.table("location_history")
                .select("*")
                .eq("incident_id", incident_id)
                .order("recorded_at")
                .execute()
            )
            contacts_res = (
                supabase.table("contacts_notified").select("*").eq("incident_id", incident_id).execute()
            )

            return {
                "id": row["id"],
                "clientIncidentId": row["client_incident_id"],
                "source": row["source"],
                "status": row["status"],
                "startedAt": row["started_at"],
                "endedAt": row.get("ended_at"),
                "latitude": row.get("latitude"),
                "longitude": row.get("longitude"),
                "timeline": [
                    {"step": t["step"], "metadata": t.get("metadata"), "occurredAt": t["occurred_at"]}
                    for t in timeline_res.data
                ],
                "locationHistory": location_res.data,
                "contactsNotified": contacts_res.data,
            }
        except Exception as err:
            logger.warning(f"Failed to fetch incident detail for {incident_id}: {err}")
            return None

    incident = _memory_incidents.get(incident_id)
    if incident is None:
        return None

    return {
        "id": incident["id"],
        "clientIncidentId": incident["client_incident_id"],
        "source": incident["source"],
        "status": incident["status"],
        "startedAt": _epoch_ms_to_iso(incident["started_at"]),
        "endedAt": _epoch_ms_to_iso(incident.get("ended_at")),
        "latitude": incident.get("latitude"),
        "longitude": incident.get("longitude"),
        "timeline": [
            {
                "step": t["step"],
                "metadata": t["metadata"],
                "occurredAt": _epoch_ms_to_iso(t["occurredAt"]),
            }
            for t in incident["timeline"]
        ],
        "locationHistory": [
            {
                "latitude": lh["latitude"],
                "longitude": lh["longitude"],
                "accurate": lh["accurate"],
                "recorded_at": _epoch_ms_to_iso(lh["recorded_at"]),
            }
            for lh in incident.get("location_history", [])
        ],
        "contactsNotified": list(incident.get("contacts_notified", {}).values()),
    }
