// lib/agents/scheduler.ts - Energy-aware task scheduling

import { Task, DayPlan, Block, Slot, SlotPoint } from '../types';

function mockBusy(day: Date): Slot[] {
  // Simulate some blocked times
  const start1 = new Date(day);
  start1.setHours(10, 30, 0, 0);
  const end1 = new Date(start1.getTime() + 30 * 60 * 1000);
  
  const start2 = new Date(day);
  start2.setHours(14, 0, 0, 0);
  const end2 = new Date(start2.getTime() + 60 * 60 * 1000);
  
  return [[start1, end1], [start2, end2]];
}

function workdaySlots(day: Date, startH: number = 9, endH: number = 18, stepMin: number = 15): Slot[] {
  const start = new Date(day);
  start.setHours(startH, 0, 0, 0);
  
  const end = new Date(day);
  end.setHours(endH, 0, 0, 0);
  
  const slots: Slot[] = [];
  let t = new Date(start);
  
  while (t < end) {
    const next = new Date(t.getTime() + stepMin * 60 * 1000);
    slots.push([new Date(t), new Date(next)]);
    t = next;
  }
  
  return slots;
}

function overlaps(a: Slot, b: Slot): boolean {
  return !(a[1] <= b[0] || b[1] <= a[0]);
}

function freeSlots(day: Date, busy: Slot[], stepMin: number = 15): Slot[] {
  const allSlots = workdaySlots(day, 9, 18, stepMin);
  return allSlots.filter(s => !busy.some(b => overlaps(s, b)));
}

function slotScores(free: Slot[], curve: SlotPoint[]): Map<Slot, number> {
  const energyLookup = new Map(curve.map(([t, e]) => [t.getTime(), e]));
  const scores = new Map<Slot, number>();
  
  for (const slot of free) {
    const energy = energyLookup.get(slot[0].getTime()) || 0.5;
    scores.set(slot, energy);
  }
  
  return scores;
}

function chunkMinutesForEffort(effort?: string): number {
  switch (effort?.toLowerCase()) {
    case 'high': return 60;
    case 'low': return 30;
    default: return 45;
  }
}

function contiguousSlots(start: Date, minutes: number): Slot[] {
  const steps = Math.max(1, Math.floor(minutes / 15));
  const slots: Slot[] = [];
  
  for (let i = 0; i < steps; i++) {
    const slotStart = new Date(start.getTime() + i * 15 * 60 * 1000);
    const slotEnd = new Date(start.getTime() + (i + 1) * 15 * 60 * 1000);
    slots.push([slotStart, slotEnd]);
  }
  
  return slots;
}

function snapDown15(dt: Date): Date {
  const result = new Date(dt);
  const minutes = Math.floor(result.getMinutes() / 15) * 15;
  result.setMinutes(minutes, 0, 0);
  return result;
}

function snapUp15(dt: Date): Date {
  const result = new Date(dt);
  if (result.getMinutes() % 15 === 0 && result.getSeconds() === 0 && result.getMilliseconds() === 0) {
    return result;
  }
  const delta = 15 - (result.getMinutes() % 15);
  result.setMinutes(result.getMinutes() + delta, 0, 0);
  return result;
}

function clampToWorkday(dt: Date, day: Date, startH: number, endH: number): Date {
  const start = new Date(day);
  start.setHours(startH, 0, 0, 0);
  
  const end = new Date(day);
  end.setHours(endH, 0, 0, 0);
  
  return new Date(Math.max(Math.min(dt.getTime(), end.getTime()), start.getTime()));
}

function mergeAdjacent(plan: DayPlan): DayPlan {
  const merged: Block[] = [];
  const sorted = [...plan.blocks].sort((a, b) => a.start.getTime() - b.start.getTime());
  
  for (const block of sorted) {
    const last = merged[merged.length - 1];
    if (last && last.task_title === block.task_title && last.end.getTime() === block.start.getTime()) {
      last.end = block.end;
    } else {
      merged.push(block);
    }
  }
  
  return { ...plan, blocks: merged };
}

