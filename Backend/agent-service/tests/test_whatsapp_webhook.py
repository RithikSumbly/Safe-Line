from __future__ import annotations

from unittest.mock import patch

import pytest
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


def test_combine_caption_and_ocr():
    from app.whatsapp.pipeline import _combine_caption_and_ocr

    assert _combine_caption_and_ocr("", "WIN $500") == "[Screenshot text]: WIN $500"
    assert _combine_caption_and_ocr("is this real?", "WIN $500") == (
        "is this real?\n\n[Screenshot text]: WIN $500"
    )


def test_whatsapp_menu_builder_shapes():
    from app.whatsapp.interactive import (
        MENU_CHECK_SCAM,
        build_after_verdict_buttons,
        build_main_menu_interactive,
    )

    menu = build_main_menu_interactive()
    assert menu["type"] == "list"
    rows = menu["action"]["sections"][0]["rows"]
    assert any(r["id"] == MENU_CHECK_SCAM for r in rows)
    assert all(len(r["title"]) <= 24 for sec in menu["action"]["sections"] for r in sec["rows"])

    buttons = build_after_verdict_buttons()
    assert buttons["type"] == "button"
    assert len(buttons["action"]["buttons"]) <= 3


@pytest.mark.asyncio
async def test_menu_selection_prompts_without_orchestrator():
    from app.whatsapp.interactive import MENU_CHECK_SCAM
    from app.whatsapp.pipeline import InboundMessage, handle_inbound

    class FakeMessenger:
        def __init__(self):
            self.texts: list[str] = []
            self.interactives: list[dict] = []

        async def send_text(self, to: str, body: str) -> None:
            self.texts.append(body)

        async def send_typing(self, to: str, message_id: str) -> None:
            return None

        async def send_interactive(self, to: str, interactive: dict) -> None:
            self.interactives.append(interactive)

    messenger = FakeMessenger()
    with patch("app.whatsapp.pipeline.append_chat_turn", return_value=None):
        ok = await handle_inbound(
            InboundMessage(phone="15551234567", message_id="wamid.1", text=MENU_CHECK_SCAM),
            messenger,
        )
    assert ok is True
    assert messenger.texts
    assert "scam" in messenger.texts[0].lower() or "SMS" in messenger.texts[0]
    assert messenger.interactives == []
