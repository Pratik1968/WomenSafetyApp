import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, Integer, Text, DateTime
from app.db.base import Base

class SOSIncident(Base):
    __tablename__ = "sos_incidents"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), nullable=False, index=True)
    status = Column(String(50), default="ACTIVE", nullable=False)
    trigger_type = Column(String(50), default="BUTTON_PRESS", nullable=False)
    danger_score = Column(Integer, default=0)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    notes = Column(Text, nullable=True)
    started_at = Column(DateTime, default=datetime.utcnow)
    ended_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
