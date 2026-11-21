from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.blueprints.boards.schema import BoardNameSchema, MemberAddSchema
from app.common.access import get_board_or_404, require_member, notify
from app.common.errors import AppError
from app.extensions import db
from app.models import Board, BoardMember, Card, Column, Comment, Media, User


def create_board(user_id, payload) -> Board:
    data = BoardNameSchema().load(payload or {})
    board = Board(name=data["name"], created_by=user_id)
    db.session.add(board)
    db.session.flush()
    db.session.add(BoardMember(board_id=board.id, user_id=user_id, role="admin"))
    db.session.commit()
    board.role, board.member_count, board.card_count, board.done_count = "admin", 1, 0, None
    return board


def list_boards(user_id) -> list[Board]:
    member_count = (select(func.count(BoardMember.id)).where(BoardMember.board_id == Board.id)
                    .correlate(Board).scalar_subquery())
    card_count = (select(func.count(Card.id)).join(Column, Card.column_id == Column.id)
                  .where(Column.board_id == Board.id, Card.deleted_at.is_(None))
                  .correlate(Board).scalar_subquery())
    # Progress (R46): "done" is the last Column (highest order), the same rule Analytics uses.
    # With fewer than two Columns there is no "done" stage, so done_count is null.
    column_count = (select(func.count(Column.id)).where(Column.board_id == Board.id)
                    .correlate(Board).scalar_subquery())
    last_column = (select(Column.id).where(Column.board_id == Board.id)
                   .order_by(Column.order.desc()).limit(1).correlate(Board).scalar_subquery())
    done_count = (select(func.count(Card.id)).where(Card.column_id == last_column, Card.deleted_at.is_(None))
                  .correlate(Board).scalar_subquery())
    rows = db.session.execute(
        select(Board, BoardMember.role, member_count, card_count, column_count, done_count)
        .join(BoardMember, BoardMember.board_id == Board.id)
        .where(BoardMember.user_id == user_id)
        .order_by(Board.updated_at.desc())
    ).all()
    boards = []
    for board, role, members, cards, columns, done in rows:
        board.role, board.member_count, board.card_count = role, members, cards
        board.done_count = done if columns >= 2 else None
        boards.append(board)
    return boards


def get_board_detail(board_id, user_id) -> Board:
    membership = require_member(board_id, user_id)
    board = db.session.execute(
        select(Board).where(Board.id == board_id).options(selectinload(Board.columns))
    ).scalar_one()
    column_ids = [c.id for c in board.columns]
    cards = db.session.execute(
        select(Card).where(Card.column_id.in_(column_ids), Card.deleted_at.is_(None))
        .options(selectinload(Card.assignee)).order_by(Card.order)
    ).scalars().all() if column_ids else []
    counts = dict(db.session.execute(
        select(Comment.card_id, func.count(Comment.id))
        .where(Comment.card_id.in_([c.id for c in cards])).group_by(Comment.card_id)
    ).all()) if cards else {}
    attachments = dict(db.session.execute(
        select(Media.card_id, func.count(Media.id))
        .where(Media.card_id.in_([c.id for c in cards])).group_by(Media.card_id)
    ).all()) if cards else {}
    by_column = {cid: [] for cid in column_ids}
    for card in cards:
        card.comment_count = counts.get(card.id, 0)
        card.attachment_count = attachments.get(card.id, 0)
        by_column[card.column_id].append(card)
    for column in board.columns:
        column.live_cards = by_column[column.id]
    board.role = membership.role
    board.member_count = len(board.members)
    board.card_count = len(cards)
    return board


def rename_board(board_id, user_id, payload) -> Board:
    membership = require_member(board_id, user_id, admin=True)
    data = BoardNameSchema().load(payload or {})
    board = get_board_or_404(board_id)
    board.name = data["name"]
    db.session.commit()
    board.role = membership.role
    return board


def delete_board(board_id, user_id) -> None:
    require_member(board_id, user_id, admin=True)
    db.session.delete(get_board_or_404(board_id))
    db.session.commit()


def list_members(board_id, user_id) -> list[BoardMember]:
    require_member(board_id, user_id)
    return db.session.execute(
        select(BoardMember).where(BoardMember.board_id == board_id)
        .options(selectinload(BoardMember.user)).order_by(BoardMember.created_at)
    ).scalars().all()


def add_member(board_id, user_id, payload) -> BoardMember:
    require_member(board_id, user_id, admin=True)
    data = MemberAddSchema().load(payload or {})
    user = db.session.execute(select(User).where(User.email == data["email"])).scalar_one_or_none()
    if user is None:
        raise AppError("No RevoTask account uses that email", 404)
    exists = db.session.execute(select(BoardMember.id).filter_by(board_id=board_id, user_id=user.id)).first()
    if exists:
        raise AppError("That person is already a member of this board", 409)
    membership = BoardMember(board_id=board_id, user_id=user.id, role=data["role"])
    db.session.add(membership)
    board = get_board_or_404(board_id)
    notify(user.id, f"You were added to {board.name}", actor_id=user_id, board_id=board_id)
    db.session.commit()
    return membership


def remove_member(board_id, user_id, member_user_id) -> None:
    require_member(board_id, user_id, admin=True)
    membership = db.session.execute(
        select(BoardMember).filter_by(board_id=board_id, user_id=member_user_id)
    ).scalar_one_or_none()
    if membership is None:
        raise AppError("Member not found", 404)
    if membership.role == "admin":
        admins = db.session.execute(
            select(func.count(BoardMember.id)).filter_by(board_id=board_id, role="admin")
        ).scalar_one()
        if admins <= 1:
            raise AppError("A board needs at least one admin", 409)
    db.session.delete(membership)
    db.session.commit()
