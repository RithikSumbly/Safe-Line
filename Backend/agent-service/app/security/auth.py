from __future__ import annotations

import logging
from dataclasses import dataclass

from fastapi import HTTPException, Request

from app.db.supabase_client import get_supabase

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class ApiCaller:
    user_id: str | None
    authenticated: bool


def _extract_bearer_token(request: Request) -> str | None:
    auth = request.headers.get("Authorization", "")
    if not auth.lower().startswith("bearer "):
        return None
    token = auth[7:].strip()
    return token or None


def verify_supabase_access_token(token: str) -> str | None:
    client = get_supabase()
    if not client:
        return None
    try:
        response = client.auth.get_user(token)
        user = getattr(response, "user", None)
        if user and getattr(user, "id", None):
            return str(user.id)
    except Exception as exc:
        logger.debug("Supabase JWT verification failed: %s", exc)
    return None


async def resolve_api_caller(request: Request, *, require_auth: bool) -> ApiCaller:
    token = _extract_bearer_token(request)
    if not token:
        if require_auth:
            raise HTTPException(status_code=401, detail="Sign in required.")
        return ApiCaller(user_id=None, authenticated=False)

    user_id = verify_supabase_access_token(token)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid or expired session.")
    return ApiCaller(user_id=user_id, authenticated=True)
