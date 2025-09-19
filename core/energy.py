
from __future__ import annotations
from datetime import datetime, timedelta, date, time
from typing import List, Tuple, Literal

EnergyProfile = Literal["morning_lark", "balanced", "night_owl"]

SlotPoint = Tuple[datetime, float]  

def _curve_from_peaks(day: date, peaks: list[tuple[int, int, float]], base: float = 0.3) -> List[SlotPoint]:
    """
    Build a 15-min resolution curve from (start_hour, end_hour, energy) peaks.
    `peaks` hours are inclusive for start, exclusive for end.
    """
    start = datetime.combine(day, time(6, 0))
    pts: List[SlotPoint] = []
    for i in range(96):  
        t = start + timedelta(minutes=15 * i)
        h = t.hour + t.minute / 60.0
        e = base
        for (hs, he, val) in peaks:
            if hs <= h < he:
                e = max(e, val)
        # common dip
        if 13 <= h < 14:
            e = min(e, 0.25)
        pts.append((t, round(e, 3)))
    return pts

def energy_curve_for(day: date, profile: EnergyProfile = "balanced") -> List[SlotPoint]:
    """
    morning_lark: big peak 08–11, small peak 16–18
    balanced:     mild 09–11 and 16–18
    night_owl:    big peak 17–21, mild 10–12
    """
    if profile == "morning_lark":
        peaks = [(8, 11, 0.95), (16, 18, 0.8)]
    elif profile == "night_owl":
        peaks = [(10, 12, 0.6), (17, 21, 0.95)]
    else:  
        peaks = [(9, 11, 0.85), (16, 18, 0.8)]
    return _curve_from_peaks(day, peaks)
