from __future__ import annotations

from fastapi import Depends, Request

from app.config import get_settings
from app.security.auth import ApiCaller, resolve_api_caller
from app.security.csrf import enforce_browser_csrf
from app.security.rate_limit import enforce_rate_limit


async def enforce_api_security(request: Request) -> ApiCaller:
    settings = get_settings()
    enforce_browser_csrf(request)
    caller = await resolve_api_caller(request, require_auth=settings.api_require_auth)
    await enforce_rate_limit(request, caller)
    return caller


def api_security_dep() -> Depends:
    return Depends(enforce_api_security)
