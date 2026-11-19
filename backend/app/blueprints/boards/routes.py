from flask import request
from flask_jwt_extended import jwt_required

from app.blueprints.boards import bp, service
from app.blueprints.boards.schema import BoardDetailSchema, BoardSchema, MemberSchema
from app.common.envelope import ok
from app.common.utils import current_user_id


@bp.post("")
@jwt_required()
def create_board():
    board = service.create_board(current_user_id(), request.get_json(silent=True))
    return ok(BoardSchema().dump(board), 201)


@bp.get("")
@jwt_required()
def list_boards():
    return ok(BoardSchema(many=True).dump(service.list_boards(current_user_id())))


@bp.get("/<uuid:board_id>")
@jwt_required()
def get_board(board_id):
    return ok(BoardDetailSchema().dump(service.get_board_detail(board_id, current_user_id())))


@bp.patch("/<uuid:board_id>")
@jwt_required()
def rename_board(board_id):
    board = service.rename_board(board_id, current_user_id(), request.get_json(silent=True))
    return ok(BoardSchema(exclude=("member_count", "card_count")).dump(board))


@bp.delete("/<uuid:board_id>")
@jwt_required()
def delete_board(board_id):
    service.delete_board(board_id, current_user_id())
    return ok({"id": str(board_id)})


@bp.get("/<uuid:board_id>/members")
@jwt_required()
def list_members(board_id):
    return ok(MemberSchema(many=True).dump(service.list_members(board_id, current_user_id())))


@bp.post("/<uuid:board_id>/members")
@jwt_required()
def add_member(board_id):
    membership = service.add_member(board_id, current_user_id(), request.get_json(silent=True))
    return ok(MemberSchema().dump(membership), 201)


@bp.delete("/<uuid:board_id>/members/<uuid:user_id>")
@jwt_required()
def remove_member(board_id, user_id):
    service.remove_member(board_id, current_user_id(), user_id)
    return ok({"user_id": str(user_id)})
