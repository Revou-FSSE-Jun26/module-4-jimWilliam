from flask import request
from flask_jwt_extended import jwt_required

from app.blueprints.columns import bp, service
from app.blueprints.columns.schema import ColumnSchema
from app.common.envelope import ok
from app.common.utils import current_user_id


@bp.post("/boards/<uuid:board_id>/columns")
@jwt_required()
def create_column(board_id):
    column = service.create_column(board_id, current_user_id(), request.get_json(silent=True))
    return ok(ColumnSchema().dump(column), 201)


@bp.patch("/boards/<uuid:board_id>/columns/reorder")
@jwt_required()
def reorder_columns(board_id):
    columns = service.reorder_columns(board_id, current_user_id(), request.get_json(silent=True))
    return ok(ColumnSchema(many=True).dump(columns))


@bp.patch("/columns/<uuid:column_id>")
@jwt_required()
def rename_column(column_id):
    column = service.rename_column(column_id, current_user_id(), request.get_json(silent=True))
    return ok(ColumnSchema().dump(column))


@bp.delete("/columns/<uuid:column_id>")
@jwt_required()
def delete_column(column_id):
    service.delete_column(column_id, current_user_id())
    return ok({"id": str(column_id)})
