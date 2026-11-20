from app.common.media_urls import user_brief
from marshmallow import EXCLUDE, Schema, ValidationError, fields, missing, pre_load, validate, validates_schema


class CardCreateSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    title = fields.String(required=True, validate=validate.Length(min=1, max=200))
    description = fields.String(allow_none=True, validate=validate.Length(max=20000))   # HTML; text limit in the service
    assignee_id = fields.UUID(allow_none=True)

    @pre_load
    def strip(self, data, **kwargs):
        if isinstance(data, dict) and isinstance(data.get("title"), str):
            data = {**data, "title": data["title"].strip()}
        return data


class CardUpdateSchema(CardCreateSchema):
    title = fields.String(validate=validate.Length(min=1, max=200))

    @validates_schema
    def not_empty(self, data, **kwargs):
        if not data:
            raise ValidationError("Send at least one of title, description or assignee_id")


class CardPositionSchema(Schema):
    """Validated move payload: UUID column_id and a positive float order (R4.5, R4.6)."""

    class Meta:
        unknown = EXCLUDE

    column_id = fields.UUID(required=True)
    order = fields.Float(required=True, allow_nan=False,
                         validate=validate.Range(min=0, min_inclusive=False))


class CardQuerySchema(Schema):
    class Meta:
        unknown = EXCLUDE

    assignee = fields.String(validate=validate.OneOf(["me"]))
    search = fields.String()

    @validates_schema
    def one_filter(self, data, **kwargs):
        if "search" in data and not data["search"].strip():
            raise ValidationError("Search term must not be empty", "search")
        if "search" not in data and "assignee" not in data:
            raise ValidationError("Use ?assignee=me or ?search=<term>")


class CardSchema(Schema):
    id = fields.UUID()
    column_id = fields.UUID()
    title = fields.String()
    description = fields.String(allow_none=True)
    description_text = fields.String(allow_none=True)
    assignee_id = fields.UUID(allow_none=True)
    assignee = fields.Method("get_assignee")
    order = fields.Float()
    comment_count = fields.Method("get_comment_count")
    attachment_count = fields.Method("get_attachment_count")
    board_id = fields.Method("get_board_id")
    board_name = fields.Method("get_board_name")
    created_at = fields.DateTime()
    updated_at = fields.DateTime()

    def get_assignee(self, card):
        return user_brief(card.assignee)

    def get_comment_count(self, card):
        return getattr(card, "comment_count", missing)

    def get_attachment_count(self, card):
        return getattr(card, "attachment_count", missing)

    def get_board_id(self, card):
        meta = getattr(card, "board_meta", None)
        return str(meta[0]) if meta else missing

    def get_board_name(self, card):
        meta = getattr(card, "board_meta", None)
        return meta[1] if meta else missing
