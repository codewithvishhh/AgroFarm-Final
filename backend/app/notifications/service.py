"""Notification creation plus live push."""

from sqlalchemy.orm import Session

from app.models.models import Notification, NotificationType, Role
from app.schemas.schemas import NotificationOut
from app.websocket import events
from app.websocket.manager import manager


async def push_notification(
    db: Session,
    title: str,
    message: str,
    type_: NotificationType = NotificationType.SYSTEM,
    reference_id: str | None = None,
    user_id: str | None = None,
    audience: Role | None = None,
) -> Notification:
    """Persist a notification and broadcast it to every connected client.

    `audience` is None when every role should see the message.
    """
    notification = Notification(
        title=title,
        message=message,
        type=type_,
        reference_id=reference_id,
        user_id=user_id,
        audience=audience,
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)

    await manager.broadcast(
        events.NOTIFICATION_CREATED,
        NotificationOut.model_validate(notification).model_dump(),
    )
    return notification
