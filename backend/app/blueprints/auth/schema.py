from marshmallow import EXCLUDE, Schema, fields, pre_load, validate

from app.common.media_urls import avatar_url


class _Base(Schema):
    class Meta:
        unknown = EXCLUDE

    @pre_load
    def normalise_email(self, data, **kwargs):
        if isinstance(data, dict) and isinstance(data.get("email"), str):
            data = {**data, "email": data["email"].strip().lower()}
        return data


class RegisterSchema(_Base):
    name = fields.String(required=True, validate=validate.Length(min=1, max=120))
    email = fields.Email(required=True, validate=validate.Length(max=255))
    password = fields.String(required=True, load_only=True, validate=validate.Length(min=8, max=128))


class LoginSchema(_Base):
    email = fields.Email(required=True)
    password = fields.String(required=True, load_only=True)


class UserSchema(Schema):
    """Public user shape: never includes the password hash (BE-10)."""
    id = fields.UUID()
    name = fields.String()
    email = fields.String()
    avatar_url = fields.Method("get_avatar_url")
    created_at = fields.DateTime()

    def get_avatar_url(self, user):
        return avatar_url(user)
