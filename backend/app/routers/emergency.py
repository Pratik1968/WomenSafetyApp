from fastapi import APIRouter, HTTPException, Query, status
from typing import List, Dict, Any
import uuid
from datetime import datetime, timezone

from app.schemas.emergency import (
    EmergencyContactCreate,
    SOSIncidentCreate,
    IncidentSyncPayload,
    IncidentSyncResponse,
)
from app.database import get_supabase

router = APIRouter(prefix="/api/v1/emergency", tags=["Emergency Service & SOS"])

memory_contacts_store: List[Dict[str, Any]] = []
memory_incidents_store: List[Dict[str, Any]] = []
memory_incident_events_store: List[Dict[str, Any]] = []  # for /incidents/sync


@router.post("/contacts", status_code=status.HTTP_201_CREATED)
async def add_emergency_contact(payload: EmergencyContactCreate):
    """
    Add an emergency contact to Supabase 'emergency_contacts' table.
    """
    supabase = get_supabase()
    if supabase is not None:
        try:
            data = {
                "name": payload.name,
                "phone": payload.phone,
                "relationship": payload.relationship,
                "priority": payload.priority,
            }
            if payload.user_id:
                data["user_id"] = payload.user_id

            response = supabase.table("emergency_contacts").insert(data).execute()
            return {"status": "success", "data": response.data}
        except Exception as err:
            raise HTTPException(status_code=500, detail=f"Database error: {str(err)}")
    else:
        contact = {
            "id": f"contact-{len(memory_contacts_store) + 1}",
            "user_id": payload.user_id or "default-user",
            "name": payload.name,
            "phone": payload.phone,
            "relationship": payload.relationship,
            "priority": payload.priority
        }
        memory_contacts_store.append(contact)
        return {"status": "success", "data": [contact]}

@router.get("/contacts/{user_id}")
async def get_emergency_contacts(user_id: str):
    """
    Get emergency contacts for a given user.
    """
    supabase = get_supabase()
    if supabase is not None:
        try:
            response = supabase.table("emergency_contacts").select("*").eq("user_id", user_id).execute()
            return response.data
        except Exception as err:
            raise HTTPException(status_code=500, detail=f"Database error: {str(err)}")
    else:
        return [c for c in memory_contacts_store if c.get("user_id") == user_id]

@router.post("/sos/trigger", status_code=status.HTTP_201_CREATED)
async def trigger_sos_incident(payload: SOSIncidentCreate):
    """
    Create a new SOS incident in 'sos_incidents' table.
    """
    supabase = get_supabase()
    if supabase is not None:
        try:
            data = {
                "user_id": payload.user_id,
                "status": "ACTIVE",
                "trigger_type": payload.trigger_type,
                "latitude": payload.latitude,
                "longitude": payload.longitude,
                "notes": payload.notes
            }
            response = supabase.table("sos_incidents").insert(data).execute()
            return {"status": "success", "message": "SOS Incident Created", "data": response.data}
        except Exception as err:
            raise HTTPException(status_code=500, detail=f"Database error: {str(err)}")
    else:
        incident = {
            "id": f"sos-{len(memory_incidents_store) + 1}",
            "user_id": payload.user_id,
            "status": "ACTIVE",
            "trigger_type": payload.trigger_type,
            "latitude": payload.latitude,
            "longitude": payload.longitude,
            "notes": payload.notes
        }
        memory_incidents_store.append(incident)
        return {"status": "success", "message": "SOS Incident Created (dev mode)", "data": [incident]}


# ── Incident Sync ─────────────────────────────────────────────────────────────

@router.post("/incidents/sync", status_code=status.HTTP_200_OK)
async def sync_incident_event(payload: IncidentSyncPayload):
    """
    Receive an SOS step event from the mobile app and persist it.
    Called for every step: SOS_TRIGGERED, LOCATION_ACQUIRED, SMS_SENT, etc.
    """
    event_id = str(uuid.uuid4())
    occurred_at_iso = datetime.fromtimestamp(payload.occurredAt / 1000, tz=timezone.utc).isoformat()

    supabase = get_supabase()
    if supabase is not None:
        try:
            row = {
                "id": event_id,
                "client_incident_id": payload.clientIncidentId,
                "firebase_uid": payload.firebaseUid,
                "source": payload.source,
                "status": payload.status,
                "started_at": datetime.fromtimestamp(payload.startedAt / 1000, tz=timezone.utc).isoformat(),
                "step": payload.step,
                "step_data": payload.stepData,
                "location_lat": payload.location.lat if payload.location else None,
                "location_lon": payload.location.lon if payload.location else None,
                "occurred_at": occurred_at_iso,
            }
            supabase.table("incident_events").insert(row).execute()
            return {"success": True, "data": {"incidentId": event_id, "step": payload.step}}
        except Exception as err:
            # Log but don't crash — fall through to in-memory fallback
            print(f"[incidents/sync] Supabase error: {err}")

    # In-memory fallback (dev / Supabase not configured)
    event = {
        "id": event_id,
        "clientIncidentId": payload.clientIncidentId,
        "firebaseUid": payload.firebaseUid,
        "source": payload.source,
        "status": payload.status,
        "startedAt": datetime.fromtimestamp(payload.startedAt / 1000, tz=timezone.utc).isoformat(),
        "step": payload.step,
        "stepData": payload.stepData,
        "location": payload.location.model_dump() if payload.location else None,
        "occurredAt": occurred_at_iso,
    }
    memory_incident_events_store.append(event)
    return {"success": True, "data": {"incidentId": event_id, "step": payload.step}}


@router.get("/incidents/history", status_code=status.HTTP_200_OK)
async def get_incident_history(firebaseUid: str = Query(..., description="Firebase UID of the user")):
    """
    Return all SOS incidents for the given user, each with the latest step.
    """
    supabase = get_supabase()
    if supabase is not None:
        try:
            response = (
                supabase.table("incident_events")
                .select("*")
                .eq("firebase_uid", firebaseUid)
                .order("occurred_at", desc=True)
                .execute()
            )
            rows = response.data or []
            # Collapse to one entry per clientIncidentId (most-recent step wins)
            seen: Dict[str, Any] = {}
            for row in rows:
                cid = row.get("client_incident_id", row.get("id"))
                if cid not in seen:
                    seen[cid] = {
                        "id": row["id"],
                        "clientIncidentId": cid,
                        "source": row.get("source"),
                        "status": row.get("status"),
                        "startedAt": row.get("started_at"),
                        "firebaseUid": row.get("firebase_uid"),
                    }
            return {"success": True, "data": list(seen.values())}
        except Exception as err:
            print(f"[incidents/history] Supabase error: {err}")

    # In-memory fallback
    events = [e for e in memory_incident_events_store if e.get("firebaseUid") == firebaseUid]
    seen: Dict[str, Any] = {}
    for ev in reversed(events):  # oldest first so latest step overwrites
        cid = ev["clientIncidentId"]
        seen[cid] = {
            "id": ev["id"],
            "clientIncidentId": cid,
            "source": ev.get("source"),
            "status": ev.get("status"),
            "startedAt": ev.get("startedAt"),
            "firebaseUid": ev.get("firebaseUid"),
        }
    return {"success": True, "data": list(seen.values())}
