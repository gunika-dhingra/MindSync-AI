// lib/agents/summarizer.ts - Daily summary generation

import { DayPlan, DailySummary, Block } from '../types';
import { energyAlignment } from './scheduler';

function blockMinutes(block: Block): number {
  return Math.floor((block.end.getTime() - block.start.getTime()) / (60 * 1000));
}

function totalMinutes(plan: DayPlan): number {
  return plan.blocks.reduce((sum, block) => sum + blockMinutes(block), 0);
}

function minutesByTitle(plan: DayPlan): Record<string, number> {
  const byTitle: Record<string, number> = {};
  for (const block of plan.blocks) {
    byTitle[block.task_title] = (byTitle[block.task_title] || 0) + blockMinutes(block);
  }
  return byTitle;
}

function contextSwitches(plan: DayPlan): number {
  let switches = 0;
  for (let i = 1; i < plan.blocks.length; i++) {
    if (plan.blocks[i - 1].task_title !== plan.blocks[i].task_title) {
      switches++;
    }
  }
  return switches;
}

function fragmentedBlocks(plan: DayPlan, minChunk: number = 30): number {
  return plan.blocks.filter(block => blockMinutes(block) < minChunk).length;
}

function lateDeepWork(plan: DayPlan): boolean {
  const deepKeywords = ['report', 'analysis', 'design', 'research', 'prototype', 'spec', 'whitepaper'];
  return plan.blocks.some(block => 
    block.start.getHours() >= 17 && 
    deepKeywords.some(k => block.task_title.toLowerCase().includes(k))
  );
}

function adminNotInDip(plan: DayPlan): boolean {
  const adminKeywords = ['email', 'inbox', 'schedule', 'calendar', 'admin', 'ticket'];
  return plan.blocks.some(block => {
    if (adminKeywords.some(k => block.task_title.toLowerCase().includes(k))) {
      // Check if it's scheduled during lunch dip (13:00-14:00)
      return !(block.start.getHours() === 13 || (block.start.getHours() === 12 && block.end.getHours() === 13));
    }
    return false;
  });
}

function minuteWeightedCompletion(plan: DayPlan, completedTitles: string[]): number {
  const completed = new Set(completedTitles);
  const total = totalMinutes(plan);
  if (total === 0) return 0.0;
  
  const doneMinutes = plan.blocks
    .filter(block => completed.has(block.task_title))
    .reduce((sum, block) => sum + blockMinutes(block), 0);
  
  return Math.round((doneMinutes / total) * 100) / 100;
}

function ruleBasedSuggestions(plan: DayPlan, completion: number, align: number): string[] {
  const tips: string[] = [];
  
  // Energy alignment suggestions
  if (align < 0.5) {
    tips.push("Shift a deep-work block into 09:00–11:00; avoid 13:00–14:00 for focus.");
  } else if (align < 0.7) {
    tips.push("Nudge deep work 30–45 minutes earlier to catch your morning peak.");
  } else {
    tips.push("Keep anchoring deep work in morning peaks; it's paying off.");
  }
  
  // Completion suggestions
  if (completion < 0.6) {
    tips.push("Use 30–45 minute focus blocks with 10-minute buffers; defer non-urgent admin.");
  } else if (completion < 0.8) {
    tips.push("Protect focus blocks from meetings/notifications; add a 15-minute recovery at 15:00.");
  } else {
    tips.push("Great pace—add a short admin sweep at 16:30 to close loops.");
  }
  
  // Plan quality suggestions
  const switches = contextSwitches(plan);
  if (switches >= 4) {
    tips.push("Reduce context switches—batch similar tasks back-to-back.");
  }
  if (fragmentedBlocks(plan) >= 2) {
    tips.push("Avoid fragments—prefer ≥30-minute chunks per block.");
  }
  if (lateDeepWork(plan)) {
    tips.push("Pull deep work earlier; after 17:00 quality usually drops.");
  }
  if (adminNotInDip(plan)) {
    tips.push("Park admin/email in the 13:00–14:00 dip to reserve peaks for focus.");
  }
  
  // Return top 2 unique suggestions
  const final: string[] = [];
  const seen = new Set<string>();
  for (const tip of tips) {
    if (!seen.has(tip)) {
      final.push(tip);
      seen.add(tip);
    }
    if (final.length === 2) break;
  }
  
  return final;
}

export function summarize(plan: DayPlan, completedTitles: string[] = []): DailySummary {
  const completion = minuteWeightedCompletion(plan, completedTitles);
  const align = energyAlignment(plan);
  const flowMinutes = totalMinutes(plan);
  
  const suggestions = ruleBasedSuggestions(plan, completion, align);
  
  return {
    date: plan.date,
    completion_rate: completion,
    energy_alignment: align,
    flow_minutes: flowMinutes,
    suggestions
  };
}