from __future__ import annotations

from fastapi import HTTPException, Request

from app.config import get_settings

SAFE_CLIENT_HEADER = "x-safeline-client"
SAFE_CLIENT_VALUE = "web"


def enforce_browser_csrf(request: Request) -> None:
    """Block cross-site browser POSTs: Origin must match allowlist + client header."""
    settings = get_settings()
    if not settings.api_csrf_enabled:
        return

    origin = request.headers.get("origin")
    if not origin:
        # Non-browser clients (curl, WhatsApp relay) omit Origin.
        return

    allowed = settings.cors_origin_list
    if not settings.is_allowed_browser_origin(origin):
        raise HTTPException(status_code=403, detail="Origin not allowed.")

    if request.headers.get(SAFE_CLIENT_HEADER) != SAFE_CLIENT_VALUE:
        raise HTTPException(status_code=403, detail="Missing client verification header.")
