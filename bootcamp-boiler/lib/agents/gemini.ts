// lib/agents/gemini.ts - Google Generative AI client setup

import { GoogleGenerativeAI } from '@google/generative-ai';
import { GOOGLE_API_KEY, MODEL } from '../config';

if (!GOOGLE_API_KEY) {
  throw new Error('GOOGLE_API_KEY environment variable is required');
}

const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);

export function getModel() {
  return genAI.getGenerativeModel({ model: MODEL });
}