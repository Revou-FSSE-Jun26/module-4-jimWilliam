from sqlalchemy import func, select

from app.blueprints.notifications.schema import PageQuerySchema
from app.common.errors import AppError
from app.extensions import db
from app.models import Notification


def list_notifications(user_id, args) -> dict:
    data = PageQuerySchema().load(args)
    page, per_page = data["page"], data["per_page"]
    base = select(Notification).where(Notification.user_id == user_id)
    total = db.session.execute(select(func.count()).select_from(base.subquery())).scalar_one()
    unread = db.session.execute(
        select(func.count(Notification.id)).where(Notification.user_id == user_id, Notification.read.is_(False))
    ).scalar_one()
    items = db.session.execute(
        base.order_by(Notification.created_at.desc(), Notification.id).offset((page - 1) * per_page).limit(per_page)
    ).scalars().all()
    return {"items": items, "page": page, "per_page": per_page, "total": total, "unread_count": unread}


def mark_read(notification_id, user_id) -> Notification:
    notification = db.session.get(Notification, notification_id)
    if notification is None:
        raise AppError("Notification not found", 404)
    if notification.user_id != user_id:
        raise AppError("You can only update your own notifications", 403)
    if not notification.read:
        notification.read = True
        db.session.commit()
    return notification
