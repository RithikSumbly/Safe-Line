from __future__ import annotations

from unittest.mock import patch

from fastapi.testclient import TestClient

from app.main import app
from app.whatsapp.meta_webhook import _is_duplicate_message


def test_whatsapp_webhook_skips_browser_csrf():
    client = TestClient(app)
    with patch("app.whatsapp.meta_webhook._verify_signature", return_value=True):
        res = client.post(
            "/whatsapp/webhook",
            json={"entry": []},
            headers={"Content-Type": "application/json"},
        )
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}


def test_whatsapp_dedupes_message_ids():
    assert _is_duplicate_message("wamid.TEST123") is False
    assert _is_duplicate_message("wamid.TEST123") is True
