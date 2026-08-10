from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime

class NotificationSendRequest(BaseModel):
    user_id: Optional[str] = Field(None, description="Target user UUID")
    fcm_token: Optional[str] = Field(None, description="Target FCM token directly")
    title: str = Field(..., description="Notification title")
    body: str = Field(..., description="Notification message body")
    notification_type: Optional[str] = Field("SOS_ALERT", description="SOS_ALERT, GUARDIAN_ALERT, AI_ALERT, TRACKING, SAFE_ARRIVAL, LOW_BATTERY")
    data: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Custom key-value data payload")
    priority: Optional[str] = Field("high", description="Delivery priority ('high' or 'normal')")
    ttl: Optional[int] = Field(None, description="Time to live in seconds")
    channel_id: Optional[str] = Field("sos_channel", description="Android Notification Channel ID")

class MulticastNotificationRequest(BaseModel):
    fcm_tokens: List[str] = Field(..., description="List of FCM device tokens")
    title: str = Field(..., description="Notification title")
    body: str = Field(..., description="Notification message body")
    data: Optional[Dict[str, Any]] = Field(default_factory=dict)
    notification_type: Optional[str] = Field("SOS_ALERT")
    priority: Optional[str] = Field("high")
    ttl: Optional[int] = Field(None)

class NotificationLogResponse(BaseModel):
    id: str
    user_id: Optional[str] = None
    incident_id: Optional[str] = None
    notification_type: str
    title: str
    body: str
    status: str
    message_id: Optional[str] = None
    sent_at: Optional[datetime] = None
