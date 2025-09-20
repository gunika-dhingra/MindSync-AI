
from __future__ import annotations
import os
import re
from datetime import datetime, timedelta, date
from typing import Optional

from pydantic import BaseModel
from langchain_core.prompts import ChatPromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI

from core.models import Task
from core.config import MODEL
from dateutil import parser as dtp

_DUE_PAT = re.compile(r"\bdue\b([^;,.]*)", re.IGNORECASE)
def _extract_due_deadline(raw_text: str, plan_day: datetime) -> datetime | None:
    m = _DUE_PAT.search(raw_text or "")
    if not m:
        return None
    frag = m.group(1).strip()
    try:
        dt = dtp.parse(frag, default=plan_day.replace(hour=0, minute=0, second=0, microsecond=0))
        return dt
    except Exception:
        return None
def _get_llm():
    
    return ChatGoogleGenerativeAI(
        model=MODEL,
        temperature=0,
        google_api_key=os.getenv("GOOGLE_API_KEY"),
    )



class TaskDraft(BaseModel):
    title: str
    est_minutes: int = 30
    deadline: Optional[str] = None         
    tags: list[str] = []
    notes: Optional[str] = None
    fixed_start: Optional[str] = None      
    fixed_end: Optional[str] = None



_BASE_RULES = (
    "Return ONLY the fields defined by the schema. "
    "Convert durations like '2h', '1.5 hours', '45m' to total minutes. "
    "IMPORTANT: Only set fixed_start/fixed_end for tasks with EXPLICIT time constraints like:"
    "- 'meeting at 2pm', 'call at 10:30am', 'appointment from 9-10am', 'lunch 12:00-13:00'"
    "- Tasks that specify 'at [time]', 'from [time] to [time]', '[time] to [time]'"
    "DO NOT set fixed_start/fixed_end for:"
    "- Tasks with only durations ('45 minutes', '2 hours')"
    "- Tasks with only deadlines ('due by 5pm', 'due Friday')"
    "- General tasks without specific scheduling constraints"
    "Treat any phrase starting with 'due' (e.g., 'due today 4pm', 'due Fri 17:00') "
    "as a DEADLINE (deadline field), NOT as a fixed start/end. Never set fixed_start/fixed_end from 'due'. "
    "Leave fixed_start and fixed_end as null unless there's an explicit scheduling constraint."
)


PARSER_PROMPT_LENIENT = ChatPromptTemplate.from_messages([
    ("system",
     "Extract a single Task JSON using this schema: "
     "title (string), est_minutes (int), deadline (string|null), tags (list[str]), "
     "notes (string|null), fixed_start (string|null), fixed_end (string|null). "
     + _BASE_RULES),
    ("human", "{raw_text}")
])

PARSER_PROMPT_STRICT = ChatPromptTemplate.from_messages([
    ("system",
     "Extract a single Task JSON using this schema: "
     "title (string), est_minutes (int), deadline (ISO8601 string|null), tags (list[str]), "
     "notes (string|null), fixed_start (ISO8601 string|null), fixed_end (ISO8601 string|null). "
     + _BASE_RULES +
     "IMPORTANT: Never output words like 'today', 'tomorrow', or 'tonight'. "
     "Always convert to full ISO 8601 (e.g., '2025-09-17T17:00:00'). "
     "If a relative day has no time, use 17:00 local time."),
    ("human", "{raw_text}")
])


_TIME_RE = re.compile(
    r'(?<!\d)(?P<h1>\d{1,2})(?::(?P<m1>\d{2}))?\s*(?P<ampm1>am|pm)?'
    r'\s*[-–—]\s*'
    r'(?P<h2>\d{1,2})(?::(?P<m2>\d{2}))?\s*(?P<ampm2>am|pm)?',
    re.IGNORECASE,
)
# single time like '14:00' or '2pm' but NOT '2 hours'
_SINGLE_TIME_RE = re.compile(
    r'(?<!\d)(?P<h>\d{1,2})(?::(?P<m>\d{2}))?\s*(?P<ampm>am|pm)?(?!\s*(?:hours?|hrs?|h\b|minutes?|mins?|m\b))',
    re.IGNORECASE,
)

def _to_24h(h: int, ampm: str | None) -> int:
    if ampm is None:
        return h if 0 <= h <= 23 else h % 24
    ampm = ampm.lower()
    if ampm == "am":
        return 0 if h == 12 else h
    return 12 if h == 12 else h + 12

def _parse_time_window_from_text(raw_text: str, base: datetime) -> tuple[datetime | None, datetime | None]:
    m = _TIME_RE.search(raw_text)
    if not m:
        return (None, None)
    h1 = _to_24h(int(m.group("h1")), m.group("ampm1"))
    m1 = int(m.group("m1") or 0)
    h2 = _to_24h(int(m.group("h2")), m.group("ampm2"))
    m2 = int(m.group("m2") or 0)
    start = base.replace(hour=h1, minute=m1, second=0, microsecond=0)
    end = base.replace(hour=h2, minute=m2, second=0, microsecond=0)
    if end <= start:
        end += timedelta(days=1)
    return (start, end)

