from enum import Enum
from typing import List, Optional

from pydantic import BaseModel


class ReportType(str, Enum):
    HARASSMENT = "HARASSMENT"
    THEFT = "THEFT"
    ASSAULT = "ASSAULT"
    STALKING = "STALKING"
    SUSPICIOUS_PERSON = "SUSPICIOUS_PERSON"
    UNSAFE_LOCATION = "UNSAFE_LOCATION"


class ReportMedia(BaseModel):
    url: str
    type: str  # PHOTO | VIDEO


class IncidentReportResponse(BaseModel):
    """Full report record, returned only to the reporter themself (GET /reports/me)."""

    id: str
    user_id: str
    report_type: str
    description: Optional[str] = None
    latitude: float
    longitude: float
    address: Optional[str] = None
    media: List[ReportMedia] = []
    status: str = "PENDING"
    created_at: Optional[str] = None


class PublicIncidentReportResponse(BaseModel):
    """Community-feed record with the reporter's identity stripped out - reports are
    anonymous to other users; only the area, category and time are made visible."""

    id: str
    report_type: str
    description: Optional[str] = None
    latitude: float
    longitude: float
    address: Optional[str] = None
    media: List[ReportMedia] = []
    status: str = "PENDING"
    created_at: Optional[str] = None
