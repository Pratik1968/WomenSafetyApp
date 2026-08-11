from typing import Optional, List
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.notification_log import NotificationLog
from app.db.database import get_supabase
from app.core.logging import logger

class NotificationRepository:
    def __init__(self, db: Optional[Session] = None):
        self.db = db

    def create_log(
        self,
        title: str,
        body: str,
        notification_type: str = "SOS_ALERT",
        user_id: Optional[str] = None,
        incident_id: Optional[str] = None,
        recipient_phone: Optional[str] = None,
        status: str = "SENT",
        message_id: Optional[str] = None,
        error_detail: Optional[str] = None
    ) -> NotificationLog:
        supabase = get_supabase()
        if supabase is not None:
            try:
                data = {
                    "message": body,
                    "notification_type": notification_type,
                    "status": status,
                    "sent_at": datetime.utcnow().isoformat(),
                }
                if user_id:
                    data["user_id"] = user_id
                if incident_id:
                    data["incident_id"] = incident_id
                if recipient_phone:
                    data["recipient_phone"] = recipient_phone
                supabase.table("notifications").insert(data).execute()
            except Exception as e:
                logger.warning(f"Supabase notification insert failed: {e}")

        log = NotificationLog(
            user_id=user_id,
            incident_id=incident_id,
            notification_type=notification_type,
            title=title,
            body=body,
            recipient_phone=recipient_phone,
            status=status,
            message_id=message_id,
            error_detail=error_detail,
            sent_at=datetime.utcnow()
        )

        if self.db:
            self.db.add(log)
            self.db.commit()
            self.db.refresh(log)

        return log

    def get_history(self, limit: int = 50) -> List[NotificationLog]:
        if self.db:
            return self.db.query(NotificationLog).order_by(NotificationLog.created_at.desc()).limit(limit).all()
        return []
