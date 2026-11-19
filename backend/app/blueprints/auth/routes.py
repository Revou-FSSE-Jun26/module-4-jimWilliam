from flask import request

from app.blueprints.auth import bp, service
from app.blueprints.auth.schema import UserSchema
from app.common.envelope import ok


@bp.post("/register")
def register():
    user = service.register(request.get_json(silent=True))
    return ok(UserSchema().dump(user), 201)


@bp.post("/login")
def login():
    token, expires_at, user = service.login(request.get_json(silent=True))
    return ok({"token": token, "expires_at": expires_at, "user": UserSchema().dump(user)})
