'use client';

import { useState } from 'react';
import { DayPlan, DailySummary, Block, EnergyProfile } from '@/lib/types';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { Clock, Target, Zap, TrendingUp, CheckCircle, Calendar, Timer, Star, Save, BookmarkPlus } from 'lucide-react';
import { scheduleStorage } from '@/lib/auth';
import { useUser } from '@clerk/nextjs';
import FeedbackChat from './FeedbackChat';

interface ScheduleDisplayProps {
  plan: DayPlan;
  summary: DailySummary;
  energyProfile?: EnergyProfile;
  onStartOver: () => void;
  onScheduleUpdate?: (updatedPlan: DayPlan) => void;
  onProfileUpdate?: (updatedProfile: EnergyProfile) => void;
}

export default function ScheduleDisplay({ 
  plan, 
  summary, 
  energyProfile = 'balanced', 
  onStartOver, 
  onScheduleUpdate, 
  onProfileUpdate 
}: ScheduleDisplayProps) {
  const { user } = useUser();
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
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

  const handleSave = async () => {
    if (!user) {
      alert('Please sign in to save schedules');
      return;
    }

    setIsSaving(true);
    try {
      const scheduleName = prompt('Enter a name for this schedule:');
      if (scheduleName) {
        scheduleStorage.save({
          name: scheduleName.trim(),
          date: plan.date instanceof Date ? plan.date.toISOString() : plan.date,
          plan,
          summary,
        });
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (error) {
      console.error('Error saving schedule:', error);
      alert('Error saving schedule. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const alignmentInfo = getAlignmentScore();

  return (
    <motion.div 
      className="max-w-4xl mx-auto p-6 space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Summary Cards */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <motion.div 
          className="bg-white p-6 rounded-xl border shadow-sm hover:shadow-lg transition-all duration-300 group"
          whileHover={{ y: -5, scale: 1.02 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-600">Energy Alignment</h3>
            <Zap className="w-5 h-5 text-blue-500 group-hover:text-blue-600 transition-colors" />
          </div>
          <div className="mt-3 flex items-baseline">
            <motion.span 
              className={`text-3xl font-bold ${alignmentInfo.color}`}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.3 }}
            >
              {Math.round(summary.energy_alignment * 100)}%
            </motion.span>
            <span className={`ml-2 text-sm ${alignmentInfo.color}`}>
              {alignmentInfo.label}
            </span>
          </div>
          <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
            <motion.div 
              className={`h-2 rounded-full ${
                summary.energy_alignment >= 0.8 ? 'bg-green-500' :
                summary.energy_alignment >= 0.6 ? 'bg-yellow-500' :
                summary.energy_alignment >= 0.4 ? 'bg-orange-500' : 'bg-red-500'
              }`}
              initial={{ width: 0 }}
              animate={{ width: `${summary.energy_alignment * 100}%` }}
              transition={{ duration: 1, delay: 0.5 }}
            />
          </div>
        </motion.div>

        <motion.div 
          className="bg-white p-6 rounded-xl border shadow-sm hover:shadow-lg transition-all duration-300 group"
          whileHover={{ y: -5, scale: 1.02 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-600">Total Focus Time</h3>
            <Timer className="w-5 h-5 text-purple-500 group-hover:text-purple-600 transition-colors" />
          </div>
          <div className="mt-3">
            <motion.span 
              className="text-3xl font-bold text-gray-900"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.4 }}
            >
              {Math.round(summary.flow_minutes / 60)}h {summary.flow_minutes % 60}m
            </motion.span>
          </div>
        </motion.div>

        <motion.div 
          className="bg-white p-6 rounded-xl border shadow-sm hover:shadow-lg transition-all duration-300 group"
          whileHover={{ y: -5, scale: 1.02 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-600">Scheduled Tasks</h3>
            <CheckCircle className="w-5 h-5 text-green-500 group-hover:text-green-600 transition-colors" />
          </div>
          <div className="mt-3">
            <motion.span 
              className="text-3xl font-bold text-gray-900"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.5 }}
            >
              {plan.blocks.length}
            </motion.span>
          </div>
        </motion.div>
      </motion.div>

      {/* Schedule Timeline */}
      <motion.div 
        className="bg-white rounded-xl border shadow-sm overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center space-x-3">
            <Calendar className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              Your Schedule for {format(new Date(plan.date), 'EEEE, MMMM d')}
            </h2>
          </div>
        </div>

        <div className="p-6">
          {plan.blocks.length === 0 ? (
            <motion.div 
              className="text-center py-12 text-gray-500"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <Calendar className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p className="text-lg">No tasks scheduled for this day.</p>
              <p className="text-sm mt-2">Create a new schedule to get started!</p>
            </motion.div>
          ) : (
            <div className="space-y-4 relative">
              {/* Timeline line */}
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-200 via-purple-200 to-pink-200"></div>
              
              {plan.blocks.map((block: Block, index: number) => (
                <motion.div 
                  key={index} 
                  className={`relative flex items-center p-4 rounded-xl border-l-4 ${getEffortColor(block.task_title)} hover:shadow-md transition-all duration-300 group`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ 
                    duration: 0.4, 
                    delay: 0.3 + (index * 0.1),
                    type: "spring", 
                    stiffness: 100 
                  }}
                  whileHover={{ x: 5, scale: 1.02 }}
                >
                  {/* Timeline dot */}
                  <motion.div 
                    className="absolute left-[-29px] w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-sm z-10"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5 + (index * 0.1), type: "spring" }}
                    whileHover={{ scale: 1.2 }}
                  />
                  
                  <div className="flex-1 ml-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {block.task_title}
                      </h4>
                      <motion.div 
                        className="flex items-center space-x-2"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.6 + (index * 0.1) }}
                      >
                        <span className="text-sm font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded-md">
                          {formatDuration(block.start, block.end)}
                        </span>
                        <Clock className="w-4 h-4 text-gray-400" />
                      </motion.div>
                    </div>
                    <motion.p 
                      className="text-sm text-gray-600 mt-2 flex items-center space-x-2"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.7 + (index * 0.1) }}
                    >
                      <span>
                        {formatTime(block.start)} - {formatTime(block.end)}
                      </span>
                    </motion.p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* Suggestions */}
      {summary.suggestions.length > 0 && (
        <motion.div 
          className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <div className="p-6">
            <motion.div 
              className="flex items-center space-x-3 mb-4"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
            >
              <TrendingUp className="w-6 h-6 text-blue-600" />
              <h3 className="text-lg font-semibold text-blue-900">💡 Optimization Tips</h3>
            </motion.div>
            <ul className="space-y-3">
              {summary.suggestions.map((suggestion, index) => (
                <motion.li 
                  key={index} 
                  className="text-blue-800 flex items-start group"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + (index * 0.1) }}
                >
                  <motion.div
                    className="w-2 h-2 bg-blue-400 rounded-full mt-2 mr-3 flex-shrink-0 group-hover:bg-blue-600 transition-colors"
                    whileHover={{ scale: 1.5 }}
                  />
                  <span className="leading-relaxed">{suggestion}</span>
                </motion.li>
              ))}
            </ul>
          </div>
        </motion.div>
      )}

      {/* Legend */}
      <motion.div 
        className="bg-gray-50 rounded-xl p-6 border"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        <div className="flex items-center space-x-2 mb-4">
          <Star className="w-5 h-5 text-gray-600" />
          <h4 className="text-sm font-semibold text-gray-700">Task Effort Levels</h4>
        </div>
        <div className="flex flex-wrap gap-6 text-sm">
          <motion.div 
            className="flex items-center group cursor-help"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            whileHover={{ scale: 1.05 }}
          >
            <div className="w-4 h-4 bg-red-100 border border-red-300 rounded mr-3 group-hover:shadow-md transition-shadow"></div>
            <span className="text-gray-700 font-medium">High effort (deep work)</span>
          </motion.div>
          <motion.div 
            className="flex items-center group cursor-help"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            whileHover={{ scale: 1.05 }}
          >
            <div className="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded mr-3 group-hover:shadow-md transition-shadow"></div>
            <span className="text-gray-700 font-medium">Medium effort</span>
          </motion.div>
          <motion.div 
            className="flex items-center group cursor-help"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            whileHover={{ scale: 1.05 }}
          >
            <div className="w-4 h-4 bg-green-100 border border-green-300 rounded mr-3 group-hover:shadow-md transition-shadow"></div>
            <span className="text-gray-700 font-medium">Low effort (admin)</span>
          </motion.div>
        </div>
      </motion.div>

      {/* Actions */}
      <motion.div 
        className="flex justify-center space-x-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        {user && (
          <motion.button
            onClick={handleSave}
            disabled={isSaving}
            className={`px-8 py-4 bg-gradient-to-r text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-300 shadow-lg hover:shadow-xl ${
              saveSuccess 
                ? 'from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 focus:ring-green-500' 
                : 'from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:ring-blue-500'
            }`}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            <span className="flex items-center space-x-2">
              {saveSuccess ? (
                <>
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-semibold">Saved!</span>
                </>
              ) : (
                <>
                  <BookmarkPlus className="w-5 h-5" />
                  <span className="font-semibold">
                    {isSaving ? 'Saving...' : 'Save Schedule'}
                  </span>
                </>
              )}
            </span>
          </motion.button>
        )}
        
        <motion.button
          onClick={onStartOver}
          className="px-8 py-4 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl hover:from-gray-700 hover:to-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-300 shadow-lg hover:shadow-xl"
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
        >
          <span className="flex items-center space-x-2">
            <Target className="w-5 h-5" />
            <span className="font-semibold">Create New Schedule</span>
          </span>
        </motion.button>
      </motion.div>

      {/* Feedback Chat - Only show if user is logged in */}
      {user && (
        <FeedbackChat
          schedule={plan}
          energyProfile={energyProfile}
          onScheduleUpdate={onScheduleUpdate}
          onProfileUpdate={onProfileUpdate}
        />
      )}
    </motion.div>
  );
}