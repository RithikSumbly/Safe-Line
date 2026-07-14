from __future__ import annotations

import logging

import google.generativeai as genai

from app.config import get_settings

logger = logging.getLogger(__name__)

_ALLOWED_MIME = frozenset({"image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"})


def normalize_image_mime(mime: str | None) -> str:
    raw = (mime or "image/jpeg").split(";")[0].strip().lower()
    if raw == "image/jpg":
        raw = "image/jpeg"
    if raw not in _ALLOWED_MIME:
        return "image/jpeg"
    return raw


async def extract_text_from_screenshot(
    image_bytes: bytes,
    *,
    mime_type: str = "image/jpeg",
) -> str:
    """OCR / vision extract of message text from a chat or SMS screenshot."""
    settings = get_settings()
    if not settings.gemini_api_key:
        return "[Image received] (vision extraction disabled — no GEMINI_API_KEY configured)"

    mime = normalize_image_mime(mime_type)
    try:
        genai.configure(api_key=settings.gemini_api_key)
        model = genai.GenerativeModel(settings.gemini_model)
        prompt = (
            "You are reading a chat, SMS, email, or messaging-app screenshot.\n"
            "Extract ONLY the suspicious message or document text visible "
            "(ignore UI chrome like time, battery, contact name, nav bars).\n"
            "If it's not primarily text, return a one-line description and any readable text.\n"
            "Return plain text only."
        )
        content = [
            prompt,
            {"mime_type": mime, "data": image_bytes},
        ]
        resp = await model.generate_content_async(content)
        return (resp.text or "").strip() or "[Image received] (no readable text found)"
    except Exception as exc:
        logger.warning("Vision extraction failed: %s", exc)
        return "[Image received] (vision extraction failed)"


async def extract_text_from_whatsapp_screenshot(image_bytes: bytes) -> str:
    """Backward-compatible alias used by the WhatsApp pipeline."""
    return await extract_text_from_screenshot(image_bytes, mime_type="image/jpeg")
