import asyncio

import pytest

from app.whatsapp.pipeline import InboundMessage, handle_inbound
from app.whatsapp.session import get_session, reset_session


class FakeMessenger:
    def __init__(self) -> None:
        self.sent: list[str] = []
        self.typing: list[str] = []

    async def send_text(self, to: str, body: str) -> None:
        self.sent.append(body)

    async def send_typing(self, to: str, message_id: str) -> None:
        self.typing.append(message_id)


@pytest.mark.asyncio
async def test_ambiguous_triggers_disambiguation_and_numeric_reply_runs():
    phone = "911234567890"
    await reset_session(phone)
    msgr = FakeMessenger()

    # ambiguous short content -> should prompt for choice
    await handle_inbound(
        InboundMessage(phone=phone, message_id="wamid.1", text="Please check this"),
        msgr,
    )
    sess = await get_session(phone)
    assert sess["state"] in ("awaiting_agent_choice", "buffering")

    # force pending choice state for the follow-up path
    await asyncio.sleep(0)  # allow any scheduled tasks to settle
    await handle_inbound(
        InboundMessage(phone=phone, message_id="wamid.2", text="2"),
        msgr,
    )
    # After resolving, session should reset to idle
    sess2 = await get_session(phone)
    assert sess2["state"] == "idle"


@pytest.mark.asyncio
async def test_buffer_flush_on_done():
    phone = "919999999999"
    await reset_session(phone)
    msgr = FakeMessenger()

    await handle_inbound(
        InboundMessage(phone=phone, message_id="wamid.a", text="Part 1: bank alert"),
        msgr,
    )
    await handle_inbound(
        InboundMessage(phone=phone, message_id="wamid.b", text="Part 2: click here"),
        msgr,
    )
    await handle_inbound(
        InboundMessage(phone=phone, message_id="wamid.c", text="DONE"),
        msgr,
    )
    # Should send something back (either disambiguation prompt or verdict/help)
    assert len(msgr.sent) >= 1
