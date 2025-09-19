// lib/agents/parser.ts - Natural language task parsing

import { getModel } from './gemini';
import { Task, TaskDraft } from '../types';

const BASE_RULES = `Return ONLY the fields defined by the schema. 
Convert durations like '2h', '1.5 hours', '45m' to total minutes. 
If explicit time windows appear (e.g., '14:00–14:30', '2pm-3pm', 'today 10:30', 'Fri 11am'), 
set fixed_start/fixed_end accordingly. 
If only a start time is given (e.g., 'at 14:00'), set fixed_start to that time and 
fixed_end = fixed_start + est_minutes. 
Treat any phrase starting with 'due' (e.g., 'due today 4pm', 'due Fri 17:00') 
as a DEADLINE (deadline field), NOT as a fixed start/end. Never set fixed_start/fixed_end from 'due'.`;

const PARSER_PROMPT_LENIENT = `Extract a single Task JSON using this schema: 
title (string), est_minutes (int), deadline (string|null), tags (list[str]), 
notes (string|null), fixed_start (string|null), fixed_end (string|null). 
${BASE_RULES}`;

const PARSER_PROMPT_STRICT = `Extract a single Task JSON using this schema: 
title (string), est_minutes (int), deadline (ISO8601 string|null), tags (list[str]), 
notes (string|null), fixed_start (ISO8601 string|null), fixed_end (string|null). 
${BASE_RULES}
IMPORTANT: Never output words like 'today', 'tomorrow', or 'tonight'. 
Always convert to full ISO 8601 (e.g., '2025-09-17T17:00:00'). 
If a relative day has no time, use 17:00 local time.`;

const TIME_WINDOW_RE = /(?<!\d)(?<h1>\d{1,2})(?::(?<m1>\d{2}))?\s*(?<ampm1>am|pm)?\s*[-–—]\s*(?<h2>\d{1,2})(?::(?<m2>\d{2}))?\s*(?<ampm2>am|pm)?/i;
const SINGLE_TIME_RE = /(?<!\d)(?<h>\d{1,2})(?::(?<m>\d{2}))?\s*(?<ampm>am|pm)?/i;
const DUE_PATTERN = /\bdue\b([^;,.]*)$/i;

function to24h(h: number, ampm?: string): number {
  if (!ampm) return h >= 0 && h <= 23 ? h : h % 24;
  
  const ap = ampm.toLowerCase();
  if (ap === 'am') return h === 12 ? 0 : h;
  return h === 12 ? 12 : h + 12;
}

function parseTimeWindow(text: string, base: Date): [Date | null, Date | null] {
  const match = text.match(TIME_WINDOW_RE);
  if (!match || !match.groups) return [null, null];

  const { h1, m1, ampm1, h2, m2, ampm2 } = match.groups;
  
  const hour1 = to24h(parseInt(h1), ampm1);
  const min1 = parseInt(m1 || '0');
  const hour2 = to24h(parseInt(h2), ampm2);
  const min2 = parseInt(m2 || '0');

  const start = new Date(base);
  start.setHours(hour1, min1, 0, 0);
  
  const end = new Date(base);
  end.setHours(hour2, min2, 0, 0);
  
  if (end <= start) {
    end.setDate(end.getDate() + 1);
  }

  return [start, end];
}

function parseSingleTime(text: string, base: Date): Date | null {
  const match = text.match(SINGLE_TIME_RE);
  if (!match || !match.groups) return null;

  const { h, m, ampm } = match.groups;
  const hour = to24h(parseInt(h), ampm);
  const min = parseInt(m || '0');

  const result = new Date(base);
  result.setHours(hour, min, 0, 0);
  return result;
}

function normalizeRelativeWord(s?: string, defaultHour: number = 17): Date | null {
  if (!s) return null;
  
  const txt = s.trim().toLowerCase();
  const now = new Date();
  
  if (txt === 'today') {
    const result = new Date(now);
    result.setHours(defaultHour, 0, 0, 0);
    return result;
  }
  
  if (txt === 'tomorrow' || txt === 'tmr') {
    const result = new Date(now);
    result.setDate(result.getDate() + 1);
    result.setHours(defaultHour, 0, 0, 0);
    return result;
  }
  
  try {
    return new Date(s.replace('Z', '+00:00'));
  } catch {
    return null;
  }
}

function extractDueDeadline(rawText: string, planDay: Date): Date | null {
  const match = rawText.match(DUE_PATTERN);
  if (!match) return null;
  
  const frag = match[1].trim();
  try {
    const baseDay = new Date(planDay);
    baseDay.setHours(0, 0, 0, 0);
    return new Date(frag) || null; // Simple parsing attempt
  } catch {
    return null;
  }
}

function inferBaseFromText(rawText: string): Date {
  const t = rawText.toLowerCase();
  const now = new Date();
  
  if (t.includes('tomorrow') || t.includes('tmr')) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  }
  
  return now;
}

function finalizeTask(rawText: string, draft: TaskDraft): Task {
  const base = inferBaseFromText(rawText);

  let fsDate = normalizeRelativeWord(draft.fixed_start);
  let feDate = normalizeRelativeWord(draft.fixed_end);
  
  if (!fsDate && !feDate) {
    [fsDate, feDate] = parseTimeWindow(rawText, base);
  }
  
  if (!fsDate && !feDate) {
    fsDate = parseSingleTime(rawText, base);
  }
  
  if (fsDate && !feDate) {
    feDate = new Date(fsDate.getTime() + (draft.est_minutes || 30) * 60 * 1000);
  }

  let dlDate = normalizeRelativeWord(draft.deadline);
  if (!dlDate && draft.deadline) {
    const maybe = parseSingleTime(draft.deadline, base);
    dlDate = maybe || dlDate;
  }

  // Enforce "due ..." in original text as DEADLINE
  const extraDue = extractDueDeadline(rawText, base);
  if (extraDue) {
    dlDate = extraDue;
    
    // Remove fixed times if they likely came from 'due' parsing
    const hasWindow = TIME_WINDOW_RE.test(rawText);
    const hasExplicitStart = /\b(at|start|from)\b/i.test(rawText);
    if (!hasWindow && !hasExplicitStart) {
      fsDate = null;
      feDate = null;
    }
  }

  return {
    title: draft.title,
    est_minutes: draft.est_minutes || 30,
    deadline: dlDate || undefined,
    tags: draft.tags || [],
    notes: draft.notes || undefined,
    fixed_start: fsDate || undefined,
    fixed_end: feDate || undefined,
  };
}

export async function parseTask(rawText: string): Promise<Task> {
  try {
    const model = getModel();
    
    // Try lenient parsing first
    const lenientPrompt = `${PARSER_PROMPT_LENIENT}\n\nRaw text: ${rawText}\n\nRespond with valid JSON only:`;
    const lenientResult = await model.generateContent(lenientPrompt);
    const lenientText = lenientResult.response.text();
    
    try {
      const draft: TaskDraft = JSON.parse(lenientText);
      return finalizeTask(rawText, draft);
    } catch {
      // Fall back to strict parsing
      const strictPrompt = `${PARSER_PROMPT_STRICT}\n\nRaw text: ${rawText}\n\nRespond with valid JSON only:`;
      const strictResult = await model.generateContent(strictPrompt);
      const strictText = strictResult.response.text();
      
      const draft2: TaskDraft = JSON.parse(strictText);
      return finalizeTask(rawText, draft2);
    }
  } catch (error) {
    console.error('Parsing error:', error);
    // Fallback to basic task
    return {
      title: rawText,
      est_minutes: 30,
      tags: [],
    };
  }
}