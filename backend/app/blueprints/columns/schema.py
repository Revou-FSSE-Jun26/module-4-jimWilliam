from marshmallow import EXCLUDE, Schema, ValidationError, fields, pre_load, validate, validates_schema

from app.blueprints.cards.schema import CardSchema


class ColumnNameSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    name = fields.String(required=True, validate=validate.Length(min=1, max=120))

    @pre_load
    def strip(self, data, **kwargs):
        if isinstance(data, dict) and isinstance(data.get("name"), str):
            data = {**data, "name": data["name"].strip()}
        return data


class ColumnOrderSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    id = fields.UUID(required=True)
    order = fields.Float(required=True, validate=validate.Range(min=0, min_inclusive=False))


class ColumnReorderSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    columns = fields.List(fields.Nested(ColumnOrderSchema), required=True, validate=validate.Length(min=1))

    @validates_schema
    def unique(self, data, **kwargs):
        ids = [c["id"] for c in data.get("columns", [])]
        orders = [c["order"] for c in data.get("columns", [])]
        if len(set(ids)) != len(ids):
            raise ValidationError("Each column may appear only once", "columns")
        if len(set(orders)) != len(orders):
            raise ValidationError("Order values must be distinct", "columns")


class ColumnSchema(Schema):
    id = fields.UUID()
    board_id = fields.UUID()
    name = fields.String()
    order = fields.Float()
    created_at = fields.DateTime()
    updated_at = fields.DateTime()


class ColumnWithCardsSchema(ColumnSchema):
    cards = fields.Nested(CardSchema, many=True, attribute="live_cards")
