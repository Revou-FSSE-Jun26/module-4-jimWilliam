"""RevoTask Flask application factory."""
from flask import Flask
from flask_cors import CORS
from sqlalchemy import event
from sqlalchemy.engine import Engine

from app.config import Config
from app.extensions import db, jwt, migrate


@event.listens_for(Engine, "connect")
def _sqlite_foreign_keys(dbapi_connection, connection_record):
    """SQLite (tests, local dev) ignores ON DELETE CASCADE unless foreign keys are switched on."""
    if dbapi_connection.__class__.__module__.startswith("sqlite3"):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


def create_app(config_object=Config) -> Flask:
    app = Flask(__name__)
    app.config.from_object(config_object)
    if not app.config.get("JWT_SECRET_KEY"):
        raise RuntimeError("JWT_SECRET_KEY is not set. Copy .env.example to .env and fill it in.")
    app.url_map.strict_slashes = False

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    CORS(app, origins=app.config["FRONTEND_ORIGINS"], allow_headers=["Authorization", "Content-Type"],
         methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"])

    from app import models  # noqa: F401  (register models for migrations)
    from app.blueprints.analytics import bp as analytics_bp
    from app.blueprints.auth import bp as auth_bp
    from app.blueprints.boards import bp as boards_bp
    from app.blueprints.cards import bp as cards_bp
    from app.blueprints.columns import bp as columns_bp
    from app.blueprints.comments import bp as comments_bp
    from app.blueprints.notifications import bp as notifications_bp
    from app.blueprints.users import bp as users_bp
    from app.common.envelope import ok
    from app.common.errors import register_error_handlers

    for blueprint in (auth_bp, boards_bp, columns_bp, cards_bp, comments_bp, notifications_bp, analytics_bp, users_bp):
        app.register_blueprint(blueprint)
    register_error_handlers(app)

    @app.get("/api/health")
    def health():
        return ok({"status": "ok"})

    return app
