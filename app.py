
from __future__ import annotations
import os
import sys
from dotenv import load_dotenv
load_dotenv()

import os, sys
from datetime import datetime

from graph.plan_graph import run_once

HR = "-" * 60

def main():
    tasks: list[str] = []

    if len(sys.argv) > 1:
        
        tasks = sys.argv[1:]
    else:
        print("Enter tasks one per line (empty line to finish):")
        while True:
            line = input("> ").strip()
            if not line:
                break
            tasks.append(line)

    if not tasks:
        tasks = [
            "Write monthly report for client; due Fri 5pm; ~2h; include Q3 charts",
            "Email Alice about budget; 15m; today 4:30pm",
            "Prepare slides for Monday meeting; ~1h"
        ]


    from agents.parser import parse_task
    from agents.classifier import classify_effort
    task_objs = [classify_effort(parse_task(t)) for t in tasks]


    from datetime import date
    from agents.scheduler import greedy_schedule
    plan = greedy_schedule(task_objs, date.today())
    
    from agents.summarizer import summarize
    done = {b.task_title for b in plan.blocks if b.start.hour < 12}  
    summary = summarize(plan, completed_titles=list(done))

    print("\n--- Day Plan ---")
    for b in plan.blocks:
        print(f"{b.start:%H:%M}-{b.end:%H:%M} {b.task_title}")

    print("\n--- Daily Summary ---")
    print(summary.model_dump_json(indent=2))

if __name__ == "__main__":
    print("🚀 entering main()")
    try:
        main()
        print("🏁 main() returned")
    except Exception as e:
        import traceback; traceback.print_exc()
