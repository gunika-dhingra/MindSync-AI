'use client';

import { useState } from 'react';
import { EnergyProfile, DayPlan, DailySummary } from '@/lib/types';
import { api } from '@/lib/api';

interface TaskChatProps {
  profile: EnergyProfile;
  onScheduleGenerated: (plan: DayPlan, summary: DailySummary) => void;
}

export default function TaskChat({ profile, onScheduleGenerated }: TaskChatProps) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Array<{ type: 'user' | 'system'; content: string }>>([
    { 
      type: 'system', 
      content: `Great! Your energy profile is "${profile}". Now tell me about the tasks you need to schedule today. You can describe them naturally, like:

• "Finish the quarterly report - about 2 hours - due by 5pm"
• "Review code for the new feature - 45 minutes"
• "Team meeting at 2pm for 1 hour"
• "Answer emails - 30 minutes"

Just type all your tasks separated by new lines or commas.` 
    }
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { type: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      // Split the input into individual task lines
      const taskLines = userMessage
        .split(/[,\n]/)
        .map(line => line.trim())
        .filter(line => line.length > 0);

      if (taskLines.length === 0) {
        throw new Error('Please provide at least one task');
      }

      const result = await api.plan({
        tasks: taskLines,
        profile,
        day: new Date().toISOString().split('T')[0], // Today
        work_start_h: 9,
        work_end_h: 18
      });
      
      setMessages(prev => [...prev, { 
        type: 'system', 
        content: `Perfect! I've created your schedule based on your ${profile} energy profile. Here's what I've planned for you:` 
      }]);

      onScheduleGenerated(result.plan, result.summary);
    } catch (error) {
      console.error('Schedule generation error:', error);
      setMessages(prev => [...prev, { 
        type: 'system', 
        content: `Sorry, there was an error generating your schedule: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.` 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-sm border min-h-[400px] flex flex-col">
        <div className="p-4 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Task Scheduler Chat</h2>
          <p className="text-sm text-gray-600">Energy Profile: <span className="font-medium capitalize">{profile.replace('_', ' ')}</span></p>
        </div>

        <div className="flex-1 p-4 space-y-4 overflow-y-auto">
          {messages.map((message, index) => (
            <div key={index} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] p-3 rounded-lg ${
                message.type === 'user' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-900'
              }`}>
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 text-gray-900 p-3 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                  <span>Creating your optimal schedule...</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-4 border-t">
          <div className="flex space-x-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe your tasks for today..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={3}
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}