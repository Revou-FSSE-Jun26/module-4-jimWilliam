"""SQLAlchemy models (database.md DB-01 to DB-09)."""
import uuid

from sqlalchemy import select

from app.common.utils import utcnow
from app.extensions import db


def _id():
    return db.Column(db.Uuid, primary_key=True, default=uuid.uuid4)


def _created():
    return db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow)


def _updated():
    return db.Column(db.DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow)


class User(db.Model):
    __tablename__ = "users"
    id = _id()
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(255), nullable=False, unique=True, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = _created()
    updated_at = _updated()


class Board(db.Model):
    __tablename__ = "boards"
    id = _id()
    name = db.Column(db.String(120), nullable=False)
    created_by = db.Column(db.Uuid, db.ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = _created()
    updated_at = _updated()

    columns = db.relationship(
        "Column", back_populates="board", order_by="Column.order",
        cascade="all, delete-orphan", passive_deletes=True,
    )
    members = db.relationship("BoardMember", back_populates="board", cascade="all, delete-orphan", passive_deletes=True)


class BoardMember(db.Model):
    __tablename__ = "board_members"
    id = _id()
    board_id = db.Column(db.Uuid, db.ForeignKey("boards.id", ondelete="CASCADE"), nullable=False)
    user_id = db.Column(db.Uuid, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    role = db.Column(db.String(10), nullable=False, default="member")
    created_at = _created()
    updated_at = _updated()

    board = db.relationship("Board", back_populates="members")
    user = db.relationship("User")

    __table_args__ = (
        db.UniqueConstraint("board_id", "user_id", name="uq_board_members_board_user"),
        db.CheckConstraint("role IN ('admin', 'member')", name="role_valid"),
    )


class Column(db.Model):
    __tablename__ = "columns"
    id = _id()
    board_id = db.Column(db.Uuid, db.ForeignKey("boards.id", ondelete="CASCADE"), nullable=False)
    name = db.Column(db.String(120), nullable=False)
    order = db.Column(db.Float, nullable=False)
    created_at = _created()
    updated_at = _updated()

    board = db.relationship("Board", back_populates="columns")
    cards = db.relationship(
        "Card", back_populates="column", order_by="Card.order",
        cascade="all, delete-orphan", passive_deletes=True,
    )

    __table_args__ = (db.Index("ix_columns_board_order", "board_id", "order"),)


class Card(db.Model):
    __tablename__ = "cards"
    id = _id()
    column_id = db.Column(db.Uuid, db.ForeignKey("columns.id", ondelete="CASCADE"), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    assignee_id = db.Column(db.Uuid, db.ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    order = db.Column(db.Float, nullable=False)
    created_at = _created()
    updated_at = _updated()
    deleted_at = db.Column(db.DateTime(timezone=True), nullable=True)

    column = db.relationship("Column", back_populates="cards")
    assignee = db.relationship("User")

    __table_args__ = (db.Index("ix_cards_column_order", "column_id", "order"),)


class Comment(db.Model):
    __tablename__ = "comments"
    id = _id()
    card_id = db.Column(db.Uuid, db.ForeignKey("cards.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = db.Column(db.Uuid, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    text = db.Column(db.Text, nullable=False)
    created_at = _created()
    updated_at = _updated()

    author = db.relationship("User")


class Notification(db.Model):
    __tablename__ = "notifications"
    id = _id()
    user_id = db.Column(db.Uuid, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    message = db.Column(db.String(255), nullable=False)
    card_id = db.Column(db.Uuid, db.ForeignKey("cards.id", ondelete="SET NULL"), nullable=True)
    board_id = db.Column(db.Uuid, db.ForeignKey("boards.id", ondelete="SET NULL"), nullable=True)
    read = db.Column(db.Boolean, nullable=False, default=False)
    created_at = _created()
    updated_at = _updated()

    __table_args__ = (db.Index("ix_notifications_user_read", "user_id", "read"),)


def live_cards():
    """Every Card query starts here so soft-deleted Cards never leak (DB-03)."""
    return select(Card).where(Card.deleted_at.is_(None))


__all__ = ["User", "Board", "BoardMember", "Column", "Card", "Comment", "Notification", "live_cards"]
