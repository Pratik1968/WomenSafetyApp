from fastapi import APIRouter
from datetime import datetime
from app.schemas.gps import LocationPingRequest, LocationPingResponse

router = APIRouter(prefix="/gps", tags=["GPS & Location Module"])

@router.post("/ping", response_model=LocationPingResponse)
async def ping_location(payload: LocationPingRequest):
    return LocationPingResponse(
        status="success",
        recorded_at=datetime.utcnow().isoformat()
    )
