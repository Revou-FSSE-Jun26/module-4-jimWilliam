from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.blueprints.comments.schema import CommentTextSchema
from app.common.access import get_live_card_or_404, notify, require_member
from app.common.errors import AppError
from app.extensions import db
from app.models import Comment


def _get_comment_or_404(comment_id) -> Comment:
    comment = db.session.get(Comment, comment_id)
    if comment is None:
        raise AppError("Comment not found", 404)
    return comment


def _require_owner(comment: Comment, user_id) -> None:
    card = get_live_card_or_404(comment.card_id)
    require_member(card.column.board_id, user_id)
    if comment.user_id != user_id:
        raise AppError("You can only change your own comments", 403)


def create_comment(card_id, user_id, payload) -> Comment:
    card = get_live_card_or_404(card_id)
    board_id = card.column.board_id
    require_member(board_id, user_id)
    data = CommentTextSchema().load(payload or {})
    comment = Comment(card_id=card.id, user_id=user_id, text=data["text"])
    db.session.add(comment)
    notify(card.assignee_id, f"New comment on {card.title}", actor_id=user_id, card_id=card.id, board_id=board_id)
    db.session.commit()
    return comment


def list_comments(card_id, user_id) -> list[Comment]:
    card = get_live_card_or_404(card_id)
    require_member(card.column.board_id, user_id)
    return db.session.execute(
        select(Comment).where(Comment.card_id == card.id)
        .options(selectinload(Comment.author)).order_by(Comment.created_at)
    ).scalars().all()


def update_comment(comment_id, user_id, payload) -> Comment:
    comment = _get_comment_or_404(comment_id)
    _require_owner(comment, user_id)
    comment.text = CommentTextSchema().load(payload or {})["text"]
    db.session.commit()
    return comment


def delete_comment(comment_id, user_id) -> None:
    comment = _get_comment_or_404(comment_id)
    _require_owner(comment, user_id)
    db.session.delete(comment)
    db.session.commit()
