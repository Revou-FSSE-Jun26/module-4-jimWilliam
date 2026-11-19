from marshmallow import EXCLUDE, Schema, fields, validate


class PageQuerySchema(Schema):
    class Meta:
        unknown = EXCLUDE

    page = fields.Integer(load_default=1, strict=False, validate=validate.Range(min=1))
    per_page = fields.Integer(load_default=10, strict=False, validate=validate.Range(min=1, max=100))


class NotificationSchema(Schema):
    id = fields.UUID()
    message = fields.String()
    card_id = fields.UUID(allow_none=True)
    board_id = fields.UUID(allow_none=True)
    read = fields.Boolean()
    created_at = fields.DateTime()


class NotificationPageSchema(Schema):
    items = fields.Nested(NotificationSchema, many=True)
    page = fields.Integer()
    per_page = fields.Integer()
    total = fields.Integer()
    unread_count = fields.Integer()
