from flask import request
from flask_jwt_extended import jwt_required

from app.blueprints.notifications import bp, service
from app.blueprints.notifications.schema import NotificationPageSchema, NotificationSchema
from app.common.envelope import ok
from app.common.utils import current_user_id


@bp.get("")
@jwt_required()
def list_notifications():
    page = service.list_notifications(current_user_id(), request.args.to_dict())
    return ok(NotificationPageSchema().dump(page))


@bp.patch("/<uuid:notification_id>/read")
@jwt_required()
def mark_read(notification_id):
    return ok(NotificationSchema().dump(service.mark_read(notification_id, current_user_id())))
