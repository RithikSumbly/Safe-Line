import pytest

from app.whatsapp.classifier import parse_command, classify_message


@pytest.mark.asyncio
async def test_greeting_classifies_as_chitchat():
    res = await classify_message("hi")
    assert res.mode == "chitchat"


def test_parse_command_keywords():
    assert parse_command("SCAM") is not None
    assert parse_command("job please") is not None
    assert parse_command("menu") is not None
    assert parse_command("done") is not None
    assert parse_command("random text") is None


@pytest.mark.asyncio
async def test_keyword_scams_classify_without_llm():
    res = await classify_message("Your KYC is pending. click here to update")
    assert res.mode == "content_check"
    assert res.agent_guess in ("scam", None)
