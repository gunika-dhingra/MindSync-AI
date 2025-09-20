# api.py
from __future__ import annotations

import os
import json
import time
import logging
from datetime import date, datetime, timedelta
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


# ---- Feedback endpoint for schedule refinement ----
class FeedbackRequest(BaseModel):
    userMessage: str = Field(..., description="User's feedback message")
    currentSchedule: dict = Field(..., description="Current schedule data")
    currentProfile: str = Field(..., description="Current energy profile")
    previousMessages: List[dict] = Field(default=[], description="Previous conversation messages")

class FeedbackResponse(BaseModel):
    response: str = Field(..., description="AI response to user feedback")
    hasUpdates: bool = Field(default=False, description="Whether schedule/profile updates are suggested")
    updatedSchedule: Optional[dict] = Field(None, description="Updated schedule if applicable")
    updatedProfile: Optional[str] = Field(None, description="Updated energy profile if applicable")
    suggestions: List[str] = Field(default=[], description="Improvement suggestions")

@app.post("/feedback", response_model=FeedbackResponse)
def feedback_endpoint(body: FeedbackRequest):
    """
    Process user feedback about their schedule and suggest improvements.
    """
    try:
        logger.info(f"🔄 [FEEDBACK] Processing feedback for {body.currentProfile} profile")
        logger.info(f"💬 User message: {body.userMessage[:100]}...")

        # Analyze the feedback using AI
        feedback_analysis = analyze_feedback(
            user_message=body.userMessage,
            current_schedule=body.currentSchedule,
            current_profile=body.currentProfile,
            conversation_history=body.previousMessages
        )

        logger.info(f"🤖 Generated response: {feedback_analysis['response'][:100]}...")
        
        return feedback_analysis

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Feedback processing error: {e}")
        raise HTTPException(status_code=500, detail=f"feedback processing error: {e}")


def analyze_feedback(user_message: str, current_schedule: dict, current_profile: str, conversation_history: List[dict]) -> dict:
    """
    Analyze user feedback and generate appropriate responses and updates.
    """
    from langchain_google_genai import ChatGoogleGenerativeAI
    from langchain_core.prompts import ChatPromptTemplate
    from core.config import MODEL
    import os
    
    # Initialize the LLM
    llm = ChatGoogleGenerativeAI(
        model=MODEL,
        temperature=0.7,
        google_api_key=os.getenv("GOOGLE_API_KEY"),
    )
    
    # Create prompt template
    feedback_prompt = ChatPromptTemplate.from_messages([
        ("system", 
         "You are an AI assistant helping users refine their daily schedules based on their feedback. "
         "Provide helpful, empathetic responses and actionable suggestions. "
         "Keep responses concise but actionable."),
        ("human", """
Current Energy Profile: {current_profile}
Current Schedule: {current_schedule}

User Feedback: "{user_message}"

Previous Conversation: {conversation_history}

Analyze the user's feedback and provide:
1. A helpful, empathetic response acknowledging their feedback
2. Specific suggestions for improvement
3. Whether the schedule or energy profile should be updated

Respond in a conversational, helpful tone. If the user mentions tasks being too hard/easy, timing issues, or wanting to add/remove tasks, be specific about how to address these concerns.
""")
    ])

    try:
        # Generate AI response
        response = llm.invoke(
            feedback_prompt.format_messages(
                current_profile=current_profile,
                current_schedule=json.dumps(current_schedule, indent=2) if current_schedule else 'No schedule provided',
                user_message=user_message,
                conversation_history=json.dumps(conversation_history[-3:], indent=2) if conversation_history else 'No previous messages'
            )
        )
        
        ai_response = response.content or "I understand your feedback. Let me help you adjust your schedule."
        
        # Analyze feedback to determine what changes to make
        user_lower = user_message.lower()
        
        # Check if schedule updates are needed
        needs_schedule_update = any(keyword in user_lower for keyword in [
            'too busy', 'overwhelmed', 'stressed', 'too much', 'reduce', 'remove',
            'change time', 'reschedule', 'earlier', 'later', 'wrong time',
            'break', 'space', 'gap', 'longer', 'shorter'
        ])
        
        # Check if profile update is needed
        needs_profile_update = any(keyword in user_lower for keyword in [
            'morning person', 'night owl', 'early bird', 'late', 'energy',
            'tired', 'alert', 'focused', 'productive'
        ])
        
        updated_schedule = None
        updated_profile = None
        
        # Generate actual schedule updates if needed
        if needs_schedule_update and current_schedule:
            updated_schedule = generate_schedule_update(user_message, current_schedule)
            
        # Generate profile updates if needed  
        if needs_profile_update:
            updated_profile = generate_profile_update(user_message, current_profile)
        
        # Generate suggestions based on feedback content
        suggestions = generate_suggestions(user_message, current_profile)
        
        return {
            "response": ai_response or "Thank you for your feedback! I'm here to help you improve your schedule.",
            "hasUpdates": needs_schedule_update or needs_profile_update,
            "updatedSchedule": updated_schedule,
            "updatedProfile": updated_profile,
            "suggestions": suggestions
        }
        
    except Exception as e:
        logger.error(f"❌ AI analysis error: {e}")
        # Fallback to simple pattern matching
        return generate_fallback_feedback_response(user_message)


