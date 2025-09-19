// app/components/ScheduleDisplay.tsx
import React from "react";
import { DayPlan, DailySummary } from "../../lib/types";

interface Props {
  plan: DayPlan | null;
  summary: DailySummary | null;
}

export default function ScheduleDisplay({ plan, summary }: Props) {
  if (!plan || !summary) return null;
  return (
    <div className="w-full max-w-2xl mx-auto mt-8 p-6 bg-white rounded shadow">
      <h2 className="text-xl font-bold mb-4">Your Schedule</h2>
      <ul className="mb-6">
        {plan.blocks.map((block, i) => (
          <li key={i} className="mb-2 flex justify-between items-center">
            <span className="font-semibold">{block.task_title}</span>
            <span className="text-sm text-gray-500">
              {block.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              {" - "}
              {block.end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </li>
        ))}
      </ul>
      <div className="mb-4">
        <strong>Energy Alignment:</strong> {summary.energy_alignment * 100}%<br />
        <strong>Completion Rate:</strong> {summary.completion_rate * 100}%<br />
        <strong>Flow Minutes:</strong> {summary.flow_minutes}
      </div>
      <div>
        <h3 className="font-semibold mb-2">Suggestions</h3>
        <ul>
          {summary.suggestions.map((tip, i) => (
            <li key={i} className="text-sm mb-1">{tip}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
