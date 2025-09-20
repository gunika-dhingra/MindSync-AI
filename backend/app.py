# api.py
from __future__ import annotations

import os
import json
import time
import logging
from datetime import date, datetime
from typing import List, Optional, Literal

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, ValidationError
from starlette.middleware.base import BaseHTTPMiddleware

# Load .env early so LLM clients see GOOGLE_API_KEY, etc.
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))

# ---- Project imports (your existing modules) ----
from agents.parser import parse_task
from agents.classifier import classify_effort
from agents.scheduler import greedy_schedule
from agents.summarizer import summarize
from core.models import Task, DayPlan, DailySummary
from core.energy import energy_curve_for
from core.quiz import infer_profile

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("MindSync-API")

# ------------------- API Logging Middleware -------------------
class APILoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        
        # Log incoming request
        client_ip = request.client.host if request.client else "unknown"
        logger.info(f"🔵 [REQUEST] {request.method} {request.url.path} from {client_ip}")
        
        # Process request
        response = await call_next(request)
        
        # Log response
        process_time = time.time() - start_time
        status_emoji = "🟢" if response.status_code < 400 else "🔴"
        logger.info(f"{status_emoji} [RESPONSE] {response.status_code} in {process_time:.3f}s")
        
        return response

# ------------------- FastAPI app -------------------
app = FastAPI(
    title="MindSync Planner API",
    version="1.1.0",
    description="Parse → classify → schedule → summarize tasks, with energy profiles.",
)

# Add API request/response logging middleware
app.add_middleware(APILoggingMiddleware)

ALLOWED_ORIGINS = os.getenv(
    "CORS_ALLOW_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in ALLOWED_ORIGINS if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------- Schemas -------------------
EnergyProfile = Literal["morning_lark", "balanced", "night_owl"]

class PlanRequest(BaseModel):
    tasks: List[str] = Field(..., description="Task lines like 'Finish report; ~2h; due Fri 5pm'")
    day: Optional[str] = Field(None, description="YYYY-MM-DD (defaults to today)")
    profile: Optional[EnergyProfile] = Field("balanced", description="Energy profile to bias scheduling")
    work_start_h: Optional[int] = Field(9, description="Work start hour (24h format)")
    work_end_h: Optional[int] = Field(18, description="Work end hour (24h format)")

class PlanResponse(BaseModel):
    plan: DayPlan
    summary: DailySummary
    profile: EnergyProfile

class ParseRequest(BaseModel):
    text: str

class ParseResponse(BaseModel):
    task: Task

class ClassifyRequest(BaseModel):
    title: str
    notes: Optional[str] = None
    est_minutes: Optional[int] = 30

class QuizAnswers(BaseModel):
    # keep these flexible; frontend can send strings or numbers
    wake_time: str | int
    peak_block_start: str | int
    night_alert: int            # 0..5
    post_lunch_slump: int       # 0..5
    ideal_meeting_time: str | int

class QuizResult(BaseModel):
    profile: EnergyProfile
    confidence: float
    rationale: str

# ------------------- Routes -------------------
@app.get("/health")
def health():
    return {"ok": True, "time": datetime.utcnow().isoformat() + "Z"}

@app.post("/profile/quiz", response_model=QuizResult)
def profile_quiz(answers: QuizAnswers):
    profile, conf, why = infer_profile(answers.model_dump())
    return {"profile": profile, "confidence": conf, "rationale": why}

@app.post("/parse", response_model=ParseResponse)
def parse_endpoint(body: ParseRequest):
    try:
        t = parse_task(body.text)
        return {"task": t}
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"parse error: {e}")

@app.post("/classify", response_model=ParseResponse)
def classify_endpoint(body: ClassifyRequest):
    try:
        t = Task(title=body.title, est_minutes=body.est_minutes or 30, notes=body.notes)
        t = classify_effort(t)
        return {"task": t}
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"classify error: {e}")

@app.post("/plan", response_model=PlanResponse)
def plan_endpoint(body: PlanRequest):
    """
    End-to-end:
      1) parse + classify tasks
      2) generate energy curve for requested day/profile
      3) schedule + summarize
    """
    try:
        if not body.tasks:
            raise HTTPException(status_code=400, detail="tasks[] cannot be empty")

        logger.info(f"📋 Planning for {len(body.tasks)} tasks: {body.tasks}")

        # choose the plan date
        plan_day = date.today()
        if body.day:
            try:
                plan_day = date.fromisoformat(body.day)
            except ValueError:
                raise HTTPException(status_code=400, detail="day must be YYYY-MM-DD")

        logger.info(f"📅 Plan date: {plan_day}")

        # parse + classify all tasks
        parsed: List[Task] = []
        for i, line in enumerate(body.tasks):
            logger.info(f"🔍 Parsing task {i+1}: '{line}'")
            t = parse_task(line, plan_day)
            logger.info(f"✅ Parsed: {t.title} ({t.est_minutes}min, effort={t.effort})")
            t = classify_effort(t)
            logger.info(f"🏷️ Classified: {t.title} (effort={t.effort}, confidence={t.confidence})")
            parsed.append(t)

        logger.info(f"📦 Total parsed tasks: {len(parsed)}")

        # energy curve per request
        profile: EnergyProfile = (body.profile or "balanced")  # type: ignore[assignment]
        curve = energy_curve_for(plan_day, profile)
        logger.info(f"⚡ Energy curve generated for {profile} profile: {len(curve)} points")

        # schedule
        day_plan = greedy_schedule(
            parsed, 
            plan_day, 
            energy_curve=curve,
            work_start_h=body.work_start_h or 9,
            work_end_h=body.work_end_h or 18
        )
        logger.info(f"📊 Schedule created: {len(day_plan.blocks)} blocks (work hours: {body.work_start_h or 9}-{body.work_end_h or 18})")

        
        daily_summary = summarize(day_plan, completed_titles=[])
        logger.info(f"📝 Summary generated: {daily_summary.completion_rate} completion rate")

        return {"plan": day_plan, "summary": daily_summary, "profile": profile}
    except HTTPException:
        raise
    except ValidationError as ve:
        raise HTTPException(status_code=422, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"planning error: {e}")
