# graph/plan_graph.py
from __future__ import annotations
from typing import TypedDict
from datetime import date

from langgraph.graph import StateGraph, END

from core.models import Task, DayPlan, DailySummary
from agents.parser import parse_task
from agents.classifier import classify_effort
from agents.scheduler import greedy_schedule
from agents.summarizer import summarize


# ---------- Shared state passed between nodes ---------- #
class State(TypedDict, total=False):
    raw_text: str
    task: Task
    plan: DayPlan
    summary: DailySummary


# ----------------------- Nodes ------------------------- #
def node_parse(state: State) -> State:
    """Raw text → Task"""
    task = parse_task(state["raw_text"])
    state["task"] = task
    return state


def node_classify(state: State) -> State:
    """Task → (effort, confidence)"""
    state["task"] = classify_effort(state["task"])
    return state


def node_schedule(state: State) -> State:
    """Task(+effort) → DayPlan (today by default)"""
    task = state["task"]
    target_day = task.deadline.date() if task.deadline else date.today()
    state["plan"] = greedy_schedule([task], target_day)
    return state


def node_summary(state: State) -> State:
    """DayPlan → DailySummary (rule-based tips by default)"""
    state["summary"] = summarize(state["plan"], completed_titles=[])
    return state


# -------------------- Graph builder -------------------- #
def build_graph():
    """
    Returns a compiled LangGraph app that runs:
        parse → classify → schedule → summary
    """
    g = StateGraph(State)

    g.add_node("parse", node_parse)
    g.add_node("classify", node_classify)
    g.add_node("schedule", node_schedule)
    g.add_node("summary", node_summary)

    g.set_entry_point("parse")
    g.add_edge("parse", "classify")
    g.add_edge("classify", "schedule")
    g.add_edge("schedule", "summary")
    g.add_edge("summary", END)

    return g.compile()


# ------------- Convenience helper for CLI -------------- #
def run_once(raw_text: str) -> State:
    """
    Convenience wrapper used by app.py:
    input raw text → returns final state with task, plan, summary.
    """
    app = build_graph()
    state: State = app.invoke({"raw_text": raw_text})
    return state
