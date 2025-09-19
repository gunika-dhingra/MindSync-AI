// lib/agents/classifier.ts - Task effort classification

import { getModel } from './gemini';
import { Task } from '../types';

const CLASSIFIER_PROMPT = `You are a cognitive effort classifier for tasks.
Return one of low|medium|high and a confidence 0–1.
Guidelines:
- Deep work (reports, coding, analysis, research, design) → high.
- Meetings, reviews, writing short notes → medium.
- Email, quick calls, errands, admin → low.
Only classify based on the given title and notes.`;

export async function classifyEffort(task: Task): Promise<Task> {
  try {
    const model = getModel();
    const prompt = `${CLASSIFIER_PROMPT}\n\nTask: ${task.title}\nNotes: ${task.notes || ''}`;
    
    const result = await model.generateContent(prompt);
    const text = (result.response.text() || '').toLowerCase();

    let effort: Task['effort'] = 'medium';
    let confidence = 0.6;

    if (text.includes('high')) {
      effort = 'high';
      confidence = 0.8;
    } else if (text.includes('low')) {
      effort = 'low';
      confidence = 0.7;
    } else if (text.includes('medium')) {
      effort = 'medium';
      confidence = 0.7;
    }

    // Keyword-based overrides
    const taskText = (task.title + ' ' + (task.notes || '')).toLowerCase();
    const highKeywords = ['report', 'analysis', 'prototype', 'research', 'design', 'study'];
    if (highKeywords.some(k => taskText.includes(k))) {
      effort = 'high';
      confidence = Math.max(confidence, 0.85);
    }

    const lowKeywords = ['email', 'call', 'text', 'schedule', 'calendar', 'meeting'];
    if (lowKeywords.some(k => taskText.includes(k)) && effort !== 'high') {
      effort = 'low';
      confidence = Math.max(confidence, 0.8);
    }

    return {
      ...task,
      effort,
      confidence
    };
  } catch (error) {
    console.error('Classification error:', error);
    return {
      ...task,
      effort: 'medium',
      confidence: 0.5
    };
  }
}