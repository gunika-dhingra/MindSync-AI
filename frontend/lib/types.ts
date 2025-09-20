// lib/types.ts - Core type definitions for MindSync AI

export type EnergyProfile = "morning_lark" | "balanced" | "night_owl";
export type Effort = "low" | "medium" | "high";

export interface Task {
  title: string;
  est_minutes: number;
  deadline?: Date;
  tags: string[];
  notes?: string;
  effort?: Effort;
  confidence?: number;
  fixed_start?: Date;
  fixed_end?: Date;
}

export interface Block {
  task_title: string;
  start: Date;
  end: Date;
}

export interface DayPlan {
  date: Date;
  blocks: Block[];
}

export interface DailySummary {
  date: Date;
  completion_rate: number;
  energy_alignment: number;
  flow_minutes: number;
  suggestions: string[];
}

export interface QuizAnswers {
  wake_time: string | number;
  peak_block_start: string | number;
  night_alert: number; // 0-5
  post_lunch_slump: number; // 0-5
  ideal_meeting_time: string | number;
}

export interface QuizResult {
  profile: EnergyProfile;
  confidence: number;
  rationale: string;
}

export interface TaskDraft {
  title: string;
  est_minutes: number;
  deadline?: string;
  tags: string[];
  notes?: string;
  fixed_start?: string;
  fixed_end?: string;
}

// API Request/Response Types
export interface PlanRequest {
  tasks: string[];
  day?: string; // YYYY-MM-DD format
  profile?: EnergyProfile;
  work_start_h?: number;
  work_end_h?: number;
}

export interface PlanResponse {
  plan: DayPlan;
  summary: DailySummary;
  profile: EnergyProfile;
}

export interface ParseRequest {
  text: string;
}

export interface ParseResponse {
  task: Task;
}

export interface ClassifyRequest {
  title: string;
  notes?: string;
  est_minutes?: number;
}

// Energy System Types
export type SlotPoint = [Date, number]; // [timestamp, energy_level]
export type Slot = [Date, Date]; // [start, end]