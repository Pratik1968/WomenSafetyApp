from fastapi import APIRouter
from app.schemas.evidence import EvidenceUploadResponse

router = APIRouter(prefix="/evidence", tags=["Evidence & Media Module"])

@router.post("/upload", response_model=EvidenceUploadResponse)
async def upload_evidence():
    return EvidenceUploadResponse(
        id="ev-123",
        incident_id="sos-456",
        file_type="AUDIO",
        file_url="https://storage.provider/evidence/audio-123.mp3",
        status="UPLOADED"
    )
