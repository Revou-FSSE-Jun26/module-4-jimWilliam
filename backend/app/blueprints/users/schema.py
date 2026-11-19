from marshmallow import EXCLUDE, Schema, fields, pre_load, validate

from app.blueprints.auth.schema import UserSchema  # noqa: F401  (re-exported: one public user shape)


class ProfileUpdateSchema(Schema):
    """Only name and email; a password key is dropped by EXCLUDE (R9.3)."""

    class Meta:
        unknown = EXCLUDE

    name = fields.String(validate=validate.Length(min=1, max=120))
    email = fields.Email(validate=validate.Length(max=255))

    @pre_load
    def normalise(self, data, **kwargs):
        if isinstance(data, dict) and isinstance(data.get("email"), str):
            data = {**data, "email": data["email"].strip().lower()}
        return data
