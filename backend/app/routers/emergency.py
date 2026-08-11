from fastapi import APIRouter, HTTPException, status
from typing import List, Dict, Any

from app.schemas.emergency import EmergencyContactCreate, SOSIncidentCreate
from app.database import get_supabase

router = APIRouter(prefix="/api/v1/emergency", tags=["Emergency Service & SOS"])

memory_contacts_store: List[Dict[str, Any]] = []
memory_incidents_store: List[Dict[str, Any]] = []

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
