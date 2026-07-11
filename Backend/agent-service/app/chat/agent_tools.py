from __future__ import annotations

import re
import uuid
from typing import Optional

from app.agents.crisis_rumor import run_crisis_agent
from app.agents.job_offer import run_job_agent
from app.agents.scam import run_scam_agent
from app.core.schemas import AnnotatedVerdict, ChatToolName, CheckInput

EMAIL_RE = re.compile(r"[\w.-]+@([\w.-]+\.\w+)")


async def check_scam_message(
    text: str,
    url: Optional[str] = None,
) -> AnnotatedVerdict:
    return await run_scam_agent(CheckInput(text=text, url=url))


async def check_job_offer(
    text: str,
    email: Optional[str] = None,
) -> AnnotatedVerdict:
    return await run_job_agent(CheckInput(text=text, email=email))


async def check_crisis_rumor(
    text: str,
    location: Optional[str] = None,
) -> AnnotatedVerdict:
    return await run_crisis_agent(CheckInput(text=text, location=location))


TOOL_RUNNERS: dict[ChatToolName, object] = {
    "check_scam_message": check_scam_message,
    "check_job_offer": check_job_offer,
    "check_crisis_rumor": check_crisis_rumor,
}


def extract_email(text: str) -> Optional[str]:
    m = EMAIL_RE.search(text)
    return m.group(0) if m else None


async def execute_tool(
    tool_name: ChatToolName,
    text: str,
    *,
    url: Optional[str] = None,
    email: Optional[str] = None,
    location: Optional[str] = None,
) -> AnnotatedVerdict:
    runner = TOOL_RUNNERS[tool_name]
    if tool_name == "check_scam_message":
        return await runner(text, url=url)  # type: ignore[operator]
    if tool_name == "check_job_offer":
        return await runner(text, email=email or extract_email(text))  # type: ignore[operator]
    return await runner(text, location=location)  # type: ignore[operator]


def new_session_id() -> str:
    return str(uuid.uuid4())
