from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status

from app.core.logging import logger
from app.core.security import get_current_firebase_uid
from app.repositories.incident_report_repository import IncidentReportRepository
from app.repositories.user_repository import UserRepository
from app.schemas.report import IncidentReportResponse, PublicIncidentReportResponse, ReportType

router = APIRouter(prefix="/reports", tags=["Crowd-Sourced Incident Reporting"])

MAX_FILES_PER_REPORT = 5


def _resolve_caller_user_id(current_uid: str) -> str:
    caller = UserRepository().get_by_firebase_uid(current_uid)
    if not caller:
        raise HTTPException(status_code=400, detail="Complete your profile before submitting a report")
    return caller["id"]


@router.post("", response_model=IncidentReportResponse, status_code=status.HTTP_201_CREATED)
async def create_report(
    report_type: ReportType = Form(...),
    description: Optional[str] = Form(None),
    latitude: float = Form(...),
    longitude: float = Form(...),
    address: Optional[str] = Form(None),
    files: List[UploadFile] = File(default=[]),
    current_uid: str = Depends(get_current_firebase_uid),
):
    user_id = _resolve_caller_user_id(current_uid)

    if len(files) > MAX_FILES_PER_REPORT:
        raise HTTPException(status_code=400, detail=f"A report can include at most {MAX_FILES_PER_REPORT} files")

    repo = IncidentReportRepository()

    media = []
    for upload in files:
        if not upload.content_type or not (
            upload.content_type.startswith("image/") or upload.content_type.startswith("video/")
        ):
            logger.warning(f"Skipping report attachment with unsupported content-type: {upload.content_type}")
            continue
        content = await upload.read()
        uploaded = repo.upload_media(user_id, content, upload.content_type)
        if uploaded:
            media.append(uploaded)

    try:
        report = repo.create(
            user_id=user_id,
            report_type=report_type.value,
            latitude=latitude,
            longitude=longitude,
            description=description,
            address=address,
            media=media,
        )
        logger.info(f"Incident report submitted by user_id={user_id}")
        return report
    except Exception as err:
        logger.error(f"Error creating incident report: {err}")
        raise HTTPException(status_code=500, detail=f"Failed to submit report: {str(err)}")


@router.get("/me", response_model=List[IncidentReportResponse])
async def list_my_reports(current_uid: str = Depends(get_current_firebase_uid)):
    user_id = _resolve_caller_user_id(current_uid)
    try:
        return IncidentReportRepository().list_by_user(user_id)
    except Exception as err:
        logger.error(f"Error fetching reports for user {user_id}: {err}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch reports: {str(err)}")


@router.get("", response_model=List[PublicIncidentReportResponse])
async def list_nearby_reports(
    latitude: float = Query(...),
    longitude: float = Query(...),
    radius_km: float = Query(5.0, gt=0, le=50),
    limit: int = Query(50, gt=0, le=200),
    current_uid: str = Depends(get_current_firebase_uid),
):
    try:
        return IncidentReportRepository().list_nearby(latitude, longitude, radius_km, limit)
    except Exception as err:
        logger.error(f"Error fetching nearby reports: {err}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch nearby reports: {str(err)}")


@router.get("/{report_id}", response_model=PublicIncidentReportResponse)
async def get_report(report_id: str, current_uid: str = Depends(get_current_firebase_uid)):
    report = IncidentReportRepository().get(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report
