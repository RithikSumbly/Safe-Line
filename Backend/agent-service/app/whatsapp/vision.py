from __future__ import annotations

import logging

import google.generativeai as genai

from app.config import get_settings

logger = logging.getLogger(__name__)


async def extract_text_from_whatsapp_screenshot(image_bytes: bytes) -> str:
    """
    Vision-first extraction. If no API key is configured, returns a safe placeholder.
    This is intentionally simple for capstone scale; swap providers later if needed.
    """
    settings = get_settings()
    if not settings.gemini_api_key:
        return "[Image received] (vision extraction disabled — no GEMINI_API_KEY configured)"

    try:
        genai.configure(api_key=settings.gemini_api_key)
        model = genai.GenerativeModel(settings.gemini_model)
        prompt = (
            "You are reading a WhatsApp screenshot.\n"
            "Extract ONLY the message or document text visible (ignore UI chrome like time, battery, contact name).\n"
            "If it's not primarily text, return a one-line description and any readable text.\n"
            "Return plain text only."
        )
        # generativeai accepts blobs as dicts
        content = [
            prompt,
            {"mime_type": "image/jpeg", "data": image_bytes},
        ]
        resp = await model.generate_content_async(content)
        return (resp.text or "").strip() or "[Image received] (no readable text found)"
    except Exception as exc:
        logger.warning("Vision extraction failed: %s", exc)
        return "[Image received] (vision extraction failed)"
