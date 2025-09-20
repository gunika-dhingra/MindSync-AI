
from __future__ import annotations
from pydantic import BaseModel
from typing import List, Optional, Literal
from datetime import datetime, date


Effort = Literal["low", "medium", "high"]

class Task(BaseModel):
    """A single user task, parsed from raw text."""
    title: str
    est_minutes: int = 30
    deadline: Optional[datetime] = None
    tags: List[str] = []
    notes: Optional[str] = None

    # populated by classifier
    effort: Optional[Effort] = None
    confidence: Optional[float] = None
    fixed_start: Optional[datetime]=None
    fixed_end: Optional[datetime] = None


class Block(BaseModel):
    """A scheduled time block assigned to a task."""
    task_title: str
    start: datetime
    end: datetime


class DayPlan(BaseModel):
    """A full-day schedule, made of blocks."""
    date: date
    blocks: List[Block] = []


class DailySummary(BaseModel):
    """Aggregated stats and suggestions at the end of a day."""
    date: date
    completion_rate: float          
    energy_alignment: float         
    flow_minutes: int              
    suggestions: List[str]          
