// /app/api/plan/route.ts
import { NextResponse } from 'next/server';
// import { greedySchedule } from '../../../lib/agents/scheduler'; // To be implemented
// import { summarize } from '../../../lib/agents/summarizer'; // To be implemented
import { energyCurveFor } from '../../../lib/energy';
import { inferProfile } from '../../../lib/quiz';

export async function POST(req: Request) {
  const body = await req.json();
  // Parse and classify tasks, build energy curve, schedule, summarize
  // For now, return a mock response
  const planDay = body.day ? new Date(body.day) : new Date();
  const profile = body.profile || 'balanced';
  const curve = energyCurveFor(planDay, profile);
  // const plan = greedySchedule(...);
  // const summary = summarize(...);
  return NextResponse.json({
    plan: { date: planDay, blocks: [] },
    summary: { date: planDay, completion_rate: 0, energy_alignment: 0, flow_minutes: 0, suggestions: [] },
    profile
  });
}
