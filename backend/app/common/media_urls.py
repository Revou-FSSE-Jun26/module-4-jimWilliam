"""Short-lived signed image URLs (R43).

An <img> tag cannot send the Authorization header, and the frontend and API live on different
domains, so images are served from URLs that carry their own HMAC signature and expiry. Anyone who
copies a URL can only use it until it expires (one to two hours). The expiry is rounded up to the hour
so a URL stays the same within an hour and the browser cache can reuse it.
"""
import hashlib
import hmac
import time
import uuid

from flask import current_app

WINDOW_SECONDS = 3600
VARIANTS = ("full", "thumb")


def _key() -> bytes:
    secret = current_app.config["JWT_SECRET_KEY"].encode()
    return hashlib.sha256(b"revotask-media-v1:" + secret).digest()   # never the JWT key itself


def _signature(media_id: uuid.UUID, variant: str, exp: int) -> str:
    message = f"{media_id}:{variant}:{exp}".encode()
    return hmac.new(_key(), message, hashlib.sha256).hexdigest()[:32]


def signed_url(media_id: uuid.UUID | None, variant: str = "full", now: float | None = None) -> str | None:
    """A path such as /api/media/<id>?v=thumb&exp=...&sig=...; the frontend prefixes the API base URL."""
    if media_id is None:
        return None
    current = int(now if now is not None else time.time())
    exp = (current // WINDOW_SECONDS + 2) * WINDOW_SECONDS
    return f"/api/media/{media_id}?v={variant}&exp={exp}&sig={_signature(media_id, variant, exp)}"


def avatar_url(user) -> str | None:
    return signed_url(getattr(user, "avatar_id", None))


def user_brief(user) -> dict | None:
    """The small user shape embedded in cards, comments and members."""
    if user is None:
        return None
    return {"id": str(user.id), "name": user.name, "avatar_url": avatar_url(user)}


def verify(media_id: uuid.UUID, variant: str, exp: str | None, sig: str | None, now: float | None = None) -> int:
    """Return the expiry if the signature is valid and current, otherwise 0."""
    if variant not in VARIANTS or not exp or not sig or not exp.isdigit():
        return 0
    expiry = int(exp)
    if expiry <= (now if now is not None else time.time()):
        return 0
    return expiry if hmac.compare_digest(_signature(media_id, variant, expiry), sig) else 0
