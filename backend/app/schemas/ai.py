from pydantic import BaseModel
from typing import Optional, Dict, Any

class ThreatAssessmentRequest(BaseModel):
    user_id: str
    incident_id: Optional[str] = None
    audio_sample_url: Optional[str] = None
    voice_keyword: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class ThreatAssessmentResponse(BaseModel):
    danger_score: int
    threat_level: str
    action_recommended: str
    details: Dict[str, Any] = {}
