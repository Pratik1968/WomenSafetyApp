from fastapi import APIRouter, HTTPException, status
from typing import List, Dict, Any
from datetime import datetime

from app.schemas.notification_schema import DeviceRegisterRequest, NotificationResponse
from app.core.config import get_supabase

router = APIRouter(prefix="/devices", tags=["Device Registration & FCM Tokens"])

memory_devices: Dict[str, Dict[str, Any]] = {}

@router.post("/register", status_code=status.HTTP_201_CREATED, response_model=NotificationResponse)
async def register_device(payload: DeviceRegisterRequest):
    """
    Register or update an FCM device token in Supabase 'devices' table.
    Matches frontend POST /devices/register contract.
    """
    supabase = get_supabase()
    
    device_data = {
        "device_id": payload.deviceId,
        "fcm_token": payload.fcmToken,
        "platform": payload.platform,
        "firebase_uid": payload.firebaseUid,
        "device_name": payload.deviceName,
        "device_model": payload.deviceModel,
        "os_version": payload.osVersion,
        "app_version": payload.appVersion,
        "last_active": datetime.utcnow().isoformat(),
        "is_active": True
    }
    
    if supabase is not None:
        try:
            response = supabase.table("devices").upsert(device_data, on_conflict="fcm_token").execute()
            return NotificationResponse(
                status="success",
                message="Device FCM token registered in Supabase",
                data=response.data
            )
        except Exception as err:
            raise HTTPException(status_code=500, detail=f"Database error: {str(err)}")
    else:
        key = payload.fcmToken
        memory_devices[key] = device_data
        return NotificationResponse(
            status="success",
            message="Device FCM token registered (dev mode)",
            data=[device_data]
        )

@router.get("/{user_id}", response_model=List[Dict[str, Any]])
async def get_user_devices(user_id: str):
    """
    Get all active devices for a specific user ID or Firebase UID.
    """
    supabase = get_supabase()
    if supabase is not None:
        try:
            res = supabase.table("devices").select("*").or_(f"user_id.eq.{user_id},firebase_uid.eq.{user_id}").execute()
            return res.data
        except Exception as err:
            raise HTTPException(status_code=500, detail=f"Database error: {str(err)}")
    else:
        return [dev for dev in memory_devices.values() if dev.get("firebase_uid") == user_id or dev.get("user_id") == user_id]
