"""Board analytics computed with SQLAlchemy joins and GROUP BY in SQL (R8.2, DB-08)."""
from datetime import timedelta

from sqlalchemy import and_, func, select

from app.common.access import require_member
from app.common.utils import utcnow
from app.extensions import db
from app.models import BoardMember, Card, Column, Comment, User


def _week_start():
    now = utcnow()
    return (now - timedelta(days=now.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)


def board_analytics(board_id, user_id) -> dict:
    require_member(board_id, user_id, admin=True)
    week_start = _week_start()

    per_column = db.session.execute(
        select(Column.id, Column.name, func.count(Card.id))
        .outerjoin(Card, and_(Card.column_id == Column.id, Card.deleted_at.is_(None)))
        .where(Column.board_id == board_id)
        .group_by(Column.id, Column.name, Column.order)
        .order_by(Column.order)
    ).all()

    # "Completed" = a live Card in the board's last Column (highest order) updated this ISO week.
    last_column = (select(Column.id).where(Column.board_id == board_id)
                   .order_by(Column.order.desc()).limit(1).scalar_subquery())
    completed = db.session.execute(
        select(func.count(Card.id)).where(
            Card.column_id == last_column, Card.deleted_at.is_(None), Card.updated_at >= week_start)
    ).scalar_one()

    comments_sq = (
        select(Comment.user_id.label("user_id"), func.count(Comment.id).label("n"))
        .join(Card, Comment.card_id == Card.id).join(Column, Card.column_id == Column.id)
        .where(Column.board_id == board_id, Card.deleted_at.is_(None))
        .group_by(Comment.user_id).subquery()
    )
    assigned_sq = (
        select(Card.assignee_id.label("user_id"), func.count(Card.id).label("n"))
        .join(Column, Card.column_id == Column.id)
        .where(Column.board_id == board_id, Card.deleted_at.is_(None), Card.assignee_id.is_not(None))
        .group_by(Card.assignee_id).subquery()
    )
    activity = db.session.execute(
        select(User.id, User.name, func.coalesce(comments_sq.c.n, 0), func.coalesce(assigned_sq.c.n, 0))
        .join(BoardMember, BoardMember.user_id == User.id)
        .outerjoin(comments_sq, comments_sq.c.user_id == User.id)
        .outerjoin(assigned_sq, assigned_sq.c.user_id == User.id)
        .where(BoardMember.board_id == board_id)
        .order_by(User.name)
    ).all()

    return {
        "cards_per_column": [{"column_id": cid, "name": name, "count": n} for cid, name, n in per_column],
        "completed_this_week": completed,
        "activity_per_member": [
            {"user_id": uid, "name": name, "comments": c, "cards_assigned": a} for uid, name, c, a in activity
        ],
        "week_start": week_start,
    }
