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
    # Points at media.id. Deliberately not a foreign key: media.owner_id already references users, and
    # a second key the other way would make a users <-> media cycle. The avatar service keeps it in step.
    avatar_id = db.Column(db.Uuid, nullable=True)
    created_at = _created()
    updated_at = _updated()


class Board(db.Model):
    __tablename__ = "boards"
    id = _id()
    name = db.Column(db.String(120), nullable=False)
    purpose = db.Column(db.String(280), nullable=True)         # the board's goal, shown to every member (R47)
    color_hue = db.Column(db.Integer, nullable=True)           # 0-359; null = derived from the id (R48)
    notes = db.Column(db.Text, nullable=True)                  # sanitised HTML, e.g. meeting notes (R47)
    notes_text = db.Column(db.Text, nullable=True)
    created_by = db.Column(db.Uuid, db.ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = _created()
    updated_at = _updated()

    columns = db.relationship(
        "Column", back_populates="board", order_by="Column.order",
        cascade="all, delete-orphan", passive_deletes=True,
    )
    members = db.relationship("BoardMember", back_populates="board", cascade="all, delete-orphan", passive_deletes=True)

    __table_args__ = (db.CheckConstraint("color_hue IS NULL OR (color_hue >= 0 AND color_hue <= 359)", name="color_hue_range"),)


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
    description = db.Column(db.Text, nullable=True)            # sanitised HTML (R40)
    description_text = db.Column(db.Text, nullable=True)       # plain text for search and previews
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


class Media(db.Model):
    """An uploaded image, always stored as AVIF (R41-R43). Avatars have no card; attachments do."""
    __tablename__ = "media"
    id = _id()
    kind = db.Column(db.String(12), nullable=False)
    owner_id = db.Column(db.Uuid, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    card_id = db.Column(db.Uuid, db.ForeignKey("cards.id", ondelete="CASCADE"), nullable=True, index=True)
    board_id = db.Column(db.Uuid, db.ForeignKey("boards.id", ondelete="CASCADE"), nullable=True, index=True)
    filename = db.Column(db.String(255), nullable=False)
    content_type = db.Column(db.String(50), nullable=False, default="image/avif")
    width = db.Column(db.Integer, nullable=False)
    height = db.Column(db.Integer, nullable=False)
    byte_size = db.Column(db.Integer, nullable=False)
    # Image bytes are deferred: listing attachments never loads them.
    data = db.orm.deferred(db.Column(db.LargeBinary, nullable=False))
    thumb = db.orm.deferred(db.Column(db.LargeBinary, nullable=True))
    created_at = _created()
    updated_at = _updated()

    owner = db.relationship("User", foreign_keys=[owner_id])

    __table_args__ = (db.CheckConstraint("kind IN ('avatar', 'attachment', 'board')", name="kind_valid"),)


class BoardLink(db.Model):
    """A link pinned to a board: a meeting recording, a document, a design file (R47)."""
    __tablename__ = "board_links"
    id = _id()
    board_id = db.Column(db.Uuid, db.ForeignKey("boards.id", ondelete="CASCADE"), nullable=False, index=True)
    created_by = db.Column(db.Uuid, db.ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    title = db.Column(db.String(120), nullable=False)
    url = db.Column(db.String(2048), nullable=False)
    created_at = _created()
    updated_at = _updated()

    author = db.relationship("User")


def live_cards():
    """Every Card query starts here so soft-deleted Cards never leak (DB-03)."""
    return select(Card).where(Card.deleted_at.is_(None))


__all__ = ["User", "Board", "BoardMember", "Column", "Card", "Comment", "Notification", "Media", "BoardLink", "live_cards"]
