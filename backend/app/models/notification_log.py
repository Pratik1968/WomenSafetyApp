import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime
from app.db.base import Base

class NotificationLog(Base):
    __tablename__ = "notification_logs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(100), nullable=True, index=True)
    incident_id = Column(String(100), nullable=True, index=True)
    notification_type = Column(String(50), nullable=False, default="SOS_ALERT")
    title = Column(String(255), nullable=False)
    body = Column(Text, nullable=False)
    recipient_phone = Column(String(50), nullable=True)
    status = Column(String(50), nullable=False, default="SENT")
    message_id = Column(String(255), nullable=True)
    error_detail = Column(Text, nullable=True)
    sent_at = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
