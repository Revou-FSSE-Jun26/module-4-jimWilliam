from flask import current_app
from flask_jwt_extended import create_access_token
from sqlalchemy import select
from werkzeug.security import check_password_hash, generate_password_hash

from app.blueprints.auth.schema import LoginSchema, RegisterSchema
from app.common.errors import AppError
from app.common.utils import utcnow
from app.extensions import db
from app.models import User


def email_taken(email: str, exclude_id=None) -> bool:
    stmt = select(User.id).where(User.email == email)
    if exclude_id is not None:
        stmt = stmt.where(User.id != exclude_id)
    return db.session.execute(stmt).first() is not None


def register(payload) -> User:
    data = RegisterSchema().load(payload or {})
    if email_taken(data["email"]):
        raise AppError("An account with this email already exists", 409)
    method = current_app.config.get("PASSWORD_HASH_METHOD")
    password_hash = generate_password_hash(data["password"], method=method) if method else generate_password_hash(data["password"])
    user = User(name=data["name"].strip(), email=data["email"], password_hash=password_hash)
    db.session.add(user)
    db.session.commit()
    return user


def login(payload) -> tuple[str, str, User]:
    data = LoginSchema().load(payload or {})
    user = db.session.execute(select(User).where(User.email == data["email"])).scalar_one_or_none()
    if user is None or not check_password_hash(user.password_hash, data["password"]):
        raise AppError("Invalid email or password", 401)
    expires = current_app.config["JWT_ACCESS_TOKEN_EXPIRES"]
    token = create_access_token(identity=str(user.id), expires_delta=expires)
    expires_at = (utcnow() + expires).isoformat().replace("+00:00", "Z")
    return token, expires_at, user
