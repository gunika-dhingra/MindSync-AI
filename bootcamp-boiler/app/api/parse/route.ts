// app/api/parse/route.ts - Task parsing endpoint

import { NextRequest } from 'next/server';
import { parseTask } from '@/lib/agents/parser';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text } = body;
    
    if (!text || typeof text !== 'string') {
      return Response.json(
        { error: 'Text field is required' },
        { status: 400 }
      );
    }
    
    const task = await parseTask(text);
    
    return Response.json({ task });
  } catch (error) {
    console.error('Parse error:', error);
    return Response.json(
      { error: `Parse error: ${error}` },
      { status: 422 }
    );
  }
}