def _parse_single_time_from_text(raw_text: str, base: datetime) -> datetime | None:
    m = _SINGLE_TIME_RE.search(raw_text)
    if not m:
        return None
    h = _to_24h(int(m.group("h")), m.group("ampm"))
    mm = int(m.group("m") or 0)
    return base.replace(hour=h, minute=mm, second=0, microsecond=0)

def _normalize_rel_word(s: Optional[str], default_hour=17) -> datetime | None:
    if not s:
        return None
    txt = s.strip().lower()
    now = datetime.now()
    if txt == "today":
        return now.replace(hour=default_hour, minute=0, second=0, microsecond=0)
    if txt in {"tomorrow", "tmr"}:
        tmr = now + timedelta(days=1)
        return tmr.replace(hour=default_hour, minute=0, second=0, microsecond=0)
    
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00"))
    except Exception:
        return None


def _finalize_task(raw_text: str, d: TaskDraft, plan_date: date | None = None) -> Task:
    base = _infer_base_from_text(raw_text, plan_date)

    # Additional safety check: only allow fixed times if text has explicit scheduling words
    tlow = raw_text.lower()
    
    # Strong indicators that this should have fixed timing
    has_explicit_scheduling = any(pattern in tlow for pattern in [
        "meeting at", "call at", "appointment at", 
        "lunch at", "break at", "conference at"
    ]) or (" at " in tlow and "due" not in tlow)
    
    # Only process fixed times if we have explicit scheduling
    if has_explicit_scheduling:
        fs_dt = _normalize_rel_word(d.fixed_start)
        fe_dt = _normalize_rel_word(d.fixed_end)
        
        # If LLM didn't set fixed times, try regex parsing
        if fs_dt is None and fe_dt is None:
            fs_dt, fe_dt = _parse_time_window_from_text(raw_text, base)
            
            # Try single time parsing
            if fs_dt is None and fe_dt is None:
                fs_dt = _parse_single_time_from_text(raw_text, base)
                
        if fs_dt is not None and fe_dt is None:
            fe_dt = fs_dt + timedelta(minutes=d.est_minutes or 30)
    else:
        # No explicit scheduling - clear any fixed times
        fs_dt, fe_dt = None, None

    dl_dt = _normalize_rel_word(d.deadline)
    if dl_dt is None and d.deadline:
        maybe = _parse_single_time_from_text(d.deadline, base)
        dl_dt = maybe or dl_dt

    # enforce "due ..." in the original text as DEADLINE
    extra_due = _extract_due_deadline(raw_text, base)
    if extra_due:
        dl_dt = extra_due if (dl_dt is None or extra_due < dl_dt) else dl_dt

        has_window = _TIME_RE.search(raw_text) is not None
        has_explicit_start_words = any(w in tlow for w in (" at ", " start ", " from "))
        # if there is no explicit window and no 'at/start/from', any fixed_* likely came from 'due' → drop them
        if not has_window and not has_explicit_start_words:
            fs_dt, fe_dt = None, None

    return Task(
        title=d.title,
        est_minutes=d.est_minutes or 30,
        deadline=dl_dt,
        tags=d.tags,
        notes=d.notes,
        fixed_start=fs_dt,
        fixed_end=fe_dt,
    )


def parse_task(raw_text: str, plan_date: date | None = None) -> Task:
    """
    Parse raw text into a Task.
    Strategy:
      1) Lenient pass (times as strings) → Python normalization.
      2) If conversion fails, strict pass (ISO-only).
    """
    llm = _get_llm()

    
    draft_chain = PARSER_PROMPT_LENIENT | llm.with_structured_output(TaskDraft)
    draft = draft_chain.invoke({"raw_text": raw_text})
    try:
        return _finalize_task(raw_text, draft, plan_date)
    except Exception:
        
        strict_chain = PARSER_PROMPT_STRICT | llm.with_structured_output(TaskDraft)
        draft2 = strict_chain.invoke({"raw_text": raw_text})
        return _finalize_task(raw_text, draft2, plan_date)



def parse_tasks(texts: list[str], plan_date: date | None = None) -> list[Task]:
    return [parse_task(t, plan_date) for t in texts]


def _infer_base_from_text(raw_text: str, plan_date: date | None = None) -> datetime:
    t = raw_text.lower()
    now = datetime.now()
    
    # If we have a plan date, use that as the default base
    if plan_date:
        base_date = plan_date
    elif "tomorrow" in t or "tmr" in t:
        base_date = (now + timedelta(days=1)).date()
    elif "today" in t:
        base_date = now.date()
    else:
        # Default to plan date if provided, otherwise today
        base_date = plan_date or now.date()
    
    # Return datetime with the determined date
    return datetime.combine(base_date, now.time().replace(second=0, microsecond=0))  
