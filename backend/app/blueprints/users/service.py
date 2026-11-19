from app.blueprints.auth.service import email_taken
from app.blueprints.users.schema import ProfileUpdateSchema
from app.common.errors import AppError
from app.extensions import db
from app.models import User


def get_me(user_id) -> User:
    user = db.session.get(User, user_id)
    if user is None:
        raise AppError("Account not found", 401)
    return user


def update_me(user_id, payload) -> User:
    user = get_me(user_id)
    data = ProfileUpdateSchema().load(payload or {})
    if not data:
        raise AppError("Send a name or an email to update", 400)
    if "email" in data and email_taken(data["email"], exclude_id=user.id):
        raise AppError("An account with this email already exists", 409)
    if "name" in data:
        user.name = data["name"].strip()
    if "email" in data:
        user.email = data["email"]
    db.session.commit()
    return user
