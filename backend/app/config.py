"""Application configuration, read from environment variables (BE-09)."""
import os
from datetime import timedelta

from dotenv import load_dotenv
from sqlalchemy.pool import NullPool

load_dotenv()


def _database_url(raw: str | None) -> str:
    """Supabase and other hosts give postgres:// or postgresql:// URLs; SQLAlchemy with psycopg 3 needs postgresql+psycopg://."""
    if not raw:
        return "sqlite:///revotask.sqlite3"
    for prefix in ("postgres://", "postgresql://"):
        if raw.startswith(prefix):
            return "postgresql+psycopg://" + raw[len(prefix):]
    return raw


def engine_options(url: str) -> dict:
    """Engine settings for the connection in use (R27.6).

    On Render the API is a long-running Gunicorn server, so it keeps a small connection pool and
    reaches Supabase through the session pooler (port 5432, IPv4). Each Gunicorn worker has its own
    pool: with the defaults (2 workers, 3 + 2 connections each) the API holds at most 10 connections,
    well inside the session pooler's limit on the free plan. Connections are checked before use and
    recycled every 5 minutes, because poolers and the network close idle ones.

    The transaction pooler (port 6543) is still supported for serverless hosts: it hands each
    transaction to any server connection, so prepared statements must be off (psycopg:
    prepare_threshold=None) and SQLAlchemy must not keep its own pool (NullPool).
    """
    if url.startswith("postgresql+psycopg://") and ":6543/" in url:
        return {"poolclass": NullPool, "connect_args": {"prepare_threshold": None}}
    if url.startswith("postgresql+psycopg://"):
        return {
            "pool_pre_ping": True,
            "pool_size": int(os.environ.get("DB_POOL_SIZE", "3")),
            "max_overflow": int(os.environ.get("DB_MAX_OVERFLOW", "2")),
            "pool_recycle": 300,
            "pool_timeout": 10,
        }
    return {"pool_pre_ping": True}


class Config:
    SQLALCHEMY_DATABASE_URI = _database_url(os.environ.get("DATABASE_URL"))
    SQLALCHEMY_ENGINE_OPTIONS = engine_options(SQLALCHEMY_DATABASE_URI)
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=float(os.environ.get("JWT_ACCESS_TOKEN_EXPIRES_HOURS", "24")))
    FRONTEND_ORIGINS = [o.strip() for o in os.environ.get("FRONTEND_ORIGIN", "http://localhost:3000").split(",") if o.strip()]
    JSON_SORT_KEYS = False
    # Image uploads: 4 MB keeps the database small (images are stored in PostgreSQL) and matches the
    # frontend's check in lib/upload.ts.
    MAX_CONTENT_LENGTH = 4 * 1024 * 1024
    # None = werkzeug's default (scrypt). Tests use a cheap method so property tests can register many users.
    PASSWORD_HASH_METHOD = None


class TestConfig(Config):
    TESTING = True
    # In-memory SQLite by default; set TEST_DATABASE_URL to run the suite against PostgreSQL.
    SQLALCHEMY_DATABASE_URI = _database_url(os.environ.get("TEST_DATABASE_URL")) if os.environ.get("TEST_DATABASE_URL") else "sqlite://"
    SQLALCHEMY_ENGINE_OPTIONS = {}
    JWT_SECRET_KEY = "test-secret-key-that-is-long-enough-for-hs256"
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)
    FRONTEND_ORIGINS = ["http://localhost:3000"]
    PASSWORD_HASH_METHOD = "pbkdf2:sha256:1000"
