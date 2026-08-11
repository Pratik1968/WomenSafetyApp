from fastapi import APIRouter
from typing import List, Dict, Any

router = APIRouter(prefix="/incidents", tags=["SOS Incidents Module"])

@router.get("", response_model=List[Dict[str, Any]])
async def list_incidents():
    return [
        {"id": "sos-456", "user_id": "usr-123", "status": "ACTIVE", "trigger_type": "BUTTON_PRESS"}
    ]
