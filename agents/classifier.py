# agents/classifier.py
from langchain_core.prompts import ChatPromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI
from core.models import Task
from core.config import MODEL
import os

_GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

_CLASSIFIER_PROMPT = ChatPromptTemplate.from_messages([
    ("system",
     "You are a cognitive effort classifier for tasks.\n"
     "Return one of low|medium|high and a confidence 0–1.\n"  # <-- fixed: no braces
     "Guidelines:\n"
     "- Deep work (reports, coding, analysis, research, design) → high.\n"
     "- Meetings, reviews, writing short notes → medium.\n"
     "- Email, quick calls, errands, admin → low.\n"
     "Only classify based on the given title and notes."),
    ("human", "Task: {title}\nNotes: {notes}")
])

_llm = ChatGoogleGenerativeAI(
    model=MODEL,
    temperature=0,
    google_api_key=_GOOGLE_API_KEY,
)

def classify_effort(task: Task) -> Task:
    out = _llm.invoke(
        _CLASSIFIER_PROMPT.format_messages(
            title=task.title,
            notes=task.notes or ""
        )
    )
    text = (out.content or "").lower()

    effort, conf = "medium", 0.6
    if "high" in text:
        effort, conf = "high", 0.8
    elif "low" in text:
        effort, conf = "low", 0.7
    elif "medium" in text:
        effort, conf = "medium", 0.7

    # simple keyword nudges
    hi_kw = ["report", "analysis", "prototype", "research", "design", "study"]
    if any(k in (task.title + " " + (task.notes or "")).lower() for k in hi_kw):
        effort, conf = "high", max(conf, 0.85)

    lo_kw = ["email", "call", "text", "schedule", "calendar", "meeting"]
    if any(k in (task.title + " " + (task.notes or "")).lower() for k in lo_kw) and effort != "high":
        effort, conf = "low", max(conf, 0.8)

    task.effort, task.confidence = effort, conf
    return task
