from marshmallow import EXCLUDE, Schema, fields, pre_load, validate

from app.blueprints.columns.schema import ColumnWithCardsSchema
from app.common.media_urls import avatar_url


class BoardNameSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    name = fields.String(required=True, validate=validate.Length(min=1, max=120))

    @pre_load
    def strip(self, data, **kwargs):
        if isinstance(data, dict) and isinstance(data.get("name"), str):
            data = {**data, "name": data["name"].strip()}
        return data


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
    created_by = fields.UUID(allow_none=True)
    role = fields.String()            # the requesting user's role, attached by the service
    member_count = fields.Integer()
    card_count = fields.Integer()
    created_at = fields.DateTime()
    updated_at = fields.DateTime()


class BoardDetailSchema(BoardSchema):
    columns = fields.Nested(ColumnWithCardsSchema, many=True)


class MemberSchema(Schema):
    user_id = fields.UUID()
    name = fields.String(attribute="user.name")
    email = fields.String(attribute="user.email")
    avatar_url = fields.Method("get_avatar_url")
    role = fields.String()
    created_at = fields.DateTime()

    def get_avatar_url(self, membership):
        return avatar_url(membership.user)
