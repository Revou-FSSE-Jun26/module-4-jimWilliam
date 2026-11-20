import time

from flask import make_response, request
from flask_jwt_extended import jwt_required

from app.blueprints.media import bp, service
from app.blueprints.media.schema import AttachmentSchema
from app.common.envelope import ok
from app.common.utils import current_user_id


@bp.get("/cards/<uuid:card_id>/attachments")
@jwt_required()
def list_attachments(card_id):
    return ok(AttachmentSchema(many=True).dump(service.list_attachments(card_id, current_user_id())))


@bp.post("/cards/<uuid:card_id>/attachments")
@jwt_required()
def add_attachment(card_id):
    media = service.add_attachment(card_id, current_user_id(), request.files.get("file"))
    return ok(AttachmentSchema().dump(media), 201)


@bp.delete("/attachments/<uuid:attachment_id>")
@jwt_required()
def delete_attachment(attachment_id):
    service.delete_attachment(attachment_id, current_user_id())
    return ok({"id": str(attachment_id)})


@bp.get("/media/<uuid:media_id>")
def get_media(media_id):
    """No JWT: the signed URL is the credential (R43), so <img> tags on another domain can load it."""
    variant = request.args.get("v", "full")
    data, expiry = service.read_image(media_id, variant, request.args.get("exp"), request.args.get("sig"))
    response = make_response(data)
    response.headers["Content-Type"] = "image/avif"
    response.headers["Content-Disposition"] = "inline"
    response.headers["Cache-Control"] = f"private, max-age={max(0, expiry - int(time.time()))}, immutable"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Cross-Origin-Resource-Policy"] = "cross-origin"
    return response
