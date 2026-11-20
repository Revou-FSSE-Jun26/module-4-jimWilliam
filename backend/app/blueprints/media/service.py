"""Avatars and card attachments (R41-R43). Images are converted to AVIF before anything is stored."""
from sqlalchemy import delete, func, select
from sqlalchemy.orm import selectinload
from werkzeug.datastructures import FileStorage

from app.common.access import get_live_card_or_404, require_member
from app.common.errors import AppError
from app.common.images import attachment_avif, avatar_avif, avif_filename
from app.common.media_urls import verify
from app.extensions import db
from app.models import Media, User

MAX_ATTACHMENTS_PER_CARD = 10


def _read_upload(file: FileStorage | None) -> bytes:
    """Read the upload into memory. The original is never saved anywhere and is dropped with the request."""
    if file is None or not file.filename:
        raise AppError("Choose an image to upload (form field: file)", 400)
    raw = file.read()
    file.close()
    return raw


def _get_user(user_id) -> User:
    user = db.session.get(User, user_id)
    if user is None:
        raise AppError("Account not found", 401)
    return user


def _delete_avatar_row(media_id) -> None:
    db.session.execute(delete(Media).where(Media.id == media_id, Media.kind == "avatar"))


# ----- avatars ---------------------------------------------------------------------------------

def set_avatar(user_id, file: FileStorage | None) -> User:
    user = _get_user(user_id)
    encoded = avatar_avif(_read_upload(file))
    old_id = user.avatar_id
    media = Media(kind="avatar", owner_id=user.id, filename=avif_filename(file.filename),
                  width=encoded.width, height=encoded.height, byte_size=len(encoded.data), data=encoded.data)
    db.session.add(media)
    db.session.flush()
    user.avatar_id = media.id
    if old_id is not None:
        _delete_avatar_row(old_id)   # only one avatar per user is ever kept
    db.session.commit()
    return user


def remove_avatar(user_id) -> User:
    user = _get_user(user_id)
    if user.avatar_id is not None:
        _delete_avatar_row(user.avatar_id)
        user.avatar_id = None
        db.session.commit()
    return user


# ----- attachments -----------------------------------------------------------------------------

def list_attachments(card_id, user_id) -> list[Media]:
    card = get_live_card_or_404(card_id)
    require_member(card.column.board_id, user_id)
    return db.session.execute(
        select(Media).where(Media.card_id == card.id, Media.kind == "attachment")
        .options(selectinload(Media.owner)).order_by(Media.created_at)
    ).scalars().all()


def add_attachment(card_id, user_id, file: FileStorage | None) -> Media:
    card = get_live_card_or_404(card_id)
    require_member(card.column.board_id, user_id)
    count = db.session.execute(
        select(func.count(Media.id)).where(Media.card_id == card.id, Media.kind == "attachment")
    ).scalar()
    if count >= MAX_ATTACHMENTS_PER_CARD:
        raise AppError(f"A card can have at most {MAX_ATTACHMENTS_PER_CARD} images", 400)
    full, thumb = attachment_avif(_read_upload(file))
    media = Media(kind="attachment", owner_id=user_id, card_id=card.id, filename=avif_filename(file.filename),
                  width=full.width, height=full.height, byte_size=len(full.data), data=full.data, thumb=thumb.data)
    db.session.add(media)
    db.session.commit()
    return media


def delete_attachment(attachment_id, user_id) -> None:
    media = _get_media_or_404(attachment_id)
    card = get_live_card_or_404(media.card_id)
    membership = require_member(card.column.board_id, user_id)
    if media.owner_id != user_id and membership.role != "admin":
        raise AppError("Only the uploader or a board admin can remove this image", 403)
    db.session.delete(media)
    db.session.commit()


def _get_media_or_404(media_id) -> Media:
    media = db.session.get(Media, media_id)
    if media is None or media.kind != "attachment":
        raise AppError("Attachment not found", 404)
    return media


# ----- serving ---------------------------------------------------------------------------------

def read_image(media_id, variant: str, exp: str | None, sig: str | None) -> tuple[bytes, int]:
    """Bytes for a signed URL. A bad or expired signature is 403; a deleted image is 404."""
    expiry = verify(media_id, variant, exp, sig)
    if not expiry:
        raise AppError("This image link is invalid or has expired", 403)
    wanted = func.coalesce(Media.thumb, Media.data) if variant == "thumb" else Media.data
    row = db.session.execute(select(wanted).where(Media.id == media_id)).first()
    if row is None:
        raise AppError("Image not found", 404)
    return bytes(row[0]), expiry
