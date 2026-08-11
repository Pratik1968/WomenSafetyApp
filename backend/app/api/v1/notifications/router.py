from fastapi import APIRouter, Depends, status, HTTPException
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from app.schemas.notification import (
    NotificationSendRequest,
    MulticastNotificationRequest,
    NotificationLogResponse,
)
from app.services.notification.notification_service import NotificationService
from app.repositories.notification_repository import NotificationRepository
from app.db.session import get_db

router = APIRouter(prefix="/notifications", tags=["Notification Infrastructure"])

@router.post("/send", status_code=status.HTTP_201_CREATED)
async def send_single_notification(
    payload: NotificationSendRequest,
    db: Session = Depends(get_db)
):
    """
    Send push notification to a single FCM device token or user.
    """
    if not payload.fcm_token:
        raise HTTPException(status_code=400, detail="fcm_token is required for single notification delivery")

    service = NotificationService(db)
    result = service.send_notification(
        token=payload.fcm_token,
        title=payload.title,
        body=payload.body,
        data=payload.data,
        notification_type=payload.notification_type or "SOS_ALERT",
        channel_id=payload.channel_id or "sos_channel",
        ttl=payload.ttl,
        priority=payload.priority or "high",
        user_id=payload.user_id
    )
    return result

@router.post("/send-multicast", status_code=status.HTTP_201_CREATED)
async def send_multicast_notification(
    payload: MulticastNotificationRequest,
    db: Session = Depends(get_db)
):
    """
    Send multicast push notifications to multiple FCM device tokens.
    """
    service = NotificationService(db)
    result = service.send_multicast(
        tokens=payload.fcm_tokens,
        title=payload.title,
        body=payload.body,
        data=payload.data,
        notification_type=payload.notification_type or "SOS_ALERT",
        priority=payload.priority or "high",
        ttl=payload.ttl
    )
    return result

@router.get("/history", response_model=List[NotificationLogResponse])
async def get_notification_history(
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """
    Retrieve history log of sent notifications.
    """
    repo = NotificationRepository(db)
    return repo.get_history(limit=limit)
