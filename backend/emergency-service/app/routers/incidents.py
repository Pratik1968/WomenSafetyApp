from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, status

from app.schemas.incident_schema import ApiResponse, IncidentEventRequest
from app.services.incident_service import get_incident_detail, list_incidents, record_incident_event

router = APIRouter(prefix="/emergency/incidents", tags=["Incident Timeline"])


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@router.post("/sync", status_code=status.HTTP_201_CREATED, response_model=ApiResponse)
async def sync_incident_event(payload: IncidentEventRequest):
    """
    Upserts an SOS incident and appends one timeline event. Called once per
    pipeline step by the mobile app's sosOrchestratorService — safe to call
    repeatedly for the same clientIncidentId.
    """
    try:
        incident_id = record_incident_event(payload)
    except Exception as err:
        raise HTTPException(status_code=500, detail=f"Failed to record incident event: {err}")

    return ApiResponse(success=True, data={"incidentId": incident_id}, message="Incident event recorded", timestamp=_now_iso())


@router.get("/history", response_model=ApiResponse)
async def get_history(firebaseUid: str):
    """List all incidents for a user, newest first."""
    incidents = list_incidents(firebaseUid)
    return ApiResponse(success=True, data=incidents, timestamp=_now_iso())


@router.get("/history/{incident_id}", response_model=ApiResponse)
async def get_history_detail(incident_id: str):
    """Full detail for one incident: header fields + timeline + location history + contacts notified."""
    detail = get_incident_detail(incident_id)
    if detail is None:
        raise HTTPException(status_code=404, detail="Incident not found")
    return ApiResponse(success=True, data=detail, timestamp=_now_iso())