export function greedySchedule(
  tasks: Task[],
  day: Date,
  energyCurve?: SlotPoint[],
  busy?: Slot[],
  workStartH: number = 9,
  workEndH: number = 18,
  stepMin: number = 15
): DayPlan {
  const curve = energyCurve || [];
  const busyList = busy || mockBusy(day);
  
  // Build available slots
  const allWorkSlots = workdaySlots(day, workStartH, workEndH, stepMin);
  const free = allWorkSlots.filter(s => !busyList.some(b => overlaps(s, b)));
  const scores = slotScores(free, curve);
  
  const plan: DayPlan = { date: day, blocks: [] };
  const used = new Set<string>();
  
  // Handle fixed-time tasks first
  const fixed: Array<[Task, Date?, Date?]> = [];
  const flexible: Task[] = [];
  
  for (const task of tasks) {
    if (task.fixed_start || task.fixed_end) {
      let fs = task.fixed_start ? snapDown15(task.fixed_start) : undefined;
      let fe = task.fixed_end ? snapUp15(task.fixed_end) : undefined;
      
      if (fs && !fe) {
        fe = new Date(fs.getTime() + Math.max(15, task.est_minutes) * 60 * 1000);
      }
      
      fixed.push([task, fs, fe]);
    } else {
      flexible.push(task);
    }
  }
  
  // Schedule fixed tasks
  for (const [task, fs, fe] of fixed) {
    if (!fs || !fe) continue;
    if (fs.toDateString() !== day.toDateString()) continue;
    
    const clampedStart = clampToWorkday(fs, day, workStartH, workEndH);
    const clampedEnd = clampToWorkday(fe, day, workStartH, workEndH);
    
    if (clampedEnd <= clampedStart) continue;
    
    const minutes = Math.floor((clampedEnd.getTime() - clampedStart.getTime()) / (60 * 1000));
    const needed = contiguousSlots(clampedStart, minutes);
    
    for (const [start, end] of needed) {
      used.add(`${start.getTime()}-${end.getTime()}`);
    }
    
    plan.blocks.push({
      task_title: task.title,
      start: clampedStart,
      end: clampedEnd
    });
  }
  
  // Filter out used slots
  const availableSlots = free.filter(s => !used.has(`${s[0].getTime()}-${s[1].getTime()}`));
  
  if (availableSlots.length === 0 && plan.blocks.length === 0) {
    return plan;
  }
  
  // Sort flexible tasks by deadline, then effort
  const tasksSorted = [...flexible].sort((a, b) => {
    const aDeadline = a.deadline || new Date(day.getTime() + 24 * 60 * 60 * 1000);
    const bDeadline = b.deadline || new Date(day.getTime() + 24 * 60 * 60 * 1000);
    
    if (aDeadline.getTime() !== bDeadline.getTime()) {
      return aDeadline.getTime() - bDeadline.getTime();
    }
    
    const effortRank = { high: 0, medium: 1, low: 2 };
    const aRank = effortRank[a.effort || 'medium'];
    const bRank = effortRank[b.effort || 'medium'];
    return aRank - bRank;
  });
  
  // Score function for task-effort matching
  function scoreForTask(slot: Slot, effort?: string): number {
    const e = scores.get(slot) || 0.5;
    const h = slot[0].getHours();
    
    switch (effort?.toLowerCase()) {
      case 'high':
        return e; // High effort wants high energy
      case 'low':
        const earlyPenalty = h < Math.max(workStartH + 1, 9) ? 0.2 : 0.0;
        return (1.0 - e) - earlyPenalty; // Low effort prefers low energy
      default:
        return 0.5 + 0.5 * e; // Medium effort is flexible
    }
  }
  
  // Schedule flexible tasks
  for (const task of tasksSorted) {
    let remaining = Math.max(15, task.est_minutes);
    const chunk = chunkMinutesForEffort(task.effort);
    
    let latestEnd: Date | undefined;
    if (task.deadline && task.deadline.toDateString() === day.toDateString()) {
      latestEnd = task.deadline;
    }
    
    const freeSorted = [...availableSlots]
      .filter(s => !used.has(`${s[0].getTime()}-${s[1].getTime()}`))
      .sort((a, b) => scoreForTask(b, task.effort) - scoreForTask(a, task.effort));
    
    while (remaining > 0) {
      let placedAny = false;
      
      for (const slot of freeSorted) {
        if (used.has(`${slot[0].getTime()}-${slot[1].getTime()}`)) continue;
        
        let minutes = Math.min(chunk, remaining);
        if (minutes < 30 && remaining >= 30) {
          minutes = 30;
        }
        
        const start = slot[0];
        const end = new Date(start.getTime() + minutes * 60 * 1000);
        
        const clampedStart = clampToWorkday(start, day, workStartH, workEndH);
        const clampedEnd = clampToWorkday(end, day, workStartH, workEndH);
        
        if (clampedEnd <= clampedStart) continue;
        if (latestEnd && clampedEnd > latestEnd) continue;
        
        const needed = contiguousSlots(clampedStart, minutes);
        const allAvailable = needed.every(([s, e]) => 
          !used.has(`${s.getTime()}-${e.getTime()}`) &&
          availableSlots.some(([as, ae]) => as.getTime() === s.getTime() && ae.getTime() === e.getTime())
        );
        
        if (!allAvailable) continue;
        
        // Mark slots as used
        for (const [s, e] of needed) {
          used.add(`${s.getTime()}-${e.getTime()}`);
        }
        
        plan.blocks.push({
          task_title: task.title,
          start: clampedStart,
          end: clampedEnd
        });
        
        remaining -= minutes;
        placedAny = true;
        break;
      }
      
      if (!placedAny) break;
    }
  }
  
  // Sort blocks by start time and merge adjacent ones
  plan.blocks.sort((a, b) => a.start.getTime() - b.start.getTime());
  return mergeAdjacent(plan);
}

export function energyAlignment(plan: DayPlan, curve?: SlotPoint[]): number {
  if (plan.blocks.length === 0) return 0.0;
  
  const energyLookup = new Map((curve || []).map(([t, e]) => [t.getTime(), e]));
  const hiThresh = 0.75;
  let hi = 0;
  let total = 0;
  
  for (const block of plan.blocks) {
    let t = new Date(block.start);
    t.setSeconds(0, 0);
    
    while (t < block.end) {
      total += 15;
      const energy = energyLookup.get(t.getTime()) || 0.0;
      if (energy >= hiThresh) {
        hi += 15;
      }
      t = new Date(t.getTime() + 15 * 60 * 1000);
    }
  }
  
  return total === 0 ? 0.0 : Math.round((hi / total) * 100) / 100;
}