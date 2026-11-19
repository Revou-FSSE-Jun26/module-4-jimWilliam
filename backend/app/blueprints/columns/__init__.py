from flask import Blueprint

bp = Blueprint("columns", __name__, url_prefix="/api")

from app.blueprints.columns import routes  # noqa: E402,F401
