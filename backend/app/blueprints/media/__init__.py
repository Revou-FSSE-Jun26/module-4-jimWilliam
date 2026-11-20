from flask import Blueprint

bp = Blueprint("media", __name__, url_prefix="/api")

from app.blueprints.media import routes  # noqa: E402,F401
