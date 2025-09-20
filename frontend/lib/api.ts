// lib/api.ts - API configuration and client functions

import { QuizAnswers, QuizResult, PlanRequest, PlanResponse, ParseResponse } from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const API_ENDPOINTS = {
  health: `${API_BASE_URL}/health`,
  quiz: `${API_BASE_URL}/profile/quiz`,
  parse: `${API_BASE_URL}/parse`,
  classify: `${API_BASE_URL}/classify`,
  plan: `${API_BASE_URL}/plan`,
} as const;

// API client functions with request/response logging
export async function apiCall<T>(endpoint: string, options?: RequestInit): Promise<T> {
  // Log the request
  console.log(`📤 [API Request] ${options?.method || 'GET'} ${endpoint}`);
  if (options?.body) {
    console.log(`📤 [Request Body]`, JSON.parse(options.body as string));
  }

  const startTime = Date.now();
  
  try {
    const response = await fetch(endpoint, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [API Error] ${response.status} ${response.statusText} (${duration}ms)`);
      console.error(`❌ [Error Response]`, errorText);
      throw new Error(`API Error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log(`📥 [API Response] ${response.status} ${response.statusText} (${duration}ms)`);
    console.log(`📥 [Response Data]`, data);
    
    return data;
  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    console.error(`🚨 [API Network Error] (${duration}ms)`, error);
    throw error;
  }
}

// Typed API functions
export const api = {
  health: () => apiCall<{ ok: boolean; time: string }>(API_ENDPOINTS.health),
  
  quiz: (answers: QuizAnswers) => 
    apiCall<QuizResult>(
      API_ENDPOINTS.quiz, 
      { method: 'POST', body: JSON.stringify(answers) }
    ),
  
  parse: (text: string) => 
    apiCall<ParseResponse>(
      API_ENDPOINTS.parse, 
      { method: 'POST', body: JSON.stringify({ text }) }
    ),
  
  classify: (title: string, notes?: string, est_minutes?: number) => 
    apiCall<ParseResponse>(
      API_ENDPOINTS.classify, 
      { method: 'POST', body: JSON.stringify({ title, notes, est_minutes }) }
    ),
  
  plan: (planRequest: PlanRequest) => 
    apiCall<PlanResponse>(
      API_ENDPOINTS.plan, 
      { method: 'POST', body: JSON.stringify(planRequest) }
    ),
};