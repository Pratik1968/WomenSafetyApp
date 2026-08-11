from pydantic import BaseModel, Field
from typing import Optional

class LocationPingRequest(BaseModel):
    user_id: str
    incident_id: Optional[str] = None
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    speed: Optional[float] = None
    heading: Optional[float] = None
    accuracy: Optional[float] = None
    battery_level: Optional[int] = Field(None, ge=0, le=100)

class LocationPingResponse(BaseModel):
    status: str = "success"
    recorded_at: str
