// lib/energy.ts - Energy curve generation

import { EnergyProfile, SlotPoint } from './types';

function curveFromPeaks(
  day: Date,
  peaks: Array<[number, number, number]>, // [start_hour, end_hour, energy]
  base: number = 0.3
): SlotPoint[] {
  const start = new Date(day);
  start.setHours(6, 0, 0, 0);
  
  const points: SlotPoint[] = [];
  
  for (let i = 0; i < 96; i++) { // 15-min intervals for 24 hours starting at 6am
    const t = new Date(start.getTime() + i * 15 * 60 * 1000);
    const h = t.getHours() + t.getMinutes() / 60.0;
    
    let e = base;
    for (const [hs, he, val] of peaks) {
      if (hs <= h && h < he) {
        e = Math.max(e, val);
      }
    }
    
    // Common post-lunch dip
    if (13 <= h && h < 14) {
      e = Math.min(e, 0.25);
    }
    
    points.push([t, Math.round(e * 1000) / 1000]);
  }
  
  return points;
}

export function energyCurveFor(day: Date, profile: EnergyProfile = "balanced"): SlotPoint[] {
  if (profile === "morning_lark") {
    return curveFromPeaks(day, [[8, 11, 0.95], [16, 18, 0.8]]);
  } else if (profile === "night_owl") {
    return curveFromPeaks(day, [[10, 12, 0.6], [17, 21, 0.95]]);
  } else { // balanced
    return curveFromPeaks(day, [[9, 11, 0.85], [16, 18, 0.8]]);
  }
}