from marshmallow import EXCLUDE, Schema, fields, pre_load, validate


class CommentTextSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    text = fields.String(required=True, validate=validate.Length(min=1, max=5000))

    @pre_load
    def strip(self, data, **kwargs):
        if isinstance(data, dict) and isinstance(data.get("text"), str):
            data = {**data, "text": data["text"].strip()}
        return data


class CommentSchema(Schema):
    id = fields.UUID()
    card_id = fields.UUID()
    user_id = fields.UUID()
    author = fields.Method("get_author")
    text = fields.String()
    created_at = fields.DateTime()
    updated_at = fields.DateTime()

    def get_author(self, comment):
        return {"id": str(comment.author.id), "name": comment.author.name}
