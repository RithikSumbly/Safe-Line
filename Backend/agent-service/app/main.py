from __future__ import annotations

import base64
import logging

from fastapi import Depends, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from app.agents.crisis_rumor import run_crisis_agent
from app.agents.job_offer import run_job_agent
from app.agents.scam import run_scam_agent
from app.config import get_settings
from app.chat.agent_tools import new_session_id
from app.chat.orchestrator import handle_chat_message
from app.core.schemas import (
    AgentType,
    AgentCheckResponse,
    AnnotatedVerdict,
    ChatMessageRequest,
    ChatMessageResponse,
    CheckInput,
    FeedbackRequest,
)
from app.db.feedback import submit_verdict_feedback
from app.db.supabase_client import Timer, log_agent_run
from app.router_agent import classify_intent
from app.security.auth import ApiCaller
from app.security.deps import enforce_api_security
from app.whatsapp.meta_webhook import router as whatsapp_router
from app.whatsapp.vision import extract_text_from_screenshot, normalize_image_mime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

AGENTS: dict[AgentType, object] = {
    "scam": run_scam_agent,
    "job_offer": run_job_agent,
    "crisis_rumor": run_crisis_agent,
}

app = FastAPI(title="SafeLine Agent Service", version="1.0.0")
settings = get_settings()
allow_credentials = True
if "*" in settings.cors_origin_list:
    # CORS spec disallows `Access-Control-Allow-Credentials: true` with wildcard origins.
    # This API is tokenless/cookie-less, so credentials are not required.
    allow_credentials = False
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(whatsapp_router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "safeline-agent-service"}


@app.post("/agents/route")
async def route_agent(inp: CheckInput, caller: ApiCaller = Depends(enforce_api_security)):
    result = await classify_intent(inp.text)
    if result.clarifying_question and result.confidence < 0.6:
        raise HTTPException(status_code=422, detail=result.clarifying_question)
    return result


@app.post("/chat/message", response_model=ChatMessageResponse)
async def chat_message(
    req: ChatMessageRequest,
    caller: ApiCaller = Depends(enforce_api_security),
):
    session_id = req.session_id or new_session_id()
    text = (req.text or "").strip()

    from_screenshot = False
    if req.image_base64:
        try:
            raw = base64.b64decode(req.image_base64, validate=False)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid image_base64.")
        if len(raw) > 5_000_000:
            raise HTTPException(status_code=400, detail="Image too large (max 5MB).")
        if len(raw) > 0:
            from_screenshot = True
            mime = normalize_image_mime(req.image_mime_type)
            extracted = await extract_text_from_screenshot(raw, mime_type=mime)
            image_note = extracted.strip()
            if image_note:
                text = (
                    f"{text}\n\n[Screenshot text]: {image_note}".strip()
                    if text
                    else f"[Screenshot text]: {image_note}"
                )

    if not text:
        return ChatMessageResponse(
            type="clarification",
            session_id=session_id,
            assistant_text=(
                "We received your screenshot but couldn't read any text from it. "
                "Try a clearer photo, or paste the message text."
                if from_screenshot
                else "Send me the suspicious message you'd like checked — paste text or a screenshot."
            ),
        )
    response = await handle_chat_message(text, req.history, session_id)
    if response.type == "verdict" and response.verdict:
        timer = Timer()
        run_id = await log_agent_run(
            agent=response.verdict.agent,
            channel="web",
            input_text=text,
            verdict=response.verdict,
            user_id=caller.user_id,
            latency_ms=timer.elapsed_ms,
        )
        response.run_id = run_id
    return response


@app.post("/agents/{agent}", response_model=AgentCheckResponse)
async def run_agent(
    agent: AgentType,
    inp: CheckInput,
    caller: ApiCaller = Depends(enforce_api_security),
):
    if agent not in AGENTS:
        raise HTTPException(status_code=404, detail="Unknown agent")
    timer = Timer()
    runner = AGENTS[agent]
    verdict: AnnotatedVerdict = await runner(inp)  # type: ignore[operator]
    run_id = await log_agent_run(
        agent=agent,
        channel="web",
        input_text=inp.text,
        verdict=verdict,
        user_id=caller.user_id,
        location={"raw": inp.location} if inp.location else None,
        latency_ms=timer.elapsed_ms,
    )
    return AgentCheckResponse(verdict=verdict, run_id=run_id)


@app.post("/feedback")
async def submit_feedback(
    req: FeedbackRequest,
    caller: ApiCaller = Depends(enforce_api_security),
):
    ok = await submit_verdict_feedback(req.run_id, req.helpful)
    if not ok:
        raise HTTPException(status_code=400, detail="Could not save feedback")
    return {"status": "ok"}
