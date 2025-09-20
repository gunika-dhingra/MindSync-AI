'use client';

import { useState } from 'react';
import { EnergyProfile, DayPlan, DailySummary, QuizResult } from '@/lib/types';
import EnergyQuiz from '@/components/EnergyQuiz';
import TaskChat from '@/components/TaskChat';
import ScheduleDisplay from '@/components/ScheduleDisplay';

export default function Home() {
  const [currentStep, setCurrentStep] = useState<'quiz' | 'chat' | 'schedule'>('quiz');
  const [energyProfile, setEnergyProfile] = useState<EnergyProfile | null>(null);
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);
  const [dayPlan, setDayPlan] = useState<DayPlan | null>(null);
  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null);

  const handleProfileResult = (result: QuizResult) => {
    setQuizResult(result);
    setEnergyProfile(result.profile);
    setCurrentStep('chat');
  };

  const handleScheduleGenerated = (plan: DayPlan, summary: DailySummary) => {
    setDayPlan(plan);
    setDailySummary(summary);
    setCurrentStep('schedule');
  };

  const handleStartOver = () => {
    setCurrentStep('quiz');
    setEnergyProfile(null);
    setQuizResult(null);
    setDayPlan(null);
    setDailySummary(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-2">
            MindSync AI
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Intelligent task scheduling that adapts to your energy patterns
          </p>
        </header>

        {/* Progress indicator */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-4">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
              currentStep === 'quiz' ? 'bg-blue-500 border-blue-500 text-white' : 
              energyProfile ? 'bg-green-500 border-green-500 text-white' : 
              'border-gray-300 text-gray-300'
            }`}>
              1
            </div>
            <div className={`w-16 h-1 ${energyProfile ? 'bg-green-500' : 'bg-gray-300'}`} />
            <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
              currentStep === 'chat' ? 'bg-blue-500 border-blue-500 text-white' : 
              dayPlan ? 'bg-green-500 border-green-500 text-white' : 
              'border-gray-300 text-gray-300'
            }`}>
              2
            </div>
            <div className={`w-16 h-1 ${dayPlan ? 'bg-green-500' : 'bg-gray-300'}`} />
            <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
              currentStep === 'schedule' ? 'bg-blue-500 border-blue-500 text-white' : 
              'border-gray-300 text-gray-300'
            }`}>
              3
            </div>
          </div>
        </div>

        {/* Step labels */}
        <div className="flex justify-center mb-12">
          <div className="flex items-center space-x-20 text-sm text-gray-600 dark:text-gray-400">
            <span className={currentStep === 'quiz' ? 'font-semibold text-blue-600' : ''}>
              Energy Profile
            </span>
            <span className={currentStep === 'chat' ? 'font-semibold text-blue-600' : ''}>
              Add Tasks
            </span>
            <span className={currentStep === 'schedule' ? 'font-semibold text-blue-600' : ''}>
              Your Schedule
            </span>
          </div>
        </div>

        {/* Main content */}
        <div className="max-w-4xl mx-auto">
          {currentStep === 'quiz' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <EnergyQuiz onComplete={handleProfileResult} />
            </div>
          )}

          {currentStep === 'chat' && energyProfile && quizResult && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <div className="mb-4 p-4 bg-green-50 dark:bg-green-900 rounded-lg">
                <p className="text-green-800 dark:text-green-200 mb-2">
                  ✅ Energy profile detected: <strong>{energyProfile.replace('_', ' ')}</strong>
                </p>
                <p className="text-green-700 dark:text-green-300 text-sm">
                  Confidence: {Math.round(quizResult.confidence * 100)}% | {quizResult.rationale}
                </p>
              </div>
              <TaskChat 
                profile={energyProfile} 
                onScheduleGenerated={handleScheduleGenerated} 
              />
            </div>
          )}

          {currentStep === 'schedule' && dayPlan && dailySummary && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                    Your Optimized Schedule
                  </h2>
                  <button
                    onClick={handleStartOver}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Start Over
                  </button>
                </div>
                <ScheduleDisplay plan={dayPlan} summary={dailySummary} onStartOver={handleStartOver} />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="text-center mt-12 text-gray-500 dark:text-gray-400">
          <p>Powered by AI-driven energy optimization</p>
        </footer>
      </div>
    </div>
  );
}
