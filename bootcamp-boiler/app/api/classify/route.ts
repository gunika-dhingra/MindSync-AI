// app/api/classify/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { classifyEffort } from '@/lib/agents/classifier';
import { Task } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, notes, est_minutes } = body;

    if (!title) {
      return NextResponse.json(
        { error: 'title is required' },
        { status: 400 }
      );
    }

    const task: Task = {
      title,
      est_minutes: est_minutes || 30,
      notes: notes || undefined,
      tags: [],
    };

    const classifiedTask = await classifyEffort(task);

    return NextResponse.json({ task: classifiedTask });
  } catch (error) {
    console.error('Classify error:', error);
    return NextResponse.json(
      { error: `classify error: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 422 }
    );
  }
}