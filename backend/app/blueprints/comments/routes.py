from flask import request
from flask_jwt_extended import jwt_required

from app.blueprints.comments import bp, service
from app.blueprints.comments.schema import CommentSchema
from app.common.envelope import ok
from app.common.utils import current_user_id


@bp.post("/cards/<uuid:card_id>/comments")
@jwt_required()
def create_comment(card_id):
    comment = service.create_comment(card_id, current_user_id(), request.get_json(silent=True))
    return ok(CommentSchema().dump(comment), 201)


@bp.get("/cards/<uuid:card_id>/comments")
@jwt_required()
def list_comments(card_id):
    return ok(CommentSchema(many=True).dump(service.list_comments(card_id, current_user_id())))


@bp.patch("/comments/<uuid:comment_id>")
@jwt_required()
def update_comment(comment_id):
    comment = service.update_comment(comment_id, current_user_id(), request.get_json(silent=True))
    return ok(CommentSchema().dump(comment))


@bp.delete("/comments/<uuid:comment_id>")
@jwt_required()
def delete_comment(comment_id):
    service.delete_comment(comment_id, current_user_id())
    return ok({"id": str(comment_id)})
