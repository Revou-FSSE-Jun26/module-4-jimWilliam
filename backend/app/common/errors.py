"""AppError and the global error handlers (BE-04, BE-05, BE-08)."""
from flask import Flask
from marshmallow import ValidationError
from werkzeug.exceptions import HTTPException

from app.common.envelope import fail
from app.extensions import jwt


class AppError(Exception):
    def __init__(self, message: str, status: int):
        super().__init__(message)
        self.message = message
        self.status = status


def _flatten(messages, prefix: str = "") -> list[str]:
    """Turn Marshmallow's nested error dict into readable 'field: message' strings."""
    if isinstance(messages, dict):
        out: list[str] = []
        for key, value in messages.items():
            name = "body" if key == "_schema" else f"{prefix}{key}"
            out.extend(_flatten(value, f"{name}."))
        return out
    if isinstance(messages, list):
        out = []
        for item in messages:
            if isinstance(item, str):
                out.append(f"{prefix.rstrip('.')}: {item}" if prefix else item)
            else:
                out.extend(_flatten(item, prefix))
        return out
    return [f"{prefix.rstrip('.')}: {messages}"]


def register_error_handlers(app: Flask) -> None:
    @app.errorhandler(AppError)
    def handle_app_error(err: AppError):
        return fail(err.message, err.status)

    @app.errorhandler(ValidationError)
    def handle_validation_error(err: ValidationError):
        return fail("; ".join(_flatten(err.messages)) or "Invalid request", 400)

    @app.errorhandler(HTTPException)
    def handle_http_exception(err: HTTPException):
        # Unknown URLs, bad UUIDs in the path (404) and wrong methods (405) keep the envelope.
        if err.code == 413:
            return fail("The file is too large. Images can be up to 4 MB.", 413)
        return fail(err.description if err.code != 404 else "Not found", err.code or 500)

    @app.errorhandler(Exception)
    def handle_unexpected(err: Exception):
        app.logger.exception("Unhandled error")
        return fail("Internal server error", 500)


@jwt.unauthorized_loader
def _missing_token(reason: str):
    return fail("Authentication required", 401)


@jwt.invalid_token_loader
def _invalid_token(reason: str):
    return fail("Invalid token", 401)


@jwt.expired_token_loader
def _expired_token(jwt_header, jwt_payload):
    return fail("Session expired, please log in again", 401)
