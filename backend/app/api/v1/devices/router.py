from fastapi import APIRouter, Depends, status, HTTPException
from typing import List

from app.schemas.device import DeviceRegisterRequest, DeviceDeactivateRequest, DeviceTokenResponse
from app.services.device.device_service import DeviceService
from app.repositories.user_repository import UserRepository
from app.core.security import get_current_firebase_uid
from app.core.logging import logger

router = APIRouter(prefix="/devices", tags=["Device Registration & FCM Tokens"])


@router.post("/register", response_model=DeviceTokenResponse, status_code=status.HTTP_201_CREATED)
async def register_device(payload: DeviceRegisterRequest, current_uid: str = Depends(get_current_firebase_uid)):
    """
    Register or update a device's FCM token in Supabase.
    Updates the token in place if deviceId already exists; otherwise creates a new
    active device record, supporting multiple devices per user.
    """
    # Never trust a client-supplied firebase_uid - always link the device to the
    # verified token's owner, so a device can only ever be attached to the caller's
    # own account (prevents an attacker linking their device to a victim's user_id
    # and intercepting that victim's SOS alerts).
    payload.firebase_uid = current_uid
    try:
        service = DeviceService()
        device = service.register_device(payload)
        logger.info(f"Device token registered/updated successfully: {device['device_id']}")
        return device
    except Exception as err:
        logger.error(f"Error registering device token: {err}")
        raise HTTPException(status_code=500, detail=f"Failed to register device: {str(err)}")


@router.post("/deactivate", response_model=DeviceTokenResponse)
async def deactivate_device(payload: DeviceDeactivateRequest, current_uid: str = Depends(get_current_firebase_uid)):
    """
    Deactivate a device (e.g. on logout), stopping further push notifications to it.
    """
    try:
        service = DeviceService()
        device = service.deactivate_device(payload.device_id)
        if not device:
            raise HTTPException(status_code=404, detail="Device not found")
        logger.info(f"Device deactivated successfully: {device['device_id']}")
        return device
    except HTTPException:
        raise
    except Exception as err:
        logger.error(f"Error deactivating device: {err}")
        raise HTTPException(status_code=500, detail=f"Failed to deactivate device: {str(err)}")


@router.get("/user/{user_id}", response_model=List[DeviceTokenResponse])
async def get_user_devices(user_id: str, current_uid: str = Depends(get_current_firebase_uid)):
    """
    List all registered devices for a user. Callers may only list their own devices.
    """
    try:
        caller = UserRepository().get_by_firebase_uid(current_uid)
        if not caller or caller["id"] != user_id:
            raise HTTPException(status_code=403, detail="Cannot access another user's devices")
        service = DeviceService()
        return service.get_user_devices(user_id)
    except HTTPException:
        raise
    except Exception as err:
        logger.error(f"Error fetching devices for user {user_id}: {err}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch devices: {str(err)}")
