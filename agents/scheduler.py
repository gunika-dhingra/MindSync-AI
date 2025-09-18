
from __future__ import annotations
from datetime import datetime, timedelta, date, time
from typing import List, Tuple, Dict, Optional
from core.models import Task, DayPlan, Block

Slot = Tuple[datetime, datetime]


def mock_energy_curve(day: date) -> List[Tuple[datetime, float]]:
    """
    Returns 96 (15-min) points across the day with simple peaks:
      - High:        09:00–11:00
      - Post-lunch:  13:00–14:00 dip
      - Medium-high: 16:00–18:00
    Values in [0..1].
    """
    base = datetime.combine(day, time(6, 0))
    curve: List[Tuple[datetime, float]] = []
    for i in range(96):
        t = base + timedelta(minutes=15 * i)
        hour = t.hour + t.minute / 60.0
        e = 0.3
        if 9 <= hour <= 11:
            e = 0.9
        if 16 <= hour <= 18:
            e = max(e, 0.8)
        if 13 <= hour <= 14:
            e = 0.2
        curve.append((t, e))
    return curve


def mock_busy(day: date) -> List[Slot]:
    """
    Hardcoded conflicts to simulate meetings:
      - 10:30–11:00
      - 14:00–15:00
    """
    s1 = datetime.combine(day, time(10, 30)); e1 = s1 + timedelta(minutes=30)
    s2 = datetime.combine(day, time(14, 0));  e2 = s2 + timedelta(minutes=60)
    return [(s1, e1), (s2, e2)]


# ----------------------- Slot / Grid Utilities -----------------------

def _workday_slots(day: date, start_h=9, end_h=18, step_min=15) -> List[Slot]:
    start = datetime.combine(day, time(start_h, 0))
    end = datetime.combine(day, time(end_h, 0))
    slots: List[Slot] = []
    t = start
    while t < end:
        nxt = t + timedelta(minutes=step_min)
        slots.append((t, nxt))
        t = nxt
    return slots


def _overlaps(a: Slot, b: Slot) -> bool:
    return not (a[1] <= b[0] or b[1] <= a[0])


def _free_slots(day: date, busy: List[Slot], step_min=15) -> List[Slot]:
    all_slots = _workday_slots(day, step_min=step_min)
    return [s for s in all_slots if not any(_overlaps(s, b) for b in busy)]


def _slot_scores(free: List[Slot], curve: List[Tuple[datetime, float]]) -> Dict[Slot, float]:
    energy_lookup = {t: e for t, e in curve}
    return {s: energy_lookup.get(s[0], 0.5) for s in free}


def _chunk_minutes_for_effort(effort: Optional[str]) -> int:
    """
    Choose chunk size by effort:
      - high: 60m
      - medium: 45m
      - low: 30m
    """
    if (effort or "").lower() == "high":
        return 60
    if (effort or "").lower() == "low":
        return 30
    return 45


