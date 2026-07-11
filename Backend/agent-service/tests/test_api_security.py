from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from starlette.requests import Request

from app.main import app
from app.security.auth import ApiCaller
from app.security.csrf import enforce_browser_csrf
from app.security.rate_limit import InMemoryRateLimiter


@pytest.fixture
def client():
    return TestClient(app)


def _headers(origin: str = "http://localhost:5173") -> dict[str, str]:
    return {
        "Origin": origin,
        "X-SafeLine-Client": "web",
        "Content-Type": "application/json",
    }


def test_health_is_public(client):
    res = client.get("/health")
    assert res.status_code == 200


@patch("app.main.handle_chat_message", new_callable=AsyncMock)
def test_chat_rejects_missing_client_header(mock_chat, client):
    mock_chat.return_value = {
        "type": "clarification",
        "session_id": "s1",
        "assistant_text": "Paste a message.",
    }
    res = client.post(
        "/chat/message",
        json={"text": "hello", "history": []},
        headers={"Origin": "http://localhost:5173", "Content-Type": "application/json"},
    )
    assert res.status_code == 403


@patch("app.main.handle_chat_message", new_callable=AsyncMock)
def test_chat_accepts_browser_headers(mock_chat, client):
    from app.core.schemas import ChatMessageResponse

    mock_chat.return_value = ChatMessageResponse(
        type="clarification",
        session_id="s1",
        assistant_text="Paste a message.",
    )
    res = client.post(
        "/chat/message",
        json={"text": "hello", "history": []},
        headers=_headers(),
    )
    assert res.status_code == 200


def test_csrf_blocks_bad_origin():
    scope = {
        "type": "http",
        "headers": [(b"origin", b"https://evil.example")],
        "method": "POST",
    }
    request = Request(scope)
    with patch("app.security.csrf.get_settings") as mock_settings:
        mock_settings.return_value.api_csrf_enabled = True
        mock_settings.return_value.cors_origin_list = ["http://localhost:5173"]
        with pytest.raises(HTTPException) as exc:
            enforce_browser_csrf(request)
        assert exc.value.status_code == 403


def test_in_memory_rate_limiter_blocks_after_limit():
    limiter = InMemoryRateLimiter(limit=2, window_seconds=3600)
    assert limiter.allow("ip:1") is True
    assert limiter.allow("ip:1") is True
    assert limiter.allow("ip:1") is False
