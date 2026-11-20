from flask import request
from flask_jwt_extended import jwt_required

from app.blueprints.media import service as media_service
from app.blueprints.users import bp, service
from app.blueprints.users.schema import UserSchema
from app.common.envelope import ok
from app.common.utils import current_user_id


@bp.get("/me")
@jwt_required()
def get_me():
    return ok(UserSchema().dump(service.get_me(current_user_id())))


@bp.patch("/me")
@jwt_required()
def update_me():
    user = service.update_me(current_user_id(), request.get_json(silent=True))
    return ok(UserSchema().dump(user))


@bp.post("/me/avatar")
@jwt_required()
def upload_avatar():
    """multipart/form-data with one image in the field `file`; stored as a 512 px AVIF (R41)."""
    return ok(UserSchema().dump(media_service.set_avatar(current_user_id(), request.files.get("file"))))


@bp.delete("/me/avatar")
@jwt_required()
def delete_avatar():
    return ok(UserSchema().dump(media_service.remove_avatar(current_user_id())))
