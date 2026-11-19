"""Application configuration, read from environment variables (BE-09)."""
import os
from datetime import timedelta

from dotenv import load_dotenv

load_dotenv()


def _database_url(raw: str | None) -> str:
    """Railway provides postgres:// URLs; SQLAlchemy with psycopg 3 needs postgresql+psycopg://."""
    if not raw:
        return "sqlite:///revotask.sqlite3"
    for prefix in ("postgres://", "postgresql://"):
        if raw.startswith(prefix):
            return "postgresql+psycopg://" + raw[len(prefix):]
    return raw


class Config:
    SQLALCHEMY_DATABASE_URI = _database_url(os.environ.get("DATABASE_URL"))
    SQLALCHEMY_ENGINE_OPTIONS = {"pool_pre_ping": True}
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=float(os.environ.get("JWT_ACCESS_TOKEN_EXPIRES_HOURS", "24")))
    FRONTEND_ORIGINS = [o.strip() for o in os.environ.get("FRONTEND_ORIGIN", "http://localhost:3000").split(",") if o.strip()]
    JSON_SORT_KEYS = False


class TestConfig(Config):
    TESTING = True
    # In-memory SQLite by default; set TEST_DATABASE_URL to run the suite against PostgreSQL.
    SQLALCHEMY_DATABASE_URI = _database_url(os.environ.get("TEST_DATABASE_URL")) if os.environ.get("TEST_DATABASE_URL") else "sqlite://"
    SQLALCHEMY_ENGINE_OPTIONS = {}
    JWT_SECRET_KEY = "test-secret-key-that-is-long-enough-for-hs256"
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)
    FRONTEND_ORIGINS = ["http://localhost:3000"]
