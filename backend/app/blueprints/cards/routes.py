from flask import request
from flask_jwt_extended import jwt_required

from app.blueprints.cards import bp, service
from app.blueprints.cards.schema import CardSchema
from app.common.envelope import ok
from app.common.utils import current_user_id


@bp.post("/columns/<uuid:column_id>/cards")
@jwt_required()
def create_card(column_id):
    card = service.create_card(column_id, current_user_id(), request.get_json(silent=True))
    return ok(CardSchema().dump(card), 201)


@bp.get("/cards")
@jwt_required()
def query_cards():
    cards = service.query_cards(current_user_id(), request.args.to_dict())
    return ok(CardSchema(many=True).dump(cards))


@bp.patch("/cards/<uuid:card_id>")
@jwt_required()
def update_card(card_id):
    card = service.update_card(card_id, current_user_id(), request.get_json(silent=True))
    return ok(CardSchema().dump(card))


@bp.delete("/cards/<uuid:card_id>")
@jwt_required()
def delete_card(card_id):
    service.delete_card(card_id, current_user_id())
    return ok({"id": str(card_id)})


@bp.patch("/cards/<uuid:card_id>/position")
@jwt_required()
def move_card(card_id):
    card = service.move_card(card_id, current_user_id(), request.get_json(silent=True))
    return ok(CardSchema().dump(card))
