from marshmallow import Schema, fields


class ColumnCountSchema(Schema):
    column_id = fields.UUID()
    name = fields.String()
    count = fields.Integer()


class MemberActivitySchema(Schema):
    user_id = fields.UUID()
    name = fields.String()
    comments = fields.Integer()
    cards_assigned = fields.Integer()


class AnalyticsSchema(Schema):
    cards_per_column = fields.Nested(ColumnCountSchema, many=True)
    completed_this_week = fields.Integer()
    activity_per_member = fields.Nested(MemberActivitySchema, many=True)
    week_start = fields.DateTime()
