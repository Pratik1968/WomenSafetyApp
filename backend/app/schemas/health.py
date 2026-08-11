from pydantic import BaseModel
from typing import Dict, Any

class HealthCheckResponse(BaseModel):
    status: str = "healthy"
    service: str = "Aegis Women Safety Backend API"
    version: str = "1.0.0"
    firebase_connected: bool = False
    details: Dict[str, Any] = {}
