"""Board access checks (BE-06). Not-found is always checked before permission (BE-05)."""
import uuid

from sqlalchemy import select

from app.common.errors import AppError
from app.extensions import db
from app.models import Board, BoardMember, Card, Column, Notification


def get_board_or_404(board_id: uuid.UUID) -> Board:
    board = db.session.get(Board, board_id)
    if board is None:
        raise AppError("Board not found", 404)
    return board


def require_member(board_id: uuid.UUID, user_id: uuid.UUID, admin: bool = False) -> BoardMember:
    get_board_or_404(board_id)
    membership = db.session.execute(
        select(BoardMember).filter_by(board_id=board_id, user_id=user_id)
    ).scalar_one_or_none()
    if membership is None:
        raise AppError("You do not have access to this board", 403)
    if admin and membership.role != "admin":
        raise AppError("Only board admins can do this", 403)
    return membership


def get_column_or_404(column_id: uuid.UUID) -> Column:
    column = db.session.get(Column, column_id)
    if column is None:
        raise AppError("Column not found", 404)
    return column


def get_live_card_or_404(card_id: uuid.UUID) -> Card:
    card = db.session.get(Card, card_id)
    if card is None or card.deleted_at is not None:
        raise AppError("Card not found", 404)
    return card


def is_member(board_id: uuid.UUID, user_id: uuid.UUID) -> bool:
    return db.session.execute(
        select(BoardMember.id).filter_by(board_id=board_id, user_id=user_id)
    ).first() is not None


def notify(user_id: uuid.UUID, message: str, *, actor_id: uuid.UUID | None = None,
           card_id: uuid.UUID | None = None, board_id: uuid.UUID | None = None) -> None:
    """Queue a Notification in the current transaction; never notify users about their own action (BE-07)."""
    if user_id is None or user_id == actor_id:
        return
    db.session.add(Notification(user_id=user_id, message=message[:255], card_id=card_id, board_id=board_id))
