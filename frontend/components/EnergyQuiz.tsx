'use client';

import { useState } from 'react';
import { QuizAnswers, QuizResult } from '@/lib/types';
import { api } from '@/lib/api';

interface EnergyQuizProps {
  onComplete: (result: QuizResult) => void;
}

export default function EnergyQuiz({ onComplete }: EnergyQuizProps) {
  const [answers, setAnswers] = useState<QuizAnswers>({
    wake_time: '7',
    peak_block_start: '10',
    night_alert: 2,
    post_lunch_slump: 2,
    ideal_meeting_time: '15'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const result = await api.quiz(answers);
      onComplete(result);
    } catch (error) {
      console.error('Quiz error:', error);
      alert('Error processing quiz. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-sm border">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Energy Profile Quiz</h2>
      <p className="text-gray-600 mb-8">
        Help us understand your natural energy patterns to create better schedules.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            1. What time do you usually wake up?
          </label>
          <input
            type="text"
            placeholder="e.g., 6, 6:30, 8"
            value={answers.wake_time}
            onChange={(e) => setAnswers(prev => ({ ...prev, wake_time: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            2. When do you prefer to start deep work? (hour)
          </label>
          <input
            type="text"
            placeholder="e.g., 9, 10, 16"
            value={answers.peak_block_start}
            onChange={(e) => setAnswers(prev => ({ ...prev, peak_block_start: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            3. How alert are you after 8 PM?
          </label>
          <div className="flex space-x-4">
            {[0, 1, 2, 3, 4, 5].map(val => (
              <label key={val} className="flex items-center">
                <input
                  type="radio"
                  name="night_alert"
                  value={val}
                  checked={answers.night_alert === val}
                  onChange={(e) => setAnswers(prev => ({ ...prev, night_alert: parseInt(e.target.value) }))}
                  className="mr-2"
                />
                <span className="text-sm">{val === 0 ? 'Not at all' : val === 5 ? 'Very alert' : val}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            4. How strong is your post-lunch energy dip?
          </label>
          <div className="flex space-x-4">
            {[0, 1, 2, 3, 4, 5].map(val => (
              <label key={val} className="flex items-center">
                <input
                  type="radio"
                  name="post_lunch_slump"
                  value={val}
                  checked={answers.post_lunch_slump === val}
                  onChange={(e) => setAnswers(prev => ({ ...prev, post_lunch_slump: parseInt(e.target.value) }))}
                  className="mr-2"
                />
                <span className="text-sm">{val === 0 ? 'None' : val === 5 ? 'Very strong' : val}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            5. Best time for meetings? (hour)
          </label>
          <input
            type="text"
            placeholder="e.g., 11, 15"
            value={answers.ideal_meeting_time}
            onChange={(e) => setAnswers(prev => ({ ...prev, ideal_meeting_time: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Processing...' : 'Complete Quiz'}
        </button>
      </form>
    </div>
  );
}