from pydantic import BaseModel
from typing import Optional

class EmergencyContactCreate(BaseModel):
    user_id: Optional[str] = None
    name: str
    phone: str
    relationship: Optional[str] = "FRIEND"
    priority: Optional[int] = 1

class EmergencyContactUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    relationship: Optional[str] = None
    priority: Optional[int] = None

class EmergencyContactResponse(BaseModel):
    id: str
    user_id: str
    name: str
    phone: str
    relationship: Optional[str] = None
    priority: int = 1
    created_at: Optional[str] = None

class SOSIncidentCreate(BaseModel):
    user_id: str
    trigger_type: str = "BUTTON_PRESS"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    notes: Optional[str] = None

class SOSIncidentResponse(BaseModel):
    id: str
    user_id: str
    status: str
    trigger_type: str
    danger_score: int = 0
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    started_at: Optional[str] = None
