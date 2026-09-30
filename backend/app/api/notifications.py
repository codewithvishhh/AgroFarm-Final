from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.models import Notification, Role
from app.schemas.schemas import NotificationOut

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router.get("", response_model=list[NotificationOut], summary="Notification feed")
def list_notifications(
    db: Session = Depends(get_db),
    audience: Role | None = None,
    is_read: bool | None = None,
    limit: int = 50,
):
    query = db.query(Notification)
    if audience:
        query = query.filter(
            (Notification.audience == audience) | (Notification.audience.is_(None))
        )
    if is_read is not None:
        query = query.filter(Notification.is_read.is_(is_read))
    return query.order_by(Notification.created_at.desc()).limit(limit).all()


@router.patch(
    "/{notification_id}/read", response_model=NotificationOut, summary="Mark read"
)
def mark_read(notification_id: int, db: Session = Depends(get_db)):
    notification = (
        db.query(Notification).filter(Notification.id == notification_id).first()
    )
    if notification is None:
        raise HTTPException(status_code=404, detail="Notification not found")
    notification.is_read = True
    db.commit()
    db.refresh(notification)
    return notification


@router.post("/read-all", summary="Clear the unread badge")
def mark_all_read(db: Session = Depends(get_db)):
    updated = (
        db.query(Notification)
        .filter(Notification.is_read.is_(False))
        .update({Notification.is_read: True})
    )
    db.commit()
    return {"updated": updated}
