from flask import Blueprint

bp = Blueprint("users", __name__, url_prefix="/api/users")

from app.blueprints.users import routes  # noqa: E402,F401
