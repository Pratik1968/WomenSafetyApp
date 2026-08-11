from fastapi import APIRouter
from app.schemas.guardian import GuardianInviteRequest, GuardianResponse

router = APIRouter(prefix="/guardians", tags=["Guardians Module"])

@router.post("/invite", response_model=GuardianResponse)
async def invite_guardian(payload: GuardianInviteRequest):
    return GuardianResponse(
        id="g-1",
        status="PENDING_ACCEPTANCE",
        guardian_name=payload.guardian_name,
        guardian_phone=payload.guardian_phone
    )
