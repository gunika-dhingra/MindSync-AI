'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Clock, Moon, Coffee, Users, ArrowRight, Sparkles } from 'lucide-react';
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
  const [currentQuestion, setCurrentQuestion] = useState(0);

  const questions = [
    {
      id: 'wake_time',
      icon: Clock,
      title: 'What time do you usually wake up?',
      subtitle: 'This helps us understand your natural sleep-wake cycle',
      type: 'text' as const,
      placeholder: 'e.g., 6:30, 7, 8:15',
      color: 'from-orange-400 to-pink-400'
    },
    {
      id: 'peak_block_start',
      icon: Brain,
      title: 'When do you prefer to start deep work?',
      subtitle: 'What hour of the day feels most productive for focused tasks?',
      type: 'text' as const,
      placeholder: 'e.g., 9, 10, 16',
      color: 'from-purple-400 to-blue-400'
    },
    {
      id: 'night_alert',
      icon: Moon,
      title: 'How alert are you after 8 PM?',
      subtitle: 'Rate your evening energy levels',
      type: 'scale' as const,
      options: [
        { value: 0, label: 'Sleepy' },
        { value: 1, label: 'Low' },
        { value: 2, label: 'Moderate' },
        { value: 3, label: 'Good' },
        { value: 4, label: 'High' },
        { value: 5, label: 'Very Alert' }
      ],
      color: 'from-indigo-400 to-purple-400'
    },
    {
      id: 'post_lunch_slump',
      icon: Coffee,
      title: 'How strong is your post-lunch energy dip?',
      subtitle: 'Do you experience an afternoon slump?',
      type: 'scale' as const,
      options: [
        { value: 0, label: 'None' },
        { value: 1, label: 'Minimal' },
        { value: 2, label: 'Slight' },
        { value: 3, label: 'Moderate' },
        { value: 4, label: 'Strong' },
        { value: 5, label: 'Very Strong' }
      ],
      color: 'from-amber-400 to-orange-400'
    },
    {
      id: 'ideal_meeting_time',
      icon: Users,
      title: 'Best time for meetings?',
      subtitle: 'When do you feel most engaged in discussions?',
      type: 'text' as const,
      placeholder: 'e.g., 11, 15',
      color: 'from-green-400 to-teal-400'
    }
  ];

  const currentQ = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      handleSubmit();
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      const result = await api.quiz(answers);
      onComplete(result);
    } catch (error) {
      console.error('Quiz error:', error);
      alert('Error processing quiz. Please try again.');
      setIsSubmitting(false);
    }
  };

  const isAnswered = () => {
    const answer = answers[currentQ.id as keyof QuizAnswers];
    if (currentQ.type === 'text') {
      return answer && answer.toString().trim() !== '';
    }
    return answer !== undefined && answer !== null;
  };

  const containerVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.4,
        ease: "easeOut",
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.3 }
    }
  };

  const questionVariants = {
    enter: { x: 50, opacity: 0 },
    center: { x: 0, opacity: 1 },
    exit: { x: -50, opacity: 0 }
  };

  return (
    <motion.div 
      className="max-w-2xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div className="text-center mb-8" variants={itemVariants}>
        <motion.div
          className="flex justify-center mb-4"
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className={`bg-gradient-to-r ${currentQ.color} p-4 rounded-full shadow-lg`}>
            <Brain className="w-8 h-8 text-white" />
          </div>
        </motion.div>
        
        <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
          Energy Profile Quiz
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          Help us understand your natural energy patterns for better scheduling
        </p>
      </motion.div>

      {/* Progress Bar */}
      <motion.div variants={itemVariants} className="mb-8">
        <div className="flex justify-between text-sm text-gray-500 mb-2">
          <span>Question {currentQuestion + 1} of {questions.length}</span>
          <span>{Math.round(progress)}% complete</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <motion.div
            className={`bg-gradient-to-r ${currentQ.color} h-2 rounded-full`}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
      </motion.div>

      {/* Question Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestion}
          variants={questionVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.3 }}
          className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 mb-6"
        >
          <div className="flex items-start gap-4 mb-6">
            <motion.div
              className={`bg-gradient-to-r ${currentQ.color} p-3 rounded-xl shadow-lg`}
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <currentQ.icon className="w-6 h-6 text-white" />
            </motion.div>
            <div>
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
                {currentQ.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                {currentQ.subtitle}
              </p>
            </div>
          </div>

          {/* Question Input */}
          <div className="space-y-4">
            {currentQ.type === 'text' ? (
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2 }}
              >
                <input
                  type="text"
                  placeholder={currentQ.placeholder}
                  value={answers[currentQ.id as keyof QuizAnswers]?.toString() || ''}
                  onChange={(e) => setAnswers(prev => ({ 
                    ...prev, 
                    [currentQ.id]: currentQ.id.includes('time') ? e.target.value : e.target.value
                  }))}
                  className="w-full px-4 py-4 text-lg bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 transition-all duration-200 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  autoFocus
                />
              </motion.div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {currentQ.options?.map((option, index) => (
                  <motion.button
                    key={option.value}
                    type="button"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => setAnswers(prev => ({ 
                      ...prev, 
                      [currentQ.id]: option.value 
                    }))}
                    className={`p-4 rounded-xl border-2 transition-all duration-200 text-center ${
                      answers[currentQ.id as keyof QuizAnswers] === option.value
                        ? `border-transparent bg-gradient-to-r ${currentQ.color} text-white shadow-lg`
                        : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <div className="text-lg font-semibold">{option.value}</div>
                    <div className="text-xs mt-1">{option.label}</div>
                  </motion.button>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <motion.div 
        className="flex justify-between items-center"
        variants={itemVariants}
      >
        <motion.button
          onClick={handlePrevious}
          disabled={currentQuestion === 0}
          className="px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-gray-600"
          whileHover={{ scale: currentQuestion === 0 ? 1 : 1.05 }}
          whileTap={{ scale: currentQuestion === 0 ? 1 : 0.95 }}
        >
          Previous
        </motion.button>

        <div className="flex gap-2">
          {questions.map((_, index) => (
            <motion.div
              key={index}
              className={`w-2 h-2 rounded-full ${
                index === currentQuestion
                  ? `bg-gradient-to-r ${currentQ.color}`
                  : index < currentQuestion
                  ? 'bg-green-500'
                  : 'bg-gray-300'
              }`}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: index * 0.05 }}
            />
          ))}
        </div>

        <motion.button
          onClick={handleNext}
          disabled={!isAnswered() || isSubmitting}
          className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
            currentQuestion === questions.length - 1
              ? `bg-gradient-to-r ${currentQ.color} text-white shadow-lg hover:shadow-xl`
              : `bg-gradient-to-r ${currentQ.color} text-white shadow-lg hover:shadow-xl`
          }`}
          whileHover={{ scale: (!isAnswered() || isSubmitting) ? 1 : 1.05 }}
          whileTap={{ scale: (!isAnswered() || isSubmitting) ? 1 : 0.95 }}
        >
          <div className="flex items-center gap-2">
            {isSubmitting ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <Sparkles className="w-4 h-4" />
                </motion.div>
                Processing...
              </>
            ) : currentQuestion === questions.length - 1 ? (
              <>
                Complete Quiz
                <Sparkles className="w-4 h-4" />
              </>
            ) : (
              <>
                Next
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </div>
        </motion.button>
      </motion.div>
    </motion.div>
  );
}