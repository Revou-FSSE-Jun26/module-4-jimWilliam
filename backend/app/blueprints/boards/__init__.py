from flask import Blueprint

bp = Blueprint("boards", __name__, url_prefix="/api/boards")

from app.blueprints.boards import routes  # noqa: E402,F401
