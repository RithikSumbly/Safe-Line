from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field

AgentType = Literal["scam", "job_offer", "crisis_rumor"]
VerdictStatus = Literal[
    "high_risk",
    "medium_risk",
    "low_risk",
    "likely_safe",
    "confirmed",
    "likely_false",
    "unverified",
    "outdated",
]
SpanSeverity = Literal["risk", "verified", "pending"]
RouterIntent = Literal[
    "scam", "job_offer", "crisis_rumor", "general_help"
]


class EvidenceItem(BaseModel):
    source_name: str
    source_url: Optional[str] = None
    supports_claim: bool
    snippet: str


class AgentVerdict(BaseModel):
    agent: AgentType
    status: VerdictStatus
    confidence: float = Field(ge=0.0, le=1.0)
    risk_score: int = Field(ge=0, le=100)
    red_flags: list[str]
    evidence: list[EvidenceItem]
    explanation: str
    recommended_action: str
    needs_human_review: bool
    disclaimer: str


class FlaggedSpan(BaseModel):
    start: int
    end: int
    tag: int
    severity: SpanSeverity


class AnnotatedVerdict(AgentVerdict):
    input_text: str
    flagged_spans: list[FlaggedSpan]


class CheckInput(BaseModel):
    text: str
    url: Optional[str] = None
    email: Optional[str] = None
    location: Optional[str] = None
    jurisdiction: Optional[str] = None
    fileName: Optional[str] = None


class RouterResult(BaseModel):
    intent: RouterIntent
    confidence: float
    clarifying_question: Optional[str] = None


class SpanAnnotationResult(BaseModel):
    flagged_spans: list[FlaggedSpan]


ChatRole = Literal["user", "assistant", "system"]
ChatMessageType = Literal["text", "verdict", "clarification", "help", "error"]
ChatToolName = Literal[
    "check_scam_message",
    "check_job_offer",
    "check_crisis_rumor",
    "answer_safety_question",
]


class ChatHistoryItem(BaseModel):
    role: ChatRole
    content: str


class ChatMessageRequest(BaseModel):
    session_id: Optional[str] = None
    text: str
    history: list[ChatHistoryItem] = Field(default_factory=list)


class ChatMessageResponse(BaseModel):
    type: ChatMessageType
    session_id: str
    tool_used: Optional[ChatToolName] = None
    assistant_text: str
    verdict: Optional[AnnotatedVerdict] = None