def _contiguous_slots(start: datetime, minutes: int) -> List[Slot]:
    """Return the list of 15-min slots covering [start, start+minutes]."""
    steps = max(1, minutes // 15)
    return [
        (start + timedelta(minutes=15 * i),
         start + timedelta(minutes=15 * (i + 1)))
        for i in range(steps)
    ]


def _snap_down_15(dt: datetime) -> datetime:
    minutes = (dt.minute // 15) * 15
    return dt.replace(minute=minutes, second=0, microsecond=0)


def _snap_up_15(dt: datetime) -> datetime:
    if dt.minute % 15 == 0 and dt.second == 0 and dt.microsecond == 0:
        return dt.replace(second=0, microsecond=0)
    delta = 15 - (dt.minute % 15)
    out = dt + timedelta(minutes=delta)
    return out.replace(second=0, microsecond=0)


def _merge_adjacent(plan: DayPlan) -> DayPlan:
    """Fuse adjacent blocks of the same task to reduce fragmentation."""
    merged: List[Block] = []
    for b in sorted(plan.blocks, key=lambda x: (x.start, x.task_title)):
        if merged and merged[-1].task_title == b.task_title and merged[-1].end == b.start:
            merged[-1].end = b.end
        else:
            merged.append(b)
    plan.blocks = merged
    return plan




def greedy_schedule(
    tasks: List[Task],
    day: date,
    *,
    energy_curve: Optional[List[Tuple[datetime, float]]] = None,
    busy: Optional[List[Slot]] = None,
    work_start_h: int = 9,
    work_end_h: int = 18,
    step_min: int = 15,
) -> DayPlan:
    """
    Greedy packer with support for fixed-time tasks.

    Steps:
      1) Reserve fixed-time tasks first (fixed_start/fixed_end).
      2) Score remaining free slots against the energy curve.
         - high effort → chase peaks
         - low effort  → prefer dips (inverse score)
         - medium      → mild preference for energy
      3) Place tasks in contiguous chunks (30–60m) until done or grid full.
      4) Merge adjacent blocks of the same task.
    """
    curve = energy_curve or mock_energy_curve(day)
    busy_list = busy or mock_busy(day)

   
    all_work_slots = _workday_slots(day, start_h=work_start_h, end_h=work_end_h, step_min=step_min)
    free = [s for s in all_work_slots if not any(_overlaps(s, b) for b in busy_list)]
    scores = _slot_scores(free, curve)

    plan = DayPlan(date=day, blocks=[])
    used: set[Slot] = set()

    
    fixed, flexible = [], []
    for t in tasks:
        fs = getattr(t, "fixed_start", None)
        fe = getattr(t, "fixed_end", None)
        if fs or fe:
            
            if fs and not fe:
                fe = fs + timedelta(minutes=int(max(15, t.est_minutes)))
            
            fs = _snap_down_15(fs) if fs else None
            fe = _snap_up_15(fe) if fe else None
            
            try:
                t.fixed_start, t.fixed_end = fs, fe  
            except Exception:
                pass
            fixed.append((t, fs, fe))
        else:
            flexible.append(t)

    for t, fs, fe in fixed:
        if not fs or not fe:
            continue
    
        if fs.date() != day:
            continue
        minutes = int((fe - fs).total_seconds() // 60)
        needed = _contiguous_slots(fs, minutes)
        for ns in needed:
            used.add(ns)
        plan.blocks.append(Block(task_title=t.title, start=fs, end=fe))


  
    free = [s for s in free if s not in used]
    if not free and len(plan.blocks) == 0:
        return plan  
    def task_key(t: Task):
        eff_rank = {"high": 0, "medium": 1, "low": 2}.get((t.effort or "medium").lower(), 1)
        d = t.deadline or datetime.combine(day, time(23, 59))
        return (eff_rank, d)

    tasks_sorted = sorted(flexible, key=task_key)

    def score_for_task(slot: Slot, effort: Optional[str]) -> float:
        e = scores.get(slot, 0.5)
        eff = (effort or "medium").lower()
        if eff == "high":
            return e                 
        if eff == "low":
            return 1.0 - e           
        return 0.5 + 0.5 * e         

    
    free_sorted_cache = None

    for t in tasks_sorted:
        remaining = max(15, int(t.est_minutes))
        chunk = _chunk_minutes_for_effort(t.effort)

   
        free_sorted = sorted(free, key=lambda x: -score_for_task(x, t.effort))
        if free_sorted_cache is None:
            free_sorted_cache = free_sorted  

        while remaining > 0:
            placed_any = False
            for s in free_sorted:
                if s in used:
                    continue

                
                minutes = min(chunk, remaining)
                if minutes < 30 and remaining >= 30:
                    minutes = 30

             
                start = s[0]
                needed = _contiguous_slots(start, minutes)
                if all(ns in free and ns not in used for ns in needed):
                    for ns in needed:
                        used.add(ns)
                    plan.blocks.append(Block(task_title=t.title, start=start, end=start + timedelta(minutes=minutes)))
                    remaining -= minutes
                    placed_any = True
                    break  

            if not placed_any:
                
                break

    plan.blocks.sort(key=lambda b: b.start)
    _merge_adjacent(plan)
    return plan




def energy_alignment(plan: DayPlan) -> float:
    """
    Percent of scheduled minutes that fall in high-energy windows (>= 0.75).
    Returns a value in [0,1], rounded to 2 decimals.
    """
    if not plan.blocks:
        return 0.0
    curve = dict(mock_energy_curve(plan.date))
    hi_thresh = 0.75
    hi = 0
    total = 0
    for b in plan.blocks:
        t = b.start.replace(second=0, microsecond=0)
        while t < b.end:
            total += 15
            if curve.get(t, 0.0) >= hi_thresh:
                hi += 15
            t += timedelta(minutes=15)
    return 0.0 if total == 0 else round(hi / total, 2)
