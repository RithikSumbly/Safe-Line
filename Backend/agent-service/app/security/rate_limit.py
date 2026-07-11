from __future__ import annotations

import logging
import time
from collections import defaultdict
from threading import Lock

import httpx
from fastapi import HTTPException, Request

from app.config import get_settings
from app.security.auth import ApiCaller

logger = logging.getLogger(__name__)


class InMemoryRateLimiter:
    def __init__(self, limit: int, window_seconds: int) -> None:
        self.limit = limit
        self.window_seconds = window_seconds
        self._hits: dict[str, list[float]] = defaultdict(list)
        self._lock = Lock()

    def allow(self, key: str) -> bool:
        now = time.time()
        with self._lock:
            hits = [t for t in self._hits[key] if now - t < self.window_seconds]
            if len(hits) >= self.limit:
                self._hits[key] = hits
                return False
            hits.append(now)
            self._hits[key] = hits
            return True


class UpstashRateLimiter:
    def __init__(self, url: str, token: str, limit: int, window_seconds: int) -> None:
        self.url = url.rstrip("/")
        self.token = token
        self.limit = limit
        self.window_seconds = window_seconds

    async def allow(self, key: str) -> bool:
        window_id = int(time.time()) // self.window_seconds
        redis_key = f"safeline:rl:{key}:{window_id}"
        endpoint = f"{self.url}/incr/{redis_key}"
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.post(
                    endpoint,
                    headers={"Authorization": f"Bearer {self.token}"},
                )
                if res.status_code >= 400:
                    logger.warning("Upstash rate limit error %s", res.status_code)
                    return True
                count = int(res.json().get("result", 0))
                if count == 1:
                    await client.post(
                        f"{self.url}/expire/{redis_key}/{self.window_seconds}",
                        headers={"Authorization": f"Bearer {self.token}"},
                    )
                return count <= self.limit
        except Exception as exc:
            logger.warning("Upstash rate limit unavailable: %s", exc)
            return True


_guest_memory: InMemoryRateLimiter | None = None
_auth_memory: InMemoryRateLimiter | None = None


def _memory_bucket(authenticated: bool, limit: int) -> InMemoryRateLimiter:
    global _guest_memory, _auth_memory
    if authenticated:
        if _auth_memory is None or _auth_memory.limit != limit:
            _auth_memory = InMemoryRateLimiter(limit=limit, window_seconds=3600)
        return _auth_memory
    if _guest_memory is None or _guest_memory.limit != limit:
        _guest_memory = InMemoryRateLimiter(limit=limit, window_seconds=3600)
    return _guest_memory


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return "unknown"


async def enforce_rate_limit(request: Request, caller: ApiCaller) -> None:
    settings = get_settings()
    if not settings.api_rate_limit_enabled:
        return

    if caller.authenticated and caller.user_id:
        key = f"user:{caller.user_id}"
        limit = settings.api_rate_limit_auth_per_hour
    else:
        key = f"ip:{_client_ip(request)}"
        limit = settings.api_rate_limit_guest_per_hour

    if settings.upstash_redis_url and settings.upstash_redis_token:
        limiter = UpstashRateLimiter(
            settings.upstash_redis_url,
            settings.upstash_redis_token,
            limit,
            3600,
        )
        allowed = await limiter.allow(key)
    else:
        bucket = _memory_bucket(caller.authenticated, limit)
        allowed = bucket.allow(key)

    if not allowed:
        raise HTTPException(
            status_code=429,
            detail="Too many requests. Wait a bit or sign in for a higher limit.",
        )
