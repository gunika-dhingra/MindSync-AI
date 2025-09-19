
from __future__ import annotations

import os
from datetime import date, datetime
from typing import List, Optional, Literal

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, ValidationError

load_dotenv()


from agents.parser import parse_task
from agents.classifier import classify_effort
from agents.scheduler import greedy_schedule
from agents.summarizer import summarize
from core.models import Task, DayPlan, DailySummary
from core.energy import energy_curve_for
from core.quiz import infer_profile

app = FastAPI(
    title="MindSync Planner API",
    version="1.2.0",
    description="Parse → classify → schedule → summarize tasks, with energy profiles.",
)

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


EnergyProfile = Literal["morning_lark", "balanced", "night_owl"]

class PlanRequest(BaseModel):
    tasks: List[str] = Field(..., description="Task lines like 'Finish report; ~2h; due Fri 5pm'")
    day: Optional[str] = Field(None, description="YYYY-MM-DD (defaults to today)")
    profile: Optional[EnergyProfile] = Field("balanced", description="Energy profile to bias scheduling")
    work_start_h: Optional[int] = Field(9, ge=0, le=23)
    work_end_h: Optional[int] = Field(18, ge=0, le=23)

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
    
    wake_time: str | int
    peak_block_start: str | int
    night_alert: int              # 0..5
    post_lunch_slump: int         # 0..5
    ideal_meeting_time: str | int

class QuizResult(BaseModel):
    profile: EnergyProfile
    confidence: float
    rationale: str


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
      2) build energy curve for requested day/profile
      3) schedule within work hours + summarize
    """
    try:
        if not body.tasks:
            raise HTTPException(status_code=400, detail="tasks[] cannot be empty")

        
        plan_day = date.today()
        if body.day:
            try:
                plan_day = date.fromisoformat(body.day)
            except ValueError:
                raise HTTPException(status_code=400, detail="day must be YYYY-MM-DD")

       
        parsed: List[Task] = []
        for line in body.tasks:
            t = parse_task(line)
            t = classify_effort(t)
            parsed.append(t)

        profile: EnergyProfile = (body.profile or "balanced")  
        curve = energy_curve_for(plan_day, profile)

        
        day_plan = greedy_schedule(
            parsed,
            plan_day,
            energy_curve=curve,
            work_start_h=body.work_start_h or 9,
            work_end_h=body.work_end_h or 18,
        )

       
        daily_summary = summarize(day_plan, completed_titles=[])

        return {"plan": day_plan, "summary": daily_summary, "profile": profile}
    except HTTPException:
        raise
    except ValidationError as ve:
        raise HTTPException(status_code=422, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"planning error: {e}")
