import pytest

from app.chat.orchestrator import HELP_TEXT
from app.core.schemas import AnnotatedVerdict, ChatMessageResponse
from app.whatsapp.pipeline import InboundMessage, handle_inbound
from app.whatsapp.session import get_session, history_from_session, reset_session


class FakeMessenger:
    def __init__(self) -> None:
        self.sent: list[str] = []
        self.typing: list[str] = []

    async def send_text(self, to: str, body: str) -> None:
        self.sent.append(body)

    async def send_typing(self, to: str, message_id: str) -> None:
        self.typing.append(message_id)


@pytest.fixture
def mock_orchestrator(monkeypatch):
    async def fake(text, history, session_id):
        if text.lower() == "hi":
            return ChatMessageResponse(
                type="help",
                session_id=session_id,
                assistant_text=HELP_TEXT,
            )
        if "check the link" in text.lower() and history:
            return ChatMessageResponse(
                type="clarification",
                session_id=session_id,
                assistant_text="I can check that prior message — paste it again if needed.",
            )
        return ChatMessageResponse(
            type="verdict",
            session_id=session_id,
            tool_used="check_scam_message",
            assistant_text="Here's what I found:",
            verdict=AnnotatedVerdict(
                agent="scam",
                status="high_risk",
                confidence=0.9,
                risk_score=80,
                red_flags=["Suspicious link"],
                evidence=[],
                explanation="Test verdict",
                recommended_action="Do not click.",
                needs_human_review=False,
                disclaimer="Test",
                input_text=text,
                flagged_spans=[],
            ),
        )

    monkeypatch.setattr(
        "app.whatsapp.pipeline.handle_chat_message",
        fake,
    )


@pytest.mark.asyncio
async def test_hi_uses_orchestrator_help(mock_orchestrator):
    phone = "911234567890"
    await reset_session(phone)
    msgr = FakeMessenger()

    await handle_inbound(
        InboundMessage(phone=phone, message_id="wamid.1", text="hi"),
        msgr,
    )

    assert len(msgr.sent) == 1
    assert HELP_TEXT.split(".")[0] in msgr.sent[0]
    sess = await get_session(phone)
    history = history_from_session(sess)
    assert len(history) == 2
    assert history[0].role == "user"
    assert history[1].role == "assistant"


@pytest.mark.asyncio
async def test_verdict_formatted_for_whatsapp(mock_orchestrator):
    phone = "919999999999"
    await reset_session(phone)
    msgr = FakeMessenger()

    await handle_inbound(
        InboundMessage(
            phone=phone,
            message_id="wamid.2",
            text="URGENT: click http://fake-bank.example.com now",
        ),
        msgr,
    )

    assert len(msgr.sent) == 1
    assert "SafeLine verdict" in msgr.sent[0]
    assert "HIGH RISK" in msgr.sent[0]


@pytest.mark.asyncio
async def test_reset_clears_history(mock_orchestrator):
    phone = "918888888888"
    await reset_session(phone)
    msgr = FakeMessenger()

    await handle_inbound(
        InboundMessage(phone=phone, message_id="wamid.3", text="hi"),
        msgr,
    )
    await handle_inbound(
        InboundMessage(phone=phone, message_id="wamid.4", text="RESET"),
        msgr,
    )

    sess = await get_session(phone)
    assert history_from_session(sess) == []
