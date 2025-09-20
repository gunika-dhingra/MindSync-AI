'use client';

import { DayPlan, DailySummary, Block } from '@/lib/types';
import { format } from 'date-fns';

interface ScheduleDisplayProps {
  plan: DayPlan;
  summary: DailySummary;
  onStartOver: () => void;
}

export default function ScheduleDisplay({ plan, summary, onStartOver }: ScheduleDisplayProps) {
  const formatTime = (date: Date) => {
    return format(new Date(date), 'HH:mm');
  };

  const formatDuration = (start: Date, end: Date) => {
    const diffMinutes = Math.round((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60));
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;
    
    if (hours === 0) return `${minutes}m`;
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}m`;
  };

  const getEffortColor = (taskTitle: string): string => {
    // Simple heuristic based on task title keywords
    const title = taskTitle.toLowerCase();
    if (title.includes('report') || title.includes('analysis') || title.includes('design') || title.includes('research') || title.includes('prototype')) {
      return 'bg-red-100 border-red-300 text-red-800'; // High effort
    }
    if (title.includes('email') || title.includes('call') || title.includes('quick') || title.includes('admin')) {
      return 'bg-green-100 border-green-300 text-green-800'; // Low effort
    }
    return 'bg-yellow-100 border-yellow-300 text-yellow-800'; // Medium effort
  };

  const getAlignmentScore = () => {
    const score = summary.energy_alignment;
    if (score >= 0.8) return { color: 'text-green-600', label: 'Excellent' };
    if (score >= 0.6) return { color: 'text-yellow-600', label: 'Good' };
    if (score >= 0.4) return { color: 'text-orange-600', label: 'Fair' };
    return { color: 'text-red-600', label: 'Poor' };
  };

  const alignmentInfo = getAlignmentScore();

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <h3 className="text-sm font-medium text-gray-600">Energy Alignment</h3>
          <div className="mt-2 flex items-baseline">
            <span className={`text-2xl font-bold ${alignmentInfo.color}`}>
              {Math.round(summary.energy_alignment * 100)}%
            </span>
            <span className={`ml-2 text-sm ${alignmentInfo.color}`}>
              {alignmentInfo.label}
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <h3 className="text-sm font-medium text-gray-600">Total Focus Time</h3>
          <div className="mt-2">
            <span className="text-2xl font-bold text-gray-900">
              {Math.round(summary.flow_minutes / 60)}h {summary.flow_minutes % 60}m
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <h3 className="text-sm font-medium text-gray-600">Scheduled Tasks</h3>
          <div className="mt-2">
            <span className="text-2xl font-bold text-gray-900">
              {plan.blocks.length}
            </span>
          </div>
        </div>
      </div>

      {/* Schedule Timeline */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="p-4 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Your Schedule for {format(new Date(plan.date), 'EEEE, MMMM d')}</h2>
        </div>

        <div className="p-4">
          {plan.blocks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No tasks scheduled for this day.
            </div>
          ) : (
            <div className="space-y-3">
              {plan.blocks.map((block: Block, index: number) => (
                <div key={index} className={`flex items-center p-3 rounded-lg border-l-4 ${getEffortColor(block.task_title)}`}>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{block.task_title}</h4>
                      <span className="text-sm font-medium">
                        {formatDuration(block.start, block.end)}
                      </span>
                    </div>
                    <p className="text-sm opacity-75 mt-1">
                      {formatTime(block.start)} - {formatTime(block.end)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Suggestions */}
      {summary.suggestions.length > 0 && (
        <div className="bg-blue-50 rounded-lg border border-blue-200">
          <div className="p-4">
            <h3 className="text-lg font-medium text-blue-900 mb-3">💡 Optimization Tips</h3>
            <ul className="space-y-2">
              {summary.suggestions.map((suggestion, index) => (
                <li key={index} className="text-blue-800 flex items-start">
                  <span className="w-2 h-2 bg-blue-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Task Effort Levels</h4>
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-red-100 border border-red-300 rounded mr-2"></div>
            <span>High effort (deep work)</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded mr-2"></div>
            <span>Medium effort</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-green-100 border border-green-300 rounded mr-2"></div>
            <span>Low effort (admin)</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-center">
        <button
          onClick={onStartOver}
          className="px-6 py-3 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
        >
          Create New Schedule
        </button>
      </div>
    </div>
  );
}