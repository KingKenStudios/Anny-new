"""Bounded validation for reference images sent to the local Modly API."""

MAX_IMAGE_UPLOAD_BYTES = 25 * 1024 * 1024

_PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"
_JPEG_SIGNATURE = b"\xff\xd8\xff"


def validate_uploaded_image(
    content_type: str | None,
    image_bytes: bytes,
    max_bytes: int = MAX_IMAGE_UPLOAD_BYTES,
) -> str:
    """Validate an image's declared MIME, size, and file signature.

    Returns the normalized MIME type. The caller must still treat decoded image
    content as untrusted and let the selected generator perform its own parsing.
    """
    if max_bytes <= 0:
        raise ValueError("Image size limit must be positive.")

    mime_type = (content_type or "").split(";", 1)[0].strip().lower()
    if mime_type not in {"image/png", "image/jpeg", "image/webp"}:
        raise ValueError("Image must be PNG, JPEG, or WebP.")

    if not isinstance(image_bytes, bytes) or not image_bytes:
        raise ValueError("Image file is empty or invalid.")

    if len(image_bytes) > max_bytes:
        raise ValueError(f"Image must be {max_bytes} bytes or smaller.")

    if mime_type == "image/png" and not image_bytes.startswith(_PNG_SIGNATURE):
        raise ValueError("Image content does not match the declared PNG type.")
    if mime_type == "image/jpeg" and not image_bytes.startswith(_JPEG_SIGNATURE):
        raise ValueError("Image content does not match the declared JPEG type.")
    if mime_type == "image/webp" and not (
        len(image_bytes) >= 12
        and image_bytes[:4] == b"RIFF"
        and image_bytes[8:12] == b"WEBP"
    ):
        raise ValueError("Image content does not match the declared WebP type.")

    return mime_type