def generate_schedule_update(user_message: str, current_schedule: dict) -> dict:
    """Generate an updated schedule based on user feedback."""
    try:
        # Parse the current schedule
        blocks = current_schedule.get('blocks', [])
        if not blocks:
            return None
            
        user_lower = user_message.lower()
        updated_blocks = []
        
        for block in blocks:
            start_time = datetime.fromisoformat(block['start'])
            end_time = datetime.fromisoformat(block['end'])
            duration_minutes = int((end_time - start_time).total_seconds() / 60)
            
            # Apply modifications based on feedback
            if 'too busy' in user_lower or 'overwhelmed' in user_lower:
                # Reduce task duration by 25%
                new_duration = max(15, int(duration_minutes * 0.75))
                new_end = start_time + timedelta(minutes=new_duration)
                
                updated_blocks.append({
                    "task_title": block['task_title'],
                    "start": start_time.isoformat(),
                    "end": new_end.isoformat()
                })
                
            elif 'more time' in user_lower or 'longer' in user_lower:
                # Increase task duration by 25%
                new_duration = int(duration_minutes * 1.25)
                new_end = start_time + timedelta(minutes=new_duration)
                
                updated_blocks.append({
                    "task_title": block['task_title'],
                    "start": start_time.isoformat(),
                    "end": new_end.isoformat()
                })
                
            elif 'earlier' in user_lower:
                # Move tasks 1 hour earlier
                new_start = start_time - timedelta(hours=1)
                new_end = end_time - timedelta(hours=1)
                
                # Don't move before 8am
                if new_start.hour >= 8:
                    updated_blocks.append({
                        "task_title": block['task_title'],
                        "start": new_start.isoformat(),
                        "end": new_end.isoformat()
                    })
                else:
                    updated_blocks.append(block)
                    
            elif 'later' in user_lower:
                # Move tasks 1 hour later
                new_start = start_time + timedelta(hours=1)
                new_end = end_time + timedelta(hours=1)
                
                # Don't move after 6pm
                if new_end.hour <= 18:
                    updated_blocks.append({
                        "task_title": block['task_title'],
                        "start": new_start.isoformat(),
                        "end": new_end.isoformat()
                    })
                else:
                    updated_blocks.append(block)
                    
            elif 'break' in user_lower or 'space' in user_lower:
                # Add 15-minute gaps between tasks
                updated_blocks.append({
                    "task_title": block['task_title'],
                    "start": start_time.isoformat(),
                    "end": (end_time - timedelta(minutes=15)).isoformat()
                })
                
            else:
                # Keep original block
                updated_blocks.append(block)
        
        return {
            "date": current_schedule.get('date'),
            "blocks": updated_blocks
        }
        
    except Exception as e:
        logger.error(f"❌ Schedule update error: {e}")
        return None


def generate_profile_update(user_message: str, current_profile: str) -> str:
    """Generate an updated energy profile based on user feedback."""
    user_lower = user_message.lower()
    
    if any(word in user_lower for word in ['morning', 'early', 'dawn', 'sunrise']):
        return 'morning_lark'
    elif any(word in user_lower for word in ['night', 'evening', 'late', 'owl']):
        return 'night_owl'
    elif any(word in user_lower for word in ['balanced', 'flexible', 'average']):
        return 'balanced'
    else:
        return current_profile  # Keep current if no clear indication


def generate_suggestions(user_message: str, current_profile: str) -> List[str]:
    """Generate contextual suggestions based on user feedback."""
    suggestions = []
    user_lower = user_message.lower()
    
    if 'too hard' in user_lower or 'difficult' in user_lower:
        suggestions.extend([
            "Break complex tasks into smaller, manageable subtasks",
            "Schedule challenging tasks during your peak energy times",
            "Add more breaks between difficult tasks"
        ])
    
    if 'too easy' in user_lower or 'boring' in user_lower:
        suggestions.extend([
            "Add more challenging variations to simple tasks",
            "Combine related tasks for more complexity",
            "Consider adding stretch goals or bonus objectives"
        ])
    
    if 'time' in user_lower or 'schedule' in user_lower:
        suggestions.extend([
            "Adjust task timing based on your energy patterns",
            "Experiment with different time blocks",
            "Consider your natural productivity rhythms"
        ])
    
    if 'add' in user_lower:
        suggestions.extend([
            "Identify gaps in your schedule for new tasks",
            "Group similar tasks together for efficiency",
            "Balance work tasks with personal activities"
        ])
    
    # Default suggestions if none match
    if not suggestions:
        suggestions = [
            "Review your energy levels throughout the day",
            "Adjust task difficulty to match your capabilities",
            "Fine-tune timing based on your productivity patterns"
        ]
    
    return suggestions[:3]  # Return max 3 suggestions


def generate_fallback_feedback_response(user_message: str) -> dict:
    """Fallback response generation when AI is unavailable."""
    user_lower = user_message.lower()
    
    if 'too hard' in user_lower:
        response = "I understand some tasks felt too challenging. Let's work on breaking them down into smaller, more manageable pieces or scheduling them during your peak energy times."
    elif 'too easy' in user_lower:
        response = "It sounds like you're ready for more challenge! We can add complexity to existing tasks or introduce new, more engaging activities."
    elif 'time' in user_lower:
        response = "Timing is crucial for productivity. Let's adjust your schedule to better match your natural energy rhythms and preferences."
    else:
        response = "Thank you for your feedback! I'm here to help you refine your schedule. Could you tell me more specifically what you'd like to improve?"
    
    return {
        "response": response,
        "hasUpdates": True,
        "updatedSchedule": None,
        "updatedProfile": None,
        "suggestions": generate_suggestions(user_message, "balanced")
    }
