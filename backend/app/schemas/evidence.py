from pydantic import BaseModel
from typing import Optional

class EvidenceUploadResponse(BaseModel):
    id: str
    incident_id: str
    file_type: str
    file_url: str
    status: str = "UPLOADED"
