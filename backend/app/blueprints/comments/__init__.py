from flask import Blueprint

bp = Blueprint("comments", __name__, url_prefix="/api")

from app.blueprints.comments import routes  # noqa: E402,F401
