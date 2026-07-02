from __future__ import annotations

import logging

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from app.agents.crisis_rumor import run_crisis_agent
from app.agents.job_offer import run_job_agent
from app.agents.rental_redflag import run_rental_agent
from app.agents.scam import run_scam_agent
from app.config import get_settings
from app.core.schemas import AgentType, AnnotatedVerdict, CheckInput
from app.db.supabase_client import Timer, log_agent_run
from app.router_agent import classify_intent
from app.whatsapp.meta_webhook import router as whatsapp_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

AGENTS: dict[AgentType, object] = {
    "scam": run_scam_agent,
    "job_offer": run_job_agent,
    "crisis_rumor": run_crisis_agent,
    "rental_redflag": run_rental_agent,
}

app = FastAPI(title="SafeLine Agent Service", version="1.0.0")
settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(whatsapp_router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "safeline-agent-service"}


@app.post("/agents/route")
async def route_agent(inp: CheckInput):
    result = await classify_intent(inp.text)
    if result.clarifying_question and result.confidence < 0.6:
        raise HTTPException(status_code=422, detail=result.clarifying_question)
    return result


@app.post("/agents/{agent}", response_model=AnnotatedVerdict)
async def run_agent(agent: AgentType, inp: CheckInput):
    if agent not in AGENTS:
        raise HTTPException(status_code=404, detail="Unknown agent")
    timer = Timer()
    runner = AGENTS[agent]
    verdict: AnnotatedVerdict
    if agent == "rental_redflag":
        verdict = await run_rental_agent(inp)  # type: ignore[call-arg]
    else:
        verdict = await runner(inp)  # type: ignore[operator]
    await log_agent_run(
        agent=agent,
        channel="web",
        input_text=inp.text,
        verdict=verdict,
        location={"raw": inp.location} if inp.location else None,
        latency_ms=timer.elapsed_ms,
    )
    return verdict


@app.post("/agents/rental_redflag/upload", response_model=AnnotatedVerdict)
async def run_rental_upload(
    text: str = Form(""),
    jurisdiction: str = Form("Kerala"),
    file: UploadFile | None = File(None),
):
    pdf_bytes = None
    file_name = None
    if file and file.filename:
        pdf_bytes = await file.read()
        file_name = file.filename
    inp = CheckInput(
        text=text,
        jurisdiction=jurisdiction,
        fileName=file_name,
    )
    timer = Timer()
    verdict = await run_rental_agent(inp, pdf_bytes=pdf_bytes)
    await log_agent_run(
        agent="rental_redflag",
        channel="web",
        input_text=inp.text or (file_name or "PDF upload"),
        verdict=verdict,
        latency_ms=timer.elapsed_ms,
    )
    return verdict
