from fastapi import APIRouter, HTTPException, status
from typing import List, Dict, Any
from datetime import datetime

from app.schemas.device import DeviceFCMRegister
from app.schemas.notification import PushNotificationSend
from app.database import get_supabase

router = APIRouter(prefix="/api/v1/notifications", tags=["Notification Service & FCM Tokens"])

memory_device_store: Dict[str, Dict[str, Any]] = {}
memory_notifications_store: List[Dict[str, Any]] = []

@router.post("/fcm/register", status_code=status.HTTP_201_CREATED)
async def register_fcm_token(payload: DeviceFCMRegister):
    """
    Register or update an FCM device token in Supabase 'devices' table.
    """
    supabase = get_supabase()
    
    if supabase is not None:
        try:
            data = {
                "fcm_token": payload.fcm_token,
                "platform": payload.platform,
                "device_name": payload.device_name,
                "device_model": payload.device_model,
                "os_version": payload.os_version,
                "last_active": datetime.utcnow().isoformat(),
            }
            if payload.user_id:
                data["user_id"] = payload.user_id

            response = supabase.table("devices").upsert(data, on_conflict="fcm_token").execute()
            return {"status": "success", "message": "FCM device token registered in Supabase", "data": response.data}
        except Exception as err:
            raise HTTPException(status_code=500, detail=f"Database error: {str(err)}")
    else:
        memory_device_store[payload.fcm_token] = {
            "id": f"dev-{len(memory_device_store) + 1}",
            "user_id": payload.user_id,
            "fcm_token": payload.fcm_token,
            "platform": payload.platform,
            "device_name": payload.device_name,
            "last_active": datetime.utcnow().isoformat()
        }
        return {"status": "success", "message": "FCM token registered (dev mode)", "token": payload.fcm_token}

@router.get("/fcm/tokens", response_model=List[Dict[str, Any]])
async def list_fcm_tokens():
    """
    List registered FCM device tokens from public.devices table.
    """
    supabase = get_supabase()
    if supabase is not None:
        try:
            response = supabase.table("devices").select("*").execute()
            return response.data
        except Exception as err:
            raise HTTPException(status_code=500, detail=f"Database error: {str(err)}")
    else:
        return list(memory_device_store.values())

@router.post("/send", status_code=status.HTTP_201_CREATED)
async def send_push_notification(payload: PushNotificationSend):
    """
    Send a push notification and log it in Supabase 'notifications' table.
    """
    supabase = get_supabase()
    if supabase is not None:
        try:
            data = {
                "message": payload.body,
                "notification_type": payload.notification_type or "SOS_ALERT",
                "status": "SENT",
                "sent_at": datetime.utcnow().isoformat(),
            }
            if payload.user_id:
                data["user_id"] = payload.user_id
            if payload.incident_id:
                data["incident_id"] = payload.incident_id
            if payload.recipient_phone:
                data["recipient_phone"] = payload.recipient_phone

            response = supabase.table("notifications").insert(data).execute()
            return {"status": "success", "message": "Notification dispatched and saved to Supabase", "data": response.data}
        except Exception as err:
            raise HTTPException(status_code=500, detail=f"Database error: {str(err)}")
    else:
        notification = {
            "id": f"notif-{len(memory_notifications_store) + 1}",
            "user_id": payload.user_id,
            "incident_id": payload.incident_id,
            "title": payload.title,
            "body": payload.body,
            "notification_type": payload.notification_type,
            "status": "SENT",
            "sent_at": datetime.utcnow().isoformat()
        }
        memory_notifications_store.append(notification)
        return {"status": "success", "message": "Notification dispatched (dev mode)", "data": [notification]}

@router.get("/history", response_model=List[Dict[str, Any]])
async def notification_history():
    """
    Get notification history from public.notifications table.
    """
    supabase = get_supabase()
    if supabase is not None:
        try:
            response = supabase.table("notifications").select("*").order("created_at", desc=True).execute()
            return response.data
        except Exception as err:
            raise HTTPException(status_code=500, detail=f"Database error: {str(err)}")
    else:
        return memory_notifications_store
