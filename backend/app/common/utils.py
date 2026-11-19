import uuid
from datetime import datetime, timezone

from flask_jwt_extended import get_jwt_identity


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def current_user_id() -> uuid.UUID:
    """The JWT identity is the user's UUID as a string."""
    return uuid.UUID(get_jwt_identity())


def escape_like(term: str) -> str:
    """Escape LIKE wildcards so a search for '50%' matches the literal text (DB-07)."""
    return term.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
