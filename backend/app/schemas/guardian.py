from pydantic import BaseModel
from typing import Optional

class GuardianInviteRequest(BaseModel):
    user_id: str
    guardian_phone: str
    guardian_name: str
    relationship: Optional[str] = "FRIEND"

class GuardianResponse(BaseModel):
    id: str
    status: str
    guardian_name: str
    guardian_phone: str
