
from __future__ import annotations
from typing import Literal, Dict, Any, Tuple

EnergyProfile = Literal["morning_lark", "balanced", "night_owl"]



def _score_range(value: int, low: int, high: int) -> int:
    return 1 if low <= value <= high else 0

def _normalize_hour_str(s: str) -> int:
   
    s = s.strip()
    if ":" in s:
        h, _m = s.split(":", 1)
        return max(0, min(23, int(h)))
    return max(0, min(23, int(s)))


def infer_profile(answers: Dict[str, Any]) -> Tuple[EnergyProfile, float, str]:
    
    wake_h = _normalize_hour_str(str(answers.get("wake_time", "7")))
    peak_h = _normalize_hour_str(str(answers.get("peak_block_start", "10")))
    night_alert = int(answers.get("night_alert", 2))            
    slump = int(answers.get("post_lunch_slump", 2))            
    ideal_meet = _normalize_hour_str(str(answers.get("ideal_meeting_time", "15")))

    score_morning = 0
    score_night = 0
    score_morning += _score_range(wake_h, 5, 7)         
    score_night   += _score_range(wake_h, 9, 11)       


    score_morning += _score_range(peak_h, 8, 10)        
    score_night   += _score_range(peak_h, 16, 20)       

    
    if night_alert >= 4:
        score_night += 1
    elif night_alert <= 1:
        score_morning += 1

    
    if slump >= 4:
        score_morning += 1
    elif slump <= 1:
        score_night += 1

    if 10 <= ideal_meet <= 12:
        score_morning += 1
    if 15 <= ideal_meet <= 17:
        score_night += 1


    if score_morning - score_night >= 2:
        profile: EnergyProfile = "morning_lark"
    elif score_night - score_morning >= 2:
        profile = "night_owl"
    else:
        profile = "balanced"


    margin = abs(score_morning - score_night)
    confidence = min(1.0, 0.5 + 0.1 * margin)  # 0.5–1.0

    rationale = (
        f"wake={wake_h}, peak={peak_h}, night_alert={night_alert}, "
        f"slump={slump}, ideal_meeting={ideal_meet} → "
        f"scores: morning={score_morning}, night={score_night}"
    )
    return profile, round(confidence, 2), rationale




def ask_quiz_cli() -> Dict[str, Any]:
    print("\nQuick energy quiz (press Enter for defaults)")
    wake_time = input("1) Usual wake-up hour (e.g., 6, 6:30, 8): ").strip() or "7"
    peak_block_start = input("2) When do you like to start deep work? (hour, e.g., 9, 10, 16): ").strip() or "10"
    night_alert = input("3) How alert after 20:00? (0=not at all .. 5=very): ").strip() or "2"
    post_lunch_slump = input("4) Post-lunch slump intensity? (0..5): ").strip() or "2"
    ideal_meeting_time = input("5) Best meeting time? (hour, e.g., 11, 15): ").strip() or "15"
    return {
        "wake_time": wake_time,
        "peak_block_start": peak_block_start,
        "night_alert": int(night_alert),
        "post_lunch_slump": int(post_lunch_slump),
        "ideal_meeting_time": ideal_meeting_time,
    }
