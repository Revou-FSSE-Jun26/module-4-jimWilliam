from sqlalchemy import func, or_, select
from sqlalchemy.orm import selectinload

from app.blueprints.cards.schema import CardCreateSchema, CardPositionSchema, CardQuerySchema, CardUpdateSchema
from app.common.access import get_column_or_404, get_live_card_or_404, is_member, notify, require_member
from app.common.errors import AppError
from app.common.richtext import MAX_TEXT_LENGTH, clean_description
from app.common.utils import escape_like, utcnow
from app.extensions import db
from app.models import Board, BoardMember, Card, Column, Comment

ORDER_STEP = 1024.0


def _check_assignee(board_id, assignee_id) -> None:
    if assignee_id is not None and not is_member(board_id, assignee_id):
        raise AppError("The assignee must be a member of this board", 400)


def _apply_description(data: dict) -> dict:
    """Sanitise the HTML and keep a plain-text copy (R40). Called with validated data."""
    if "description" in data:
        safe, text = clean_description(data["description"])
        if text and len(text) > MAX_TEXT_LENGTH:
            raise AppError(f"description: Longer than maximum length {MAX_TEXT_LENGTH}.", 400)
        data = {**data, "description": safe, "description_text": text}
    return data


def create_card(column_id, user_id, payload) -> Card:
    column = get_column_or_404(column_id)
    require_member(column.board_id, user_id)
    data = _apply_description(CardCreateSchema().load(payload or {}))
    _check_assignee(column.board_id, data.get("assignee_id"))
    last = db.session.execute(
        select(func.max(Card.order)).where(Card.column_id == column_id, Card.deleted_at.is_(None))
    ).scalar()
    card = Card(column_id=column_id, order=(last or 0) + ORDER_STEP, **data)
    db.session.add(card)
    db.session.flush()
    if card.assignee_id:
        notify(card.assignee_id, f"You were assigned {card.title}", actor_id=user_id,
               card_id=card.id, board_id=column.board_id)
    db.session.commit()
    card.comment_count = 0
    return card


def update_card(card_id, user_id, payload) -> Card:
    card = get_live_card_or_404(card_id)
    board_id = card.column.board_id
    require_member(board_id, user_id)
    data = _apply_description(CardUpdateSchema().load(payload or {}))
    previous_assignee = card.assignee_id
    if "assignee_id" in data:
        _check_assignee(board_id, data["assignee_id"])
    for key, value in data.items():
        setattr(card, key, value)
    if card.assignee_id and card.assignee_id != previous_assignee:
        notify(card.assignee_id, f"You were assigned {card.title}", actor_id=user_id,
               card_id=card.id, board_id=board_id)
    db.session.commit()
    return card


def delete_card(card_id, user_id) -> None:
    card = get_live_card_or_404(card_id)
    require_member(card.column.board_id, user_id)
    card.deleted_at = utcnow()   # soft delete (DB-03)
    db.session.commit()


def move_card(card_id, user_id, payload) -> Card:
    card = get_live_card_or_404(card_id)
    require_member(card.column.board_id, user_id)
    data = CardPositionSchema().load(payload or {})
    column = get_column_or_404(data["column_id"])
    if column.board_id != card.column.board_id:
        raise AppError("Cards can only move between columns of the same board", 400)
    card.column_id, card.order = column.id, data["order"]   # one row updated (DB-04)
    db.session.commit()
    return card


def query_cards(user_id, args) -> list[Card]:
    data = CardQuerySchema().load(args)
    stmt = (
        select(Card, Board.id, Board.name)
        .join(Column, Card.column_id == Column.id)
        .join(Board, Column.board_id == Board.id)
        .join(BoardMember, (BoardMember.board_id == Board.id) & (BoardMember.user_id == user_id))
        .where(Card.deleted_at.is_(None))
        .options(selectinload(Card.assignee))
        .order_by(Board.name, Column.order, Card.order)
    )
    if data.get("assignee") == "me":
        stmt = stmt.where(Card.assignee_id == user_id)
    if "search" in data:
        pattern = f"%{escape_like(data['search'].strip())}%"
        stmt = stmt.where(or_(Card.title.ilike(pattern, escape="\\"), Card.description_text.ilike(pattern, escape="\\")))
    rows = db.session.execute(stmt.limit(200)).all()
    cards = []
    for card, board_id, board_name in rows:
        card.board_meta = (board_id, board_name)
        cards.append(card)
    if cards:
        counts = dict(db.session.execute(
            select(Comment.card_id, func.count(Comment.id))
            .where(Comment.card_id.in_([c.id for c in cards])).group_by(Comment.card_id)
        ).all())
        for card in cards:
            card.comment_count = counts.get(card.id, 0)
    return cards
