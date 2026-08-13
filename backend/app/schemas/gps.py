from pydantic import BaseModel, Field
from typing import Optional, List

class LocationPingRequest(BaseModel):
    user_id: str
    session_id: Optional[str] = None
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
    geofence_status: Optional[str] = "inside"

class GeofenceCheckRequest(BaseModel):
    current_lat: float
    current_lng: float
    center_lat: float
    center_lng: float
    radius_meters: float = 500.0

class GeofenceCheckResponse(BaseModel):
    is_inside: bool
    distance_meters: float
    zone_name: Optional[str] = "Safe Zone"

class TrackingSessionCreateRequest(BaseModel):
    user_id: str
    destination_name: str
    destination_lat: float
    destination_lng: float
    route_name: Optional[str] = "Safe Lit Corridor"

class TrackingSessionResponse(BaseModel):
    session_id: str
    share_url: str
    started_at: str
    status: str = "active"

class FamilyLiveTrackingData(BaseModel):
    session_id: str
    user_id: str
    user_name: str
    current_lat: float
    current_lng: float
    destination_name: str
    destination_lat: float
    destination_lng: float
    distance_remaining_km: float
    eta_minutes: int
    battery_level: int
    last_updated_at: str
    is_active: bool
