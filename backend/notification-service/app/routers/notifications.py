from fastapi import APIRouter, HTTPException, status
from typing import List, Dict, Any
from datetime import datetime

from app.schemas.notification_schema import PushNotificationSendRequest, NotificationResponse
from app.core.config import get_supabase
from app.services.fcm_service import get_active_tokens_for_user, send_push_to_tokens

router = APIRouter(prefix="/notifications", tags=["Notification Dispatch & History"])

memory_notifications: List[Dict[str, Any]] = []

@router.post("/send", status_code=status.HTTP_201_CREATED, response_model=NotificationResponse)
async def send_notification(payload: PushNotificationSendRequest):
    """
    Send a real FCM push (if the user has registered device tokens) and log
    the outcome as a push notification for an SOS incident or user alert.
    """
    supabase = get_supabase()
    title = payload.title or "Aegis Safety Alert"

    fcm_result = {"sent": 0, "failed": 0, "invalid_tokens": []}
    if payload.userId:
        tokens = get_active_tokens_for_user(payload.userId)
        fcm_result = send_push_to_tokens(
            tokens,
            title=title,
            body=payload.body,
            data={
                "notificationType": payload.notificationType or "SOS_ALERT",
                "incidentId": payload.incidentId or "",
                **(payload.extraData or {}),
            },
        )

    delivery_status = "SENT" if fcm_result["sent"] > 0 else ("FAILED" if fcm_result["failed"] > 0 else "LOGGED_ONLY")

    notif_data = {
        "user_id": payload.userId,
        "incident_id": payload.incidentId,
        "recipient_phone": payload.recipientPhone,
        "recipient_name": payload.recipientName,
        "notification_type": payload.notificationType or "SOS_ALERT",
        "title": title,
        "body": payload.body,
        "message": payload.body,
        "status": delivery_status,
        "sent_at": datetime.utcnow().isoformat()
    }

    if supabase is not None:
        try:
            res = supabase.table("notifications").insert(notif_data).execute()
            return NotificationResponse(
                status="success",
                message=f"FCM: {fcm_result['sent']} sent, {fcm_result['failed']} failed. Logged to Supabase.",
                data=res.data
            )
        except Exception as err:
            raise HTTPException(status_code=500, detail=f"Database error: {str(err)}")
    else:
        memory_notifications.append(notif_data)
        return NotificationResponse(
            status="success",
            message=f"FCM: {fcm_result['sent']} sent, {fcm_result['failed']} failed. Logged (dev mode).",
            data=[notif_data]
        )

@router.get("/history", response_model=List[Dict[str, Any]])
async def notification_history():
    """
    Retrieve history of push notifications.
    """
    supabase = get_supabase()
    if supabase is not None:
        try:
            res = supabase.table("notifications").select("*").order("created_at", desc=True).execute()
            return res.data
        except Exception as err:
            raise HTTPException(status_code=500, detail=f"Database error: {str(err)}")
    else:
        return memory_notifications
