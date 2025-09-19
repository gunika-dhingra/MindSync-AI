// lib/quiz.ts - Energy profile quiz logic

import { EnergyProfile, QuizAnswers, QuizResult } from './types';

function scoreRange(value: number, low: number, high: number): number {
  return low <= value && value <= high ? 1 : 0;
}

function normalizeHourStr(s: string): number {
  const str = s.trim();
  if (str.includes(':')) {
    const [h] = str.split(':', 1);
    return Math.max(0, Math.min(23, parseInt(h, 10)));
  }
  return Math.max(0, Math.min(23, parseInt(str, 10)));
}

export function inferProfile(answers: QuizAnswers): QuizResult {
  const wakeH = normalizeHourStr(String(answers.wake_time));
  const peakH = normalizeHourStr(String(answers.peak_block_start));
  const nightAlert = Number(answers.night_alert);
  const slump = Number(answers.post_lunch_slump);
  const idealMeet = normalizeHourStr(String(answers.ideal_meeting_time));

  let scoreMorning = 0;
  let scoreNight = 0;

  // Wake time scoring
  scoreMorning += scoreRange(wakeH, 5, 7); // Early risers
  scoreNight += scoreRange(wakeH, 9, 11); // Late risers

  // Peak work time scoring
  scoreMorning += scoreRange(peakH, 8, 10); // Morning peak
  scoreNight += scoreRange(peakH, 16, 20); // Evening peak

  // Night alertness
  if (nightAlert >= 4) {
    scoreNight += 1;
  } else if (nightAlert <= 1) {
    scoreMorning += 1;
  }

  // Post-lunch slump
  if (slump >= 4) {
    scoreMorning += 1; // Strong slump suggests morning person
  } else if (slump <= 1) {
    scoreNight += 1; // No slump suggests night person
  }

  // Ideal meeting time
  if (10 <= idealMeet && idealMeet <= 12) {
    scoreMorning += 1;
  }
  if (15 <= idealMeet && idealMeet <= 17) {
    scoreNight += 1;
  }

  // Determine profile
  let profile: EnergyProfile;
  if (scoreMorning - scoreNight >= 2) {
    profile = "morning_lark";
  } else if (scoreNight - scoreMorning >= 2) {
    profile = "night_owl";
  } else {
    profile = "balanced";
  }

  // Calculate confidence
  const margin = Math.abs(scoreMorning - scoreNight);
  const confidence = Math.min(1.0, 0.5 + 0.1 * margin);

  const rationale = `wake=${wakeH}, peak=${peakH}, night_alert=${nightAlert}, slump=${slump}, ideal_meeting=${idealMeet} → scores: morning=${scoreMorning}, night=${scoreNight}`;

  return {
    profile,
    confidence: Math.round(confidence * 100) / 100,
    rationale
  };
}