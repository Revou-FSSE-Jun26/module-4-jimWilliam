from flask import Blueprint

bp = Blueprint("analytics", __name__, url_prefix="/api")

from app.blueprints.analytics import routes  # noqa: E402,F401
