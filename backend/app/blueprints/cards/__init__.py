from flask import Blueprint

bp = Blueprint("cards", __name__, url_prefix="/api")

from app.blueprints.cards import routes  # noqa: E402,F401
