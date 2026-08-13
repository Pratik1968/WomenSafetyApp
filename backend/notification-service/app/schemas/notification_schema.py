from pydantic import BaseModel, Field
from typing import Optional, Dict, Any

class DeviceRegisterRequest(BaseModel):
    deviceId: Optional[str] = Field(None, description="Client unique device ID")
    platform: Optional[str] = Field(None, description="Operating system platform (android/ios)")
    fcmToken: str = Field(..., description="FCM device push token")
    firebaseUid: Optional[str] = Field(None, description="Firebase User UID")
    deviceName: Optional[str] = Field(None, description="Device friendly name")
    deviceModel: Optional[str] = Field(None, description="Device hardware model")
    osVersion: Optional[str] = Field(None, description="OS Version string")
    appVersion: Optional[str] = Field(None, description="App version string")

class PushNotificationSendRequest(BaseModel):
    userId: Optional[str] = Field(None, description="Target User UUID")
    incidentId: Optional[str] = Field(None, description="Associated SOS Incident UUID")
    recipientPhone: Optional[str] = Field(None, description="Recipient phone number")
    recipientName: Optional[str] = Field(None, description="Recipient display name")
    title: Optional[str] = Field("Aegis Safety Alert", description="Push notification title")
    body: str = Field(..., description="Push notification body text")
    notificationType: Optional[str] = Field("SOS_ALERT", description="Notification category")
    extraData: Optional[Dict[str, Any]] = Field(None, description="Custom payload key-value pairs")

class NotificationResponse(BaseModel):
    status: str
    message: str
    data: Optional[Any] = None
