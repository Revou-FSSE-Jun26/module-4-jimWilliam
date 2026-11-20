from marshmallow import Schema, fields

from app.common.media_urls import signed_url, user_brief


class AttachmentSchema(Schema):
    id = fields.UUID()
    card_id = fields.UUID()
    filename = fields.String()
    content_type = fields.String()
    width = fields.Integer()
    height = fields.Integer()
    byte_size = fields.Integer()
    uploaded_by = fields.Method("get_uploaded_by")
    url = fields.Method("get_url")
    thumb_url = fields.Method("get_thumb_url")
    created_at = fields.DateTime()

    def get_uploaded_by(self, media):
        return user_brief(media.owner)

    def get_url(self, media):
        return signed_url(media.id, "full")

    def get_thumb_url(self, media):
        return signed_url(media.id, "thumb")
