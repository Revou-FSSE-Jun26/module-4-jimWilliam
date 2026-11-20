"""Image uploads become AVIF in memory (R41, R42).

The uploaded file is read into memory, decoded with Pillow, re-encoded as AVIF and then dropped: the
original bytes are never written to disk or to the database. Re-encoding also strips metadata such as
EXIF GPS positions, and it means the stored file is always a real image of a known type.
"""
import warnings
from dataclasses import dataclass
from io import BytesIO

from PIL import Image, ImageOps, UnidentifiedImageError

from app.common.errors import AppError

ACCEPTED_FORMATS = ("JPEG", "PNG", "WEBP", "GIF", "AVIF", "BMP", "TIFF")
MAX_PIXELS = 40_000_000          # about 8000 x 5000; larger images are refused before decoding
AVATAR_SIZE = 512
ATTACHMENT_MAX_SIDE = 2048
THUMB_MAX_SIDE = 480
AVIF_SPEED = 8                   # 0 = slowest/best, 10 = fastest; 8 keeps serverless requests short

UNSUPPORTED = "The file is not a supported image. Use JPEG, PNG, WebP, GIF, AVIF, BMP or TIFF."


@dataclass(frozen=True)
class Encoded:
    data: bytes
    width: int
    height: int


def _open(raw: bytes) -> Image.Image:
    if not raw:
        raise AppError("Choose an image to upload", 400)
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            image = Image.open(BytesIO(raw), formats=ACCEPTED_FORMATS)
            if image.width * image.height > MAX_PIXELS:
                raise AppError("The image is too large. Use one under 40 megapixels.", 400)
            image.load()   # first frame only for animated GIF, WebP and AVIF
    except AppError:
        raise
    except (UnidentifiedImageError, Image.DecompressionBombError, Image.DecompressionBombWarning,
            OSError, SyntaxError, ValueError):
        raise AppError(UNSUPPORTED, 400) from None
    return ImageOps.exif_transpose(image)


def _avif(image: Image.Image, quality: int) -> Encoded:
    has_alpha = image.mode in ("RGBA", "LA", "PA") or (image.mode == "P" and "transparency" in image.info)
    icc = image.info.get("icc_profile")
    clean = image.convert("RGBA" if has_alpha else "RGB")
    clean.info = {}                # drop EXIF, XMP and comments
    out = BytesIO()
    options = {"format": "AVIF", "quality": quality, "speed": AVIF_SPEED}
    if icc:
        options["icc_profile"] = icc   # keep colours right for wide-gamut photos
    clean.save(out, **options)
    return Encoded(out.getvalue(), clean.width, clean.height)


def avatar_avif(raw: bytes) -> Encoded:
    """Centre-crop to a square of at most 512 px and encode as AVIF."""
    image = _open(raw)
    side = min(AVATAR_SIZE, image.width, image.height)
    return _avif(ImageOps.fit(image, (side, side), Image.Resampling.LANCZOS), quality=70)


def attachment_avif(raw: bytes) -> tuple[Encoded, Encoded]:
    """A full image (longest side at most 2048 px) and a thumbnail (at most 480 px), both AVIF."""
    image = _open(raw)
    full = image.copy()
    full.thumbnail((ATTACHMENT_MAX_SIDE, ATTACHMENT_MAX_SIDE), Image.Resampling.LANCZOS)
    thumb = image.copy()
    thumb.thumbnail((THUMB_MAX_SIDE, THUMB_MAX_SIDE), Image.Resampling.LANCZOS)
    return _avif(full, quality=65), _avif(thumb, quality=55)


def avif_filename(original: str | None) -> str:
    """'Holiday photo.JPG' -> 'Holiday photo.avif' (display only; never used as a path)."""
    stem = (original or "image").replace("\\", "/").rsplit("/", 1)[-1].rsplit(".", 1)[0].strip()
    stem = "".join(ch for ch in stem if ch.isprintable())[:120] or "image"
    return f"{stem}.avif"
