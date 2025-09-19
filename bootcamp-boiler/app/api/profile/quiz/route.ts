// app/api/profile/quiz/route.ts - Energy profile quiz endpoint

import { NextRequest } from 'next/server';
import { inferProfile } from '@/lib/quiz';
import { QuizAnswers } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const answers: QuizAnswers = body;
    
    const result = inferProfile(answers);
    
    return Response.json(result);
  } catch (error) {
    console.error('Quiz error:', error);
    return Response.json(
      { error: 'Invalid quiz data' },
      { status: 422 }
    );
  }
}