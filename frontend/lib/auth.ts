// localStorage utilities for MindSync AI
import { DayPlan, DailySummary, EnergyProfile } from './types';

export interface SavedSchedule {
  id: string;
  name: string;
  date: string;
  plan: DayPlan;
  summary: DailySummary;
  createdAt: string;
  updatedAt: string;
}

export interface UserPreferences {
  energyProfile?: EnergyProfile;
  defaultWorkHours?: {
    start: string;
    end: string;
  };
  notifications?: boolean;
  theme?: 'light' | 'dark' | 'auto';
}

// Schedule Management
export const scheduleStorage = {
  save: (schedule: Omit<SavedSchedule, 'id' | 'createdAt' | 'updatedAt'>): SavedSchedule => {
    const id = `schedule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    
    const savedSchedule: SavedSchedule = {
      ...schedule,
      id,
      createdAt: now,
      updatedAt: now,
    };

    const existing = scheduleStorage.getAll();
    const updated = [...existing, savedSchedule];
    localStorage.setItem('mindsync_schedules', JSON.stringify(updated));
    
    return savedSchedule;
  },

  getAll: (): SavedSchedule[] => {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem('mindsync_schedules');
    return stored ? JSON.parse(stored) : [];
  },

  getById: (id: string): SavedSchedule | null => {
    const schedules = scheduleStorage.getAll();
    return schedules.find(s => s.id === id) || null;
  },

  update: (id: string, updates: Partial<SavedSchedule>): SavedSchedule | null => {
    const schedules = scheduleStorage.getAll();
    const index = schedules.findIndex(s => s.id === id);
    
    if (index === -1) return null;
    
    const updated = {
      ...schedules[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    
    schedules[index] = updated;
    localStorage.setItem('mindsync_schedules', JSON.stringify(schedules));
    
    return updated;
  },

  delete: (id: string): boolean => {
    const schedules = scheduleStorage.getAll();
    const filtered = schedules.filter(s => s.id !== id);
    
    if (filtered.length === schedules.length) return false;
    
    localStorage.setItem('mindsync_schedules', JSON.stringify(filtered));
    return true;
  },

  clear: (): void => {
    localStorage.removeItem('mindsync_schedules');
  }
};

// User Preferences Management
export const preferencesStorage = {
  save: (preferences: UserPreferences): void => {
    localStorage.setItem('mindsync_preferences', JSON.stringify(preferences));
  },

  get: (): UserPreferences => {
    if (typeof window === 'undefined') return {};
    const stored = localStorage.getItem('mindsync_preferences');
    return stored ? JSON.parse(stored) : {};
  },

  update: (updates: Partial<UserPreferences>): UserPreferences => {
    const current = preferencesStorage.get();
    const updated = { ...current, ...updates };
    preferencesStorage.save(updated);
    return updated;
  },

  clear: (): void => {
    localStorage.removeItem('mindsync_preferences');
  }
};

// Task History Management
export interface TaskHistory {
  id: string;
  tasks: string;
  timestamp: string;
  energyProfile?: EnergyProfile;
}

export const taskHistoryStorage = {
  save: (tasks: string, energyProfile?: EnergyProfile): TaskHistory => {
    const id = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const taskHistory: TaskHistory = {
      id,
      tasks,
      timestamp: new Date().toISOString(),
      energyProfile,
    };

    const existing = taskHistoryStorage.getAll();
    const updated = [taskHistory, ...existing].slice(0, 50); // Keep last 50 entries
    localStorage.setItem('mindsync_task_history', JSON.stringify(updated));
    
    return taskHistory;
  },

  getAll: (): TaskHistory[] => {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem('mindsync_task_history');
    return stored ? JSON.parse(stored) : [];
  },

  clear: (): void => {
    localStorage.removeItem('mindsync_task_history');
  }
};

// Utility functions
export const clearAllData = (): void => {
  scheduleStorage.clear();
  preferencesStorage.clear();
  taskHistoryStorage.clear();
};

export const exportData = () => {
  return {
    schedules: scheduleStorage.getAll(),
    preferences: preferencesStorage.get(),
    taskHistory: taskHistoryStorage.getAll(),
    exportedAt: new Date().toISOString(),
  };
};

export const importData = (data: ReturnType<typeof exportData>): void => {
  if (data.schedules) {
    localStorage.setItem('mindsync_schedules', JSON.stringify(data.schedules));
  }
  if (data.preferences) {
    localStorage.setItem('mindsync_preferences', JSON.stringify(data.preferences));
  }
  if (data.taskHistory) {
    localStorage.setItem('mindsync_task_history', JSON.stringify(data.taskHistory));
  }
};