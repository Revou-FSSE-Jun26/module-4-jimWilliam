from urllib.parse import urlsplit

from marshmallow import EXCLUDE, Schema, ValidationError, fields, pre_load, validate, validates, validates_schema

from app.blueprints.columns.schema import ColumnWithCardsSchema
from app.common.media_urls import avatar_url, user_brief


def _blank_to_none(data: dict, key: str) -> dict:
    value = data.get(key)
    if isinstance(value, str):
        value = value.strip()
        data = {**data, key: value or None}
    return data


class BoardNameSchema(Schema):
    """Create: a name, and optionally the purpose and colour (R47, R48)."""

    class Meta:
        unknown = EXCLUDE

    name = fields.String(required=True, validate=validate.Length(min=1, max=120))
    purpose = fields.String(allow_none=True, validate=validate.Length(max=280))
    color_hue = fields.Integer(allow_none=True, strict=True, validate=validate.Range(min=0, max=359))
    due_date = fields.Date(allow_none=True)   # the board's deadline, "YYYY-MM-DD" (R51)

    @pre_load
    def strip(self, data, **kwargs):
        if isinstance(data, dict) and isinstance(data.get("name"), str):
            data = {**data, "name": data["name"].strip()}
        if isinstance(data, dict):
            data = _blank_to_none(data, "purpose")
        return data


class BoardUpdateSchema(BoardNameSchema):
    """Settings: any of name, purpose and colour; null clears purpose or colour."""
    name = fields.String(validate=validate.Length(min=1, max=120))

    @validates_schema
    def not_empty(self, data, **kwargs):
        if not data:
            raise ValidationError("Send at least one of name, purpose, color_hue or due_date")


class BoardNotesSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    notes = fields.String(required=True, allow_none=True, validate=validate.Length(max=100_000))


class BoardLinkCreateSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    url = fields.String(required=True, validate=validate.Length(min=1, max=2048))
    title = fields.String(allow_none=True, validate=validate.Length(max=120))

    @pre_load
    def strip(self, data, **kwargs):
        if isinstance(data, dict):
            if isinstance(data.get("url"), str):
                data = {**data, "url": data["url"].strip()}
            data = _blank_to_none(data, "title")
        return data

    @validates("url")
    def web_only(self, value, **kwargs):
        """Only http and https links with a host: no javascript:, data: or file: URLs (R47.4)."""
        parts = urlsplit(value)
        if parts.scheme.lower() not in ("http", "https") or not parts.netloc or any(c.isspace() for c in value):
            raise ValidationError("Use a web address that starts with http:// or https://")


class MemberAddSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    email = fields.Email(required=True)
    role = fields.String(load_default="member", validate=validate.OneOf(["member", "admin"]))

    @pre_load
    def normalise(self, data, **kwargs):
        if isinstance(data, dict) and isinstance(data.get("email"), str):
            data = {**data, "email": data["email"].strip().lower()}
        return data


class BoardSchema(Schema):
    id = fields.UUID()
    name = fields.String()
    purpose = fields.String(allow_none=True)
    color_hue = fields.Integer(allow_none=True)
    due_date = fields.Date(allow_none=True)
    created_by = fields.UUID(allow_none=True)
    role = fields.String()            # the requesting user's role, attached by the service
    member_count = fields.Integer()
    card_count = fields.Integer()
    done_count = fields.Integer(allow_none=True)   # live Cards in the last Column; null with < 2 Columns
    created_at = fields.DateTime()
    updated_at = fields.DateTime()


class BoardDetailSchema(BoardSchema):
    columns = fields.Nested(ColumnWithCardsSchema, many=True)
    notes = fields.String(allow_none=True)


class BoardLinkSchema(Schema):
    id = fields.UUID()
    board_id = fields.UUID()
    title = fields.String()
    url = fields.String()
    created_by = fields.Method("get_created_by")
    created_at = fields.DateTime()

    def get_created_by(self, link):
        return user_brief(link.author)


class MemberSchema(Schema):
    user_id = fields.UUID()
    name = fields.String(attribute="user.name")
    email = fields.String(attribute="user.email")
    avatar_url = fields.Method("get_avatar_url")
    role = fields.String()
    created_at = fields.DateTime()

    def get_avatar_url(self, membership):
        return avatar_url(membership.user)
