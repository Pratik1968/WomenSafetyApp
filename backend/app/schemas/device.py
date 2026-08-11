from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime


class DeviceRegisterRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    device_id: str = Field(..., alias="deviceId", description="Unique client hardware or app instance identifier")
    fcm_token: str = Field(..., alias="fcmToken", description="Firebase Cloud Messaging push token")
    platform: Optional[str] = Field("android", alias="platform", description="Platform e.g. 'android' or 'ios'")
    device_name: Optional[str] = Field(None, alias="deviceName", description="Human-readable device name")
    manufacturer: Optional[str] = Field(None, alias="manufacturer", description="Device manufacturer")
    model: Optional[str] = Field(None, alias="model", description="Device model")
    os_version: Optional[str] = Field(None, alias="osVersion", description="Operating system version")
    app_version: Optional[str] = Field(None, alias="appVersion", description="Installed mobile application version")
    firebase_uid: Optional[str] = Field(None, alias="firebaseUid", description="Firebase Auth UID of the logged-in user")
    user_id: Optional[str] = Field(None, alias="userId", description="Optional internal user UUID if already known")
    notification_enabled: Optional[bool] = Field(True, alias="notificationEnabled", description="Whether push notifications are enabled for this device")


class DeviceDeactivateRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    device_id: str = Field(..., alias="deviceId", description="Device to deactivate, e.g. on logout")


class DeviceTokenResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: str
    device_id: str = Field(..., alias="deviceId")
    user_id: Optional[str] = Field(None, alias="userId")
    firebase_uid: Optional[str] = Field(None, alias="firebaseUid")
    platform: Optional[str] = None
    device_name: Optional[str] = Field(None, alias="deviceName")
    manufacturer: Optional[str] = None
    device_model: Optional[str] = Field(None, alias="model")
    os_version: Optional[str] = Field(None, alias="osVersion")
    app_version: Optional[str] = Field(None, alias="appVersion")
    notification_enabled: bool = Field(..., alias="notificationEnabled")
    is_active: bool = Field(..., alias="isActive")
    last_active: Optional[datetime] = Field(None, alias="lastSeen")
    created_at: Optional[datetime] = Field(None, alias="createdAt")
    updated_at: Optional[datetime] = Field(None, alias="updatedAt")
