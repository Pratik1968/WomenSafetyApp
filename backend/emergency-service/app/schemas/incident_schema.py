from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List


class LocationPayload(BaseModel):
    lat: float
    lon: float
    accurate: bool = True
    timestamp: Optional[int] = None


class IncidentEventRequest(BaseModel):
    clientIncidentId: str = Field(..., description="Device-generated incident id, e.g. sos-<ts>-<rand>")
    firebaseUid: str = Field(..., description="Firebase UID of the reporting user")
    source: str = Field(..., description="BUTTON or SHAKE")
    status: str = Field(..., description="active, resolved, or cancelled")
    startedAt: int = Field(..., description="Incident start time, epoch milliseconds")
    endedAt: Optional[int] = Field(None, description="Incident end time, epoch milliseconds")
    location: Optional[LocationPayload] = None
    step: str = Field(..., description="Timeline step name, e.g. SOS_TRIGGERED, SMS_SENT")
    stepData: Optional[Dict[str, Any]] = Field(None, description="Arbitrary metadata for this step")
    occurredAt: int = Field(..., description="When this step occurred, epoch milliseconds")


class TimelineEvent(BaseModel):
    step: str
    metadata: Optional[Dict[str, Any]] = None
    occurredAt: str


class IncidentSummary(BaseModel):
    id: str
    clientIncidentId: str
    source: str
    status: str
    startedAt: str
    endedAt: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class IncidentDetail(IncidentSummary):
    timeline: List[TimelineEvent] = []
    locationHistory: List[Dict[str, Any]] = []
    contactsNotified: List[Dict[str, Any]] = []


class ApiResponse(BaseModel):
    success: bool
    data: Optional[Any] = None
    message: Optional[str] = None
    timestamp: str
