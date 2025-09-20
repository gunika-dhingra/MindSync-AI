
from __future__ import annotations
import os
from typing import Iterable, List, Dict
from datetime import time, timedelta
from core.models import DailySummary, DayPlan, Block
from .scheduler import energy_alignment


USE_LLM_SUMMARY = os.getenv("USE_LLM_SUMMARY", "false").lower() in {"1", "true", "yes"}


def _block_minutes(b: Block) -> int:
    return int((b.end - b.start).total_seconds() // 60)

def _total_minutes(plan: DayPlan) -> int:
    return sum(_block_minutes(b) for b in plan.blocks)

def _minutes_by_title(plan: DayPlan) -> Dict[str, int]:
    by_title: Dict[str, int] = {}
    for b in plan.blocks:
        by_title[b.task_title] = by_title.get(b.task_title, 0) + _block_minutes(b)
    return by_title

def _context_switches(plan: DayPlan) -> int:
    """How many times we switch task title between adjacent blocks."""
    switches = 0
    for i in range(1, len(plan.blocks)):
        if plan.blocks[i - 1].task_title != plan.blocks[i].task_title:
            switches += 1
    return switches

def _fragmented_blocks(plan: DayPlan, min_chunk=30) -> int:
    """Count blocks shorter than min_chunk minutes."""
    return sum(1 for b in plan.blocks if _block_minutes(b) < min_chunk)

def _late_deep_work(plan: DayPlan) -> bool:
    """Detect deep-work-ish titles scheduled after 17:00."""
    deep_kw = ("report", "analysis", "design", "research", "prototype", "spec", "whitepaper")
    for b in plan.blocks:
        if b.start.hour >= 17 and any(k in b.task_title.lower() for k in deep_kw):
            return True
    return False

def _admin_not_in_dip(plan: DayPlan) -> bool:
    """Admin/email could be better placed in post-lunch dip (13:00–14:00)."""
    admin_kw = ("email", "inbox", "schedule", "calendar", "admin", "ticket")
    for b in plan.blocks:
        if any(k in b.task_title.lower() for k in admin_kw):
            
            if not (b.start.hour == 13 or (b.start.hour == 12 and b.end.hour == 13)):
                return True
    return False

def _minute_weighted_completion(plan: DayPlan, completed_titles: Iterable[str]) -> float:
    """Completion as fraction of total *scheduled minutes* whose title is in 'completed'."""
    completed = set(completed_titles or [])
    total = _total_minutes(plan)
    if total == 0:
        return 0.0
    done_minutes = sum(_block_minutes(b) for b in plan.blocks if b.task_title in completed)
    return round(done_minutes / total, 2)



def _rule_based_suggestions(plan: DayPlan, completion: float, align: float) -> List[str]:
    tips: List[str] = []

    
    if align < 0.5:
        tips.append("Shift a deep-work block into 09:00–11:00; avoid 13:00–14:00 for focus.")
    elif align < 0.7:
        tips.append("Nudge deep work 30–45 minutes earlier to catch your morning peak.")
    else:
        tips.append("Keep anchoring deep work in morning peaks; it’s paying off.")

    
    if completion < 0.6:
        tips.append("Use 30–45 minute focus blocks with 10-minute buffers; defer non-urgent admin.")
    elif completion < 0.8:
        tips.append("Protect focus blocks from meetings/notifications; add a 15-minute recovery at 15:00.")
    else:
        tips.append("Great pace—add a short admin sweep at 16:30 to close loops.")

   
    switches = _context_switches(plan)
    if switches >= 4:
        tips.append("Reduce context switches—batch similar tasks back-to-back.")
    if _fragmented_blocks(plan) >= 2:
        tips.append("Avoid fragments—prefer ≥30-minute chunks per block.")
    if _late_deep_work(plan):
        tips.append("Pull deep work earlier; after 17:00 quality usually drops.")
    if _admin_not_in_dip(plan):
        tips.append("Park admin/email in the 13:00–14:00 dip to reserve peaks for focus.")

    
    final: List[str] = []
    seen = set()
    for t in tips:
        if t not in seen:
            final.append(t)
            seen.add(t)
        if len(final) == 2:
            break
    return final


def summarize(plan: DayPlan, completed_titles: Iterable[str] | None = None) -> DailySummary:
    """
    Create a DailySummary from a DayPlan and an optional set of completed task titles.
    Uses minute-weighted completion and several plan-quality heuristics to vary tips.
    """
    completion = _minute_weighted_completion(plan, completed_titles or [])
    align = energy_alignment(plan)
    flow_minutes = _total_minutes(plan)

    suggestions = _rule_based_suggestions(plan, completion, align)

  
    if USE_LLM_SUMMARY:
        try:
            from langchain_core.prompts import ChatPromptTemplate
            from langchain_google_genai import ChatGoogleGenerativeAI
            from core.config import MODEL

            prompt = ChatPromptTemplate.from_messages([
                ("system",
                 "Rewrite the following 2 planning suggestions. Keep each ≤18 words, direct, and actionable."),
                ("human", "{tips}")
            ])
            llm = ChatGoogleGenerativeAI(
                model=MODEL,
                temperature=0.2,
                google_api_key=os.getenv("GOOGLE_API_KEY"),
            )
            msg = prompt.format_messages(tips="\n".join(f"- {t}" for t in suggestions))
            out = llm.invoke(msg).content or ""
            rewrites = [line.lstrip("- ").strip() for line in out.splitlines() if line.strip()]
            if rewrites:
                suggestions = rewrites[:2]
        except Exception:
            
            pass

    return DailySummary(
        date=plan.date,
        completion_rate=completion,
        energy_alignment=align,
        flow_minutes=flow_minutes,
        suggestions=suggestions
    )
