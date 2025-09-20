'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, Clock, CheckCircle, Loader2, Sparkles, MessageSquare } from 'lucide-react';
import { EnergyProfile, DayPlan, DailySummary } from '@/lib/types';
import { api } from '@/lib/api';
import { taskHistoryStorage } from '@/lib/auth';

interface TaskChatProps {
  profile: EnergyProfile;
  onScheduleGenerated: (plan: DayPlan, summary: DailySummary) => void;
}

interface Message {
  type: 'user' | 'system';
  content: string;
  timestamp: Date;
  id: string;
}

export default function TaskChat({ profile, onScheduleGenerated }: TaskChatProps) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Add initial system message with typing animation
    setIsTyping(true);
    setTimeout(() => {
      setMessages([{
        id: '1',
        type: 'system',
        content: `Great! Your energy profile is "${profile}". Now tell me about the tasks you need to schedule today. You can describe them naturally, like:

• "Finish the quarterly report - about 2 hours - due by 5pm"
• "Review code for the new feature - 45 minutes"  
• "Team meeting at 2pm for 1 hour"
• "Answer emails - 30 minutes"

Just type all your tasks separated by new lines or commas.`,
        timestamp: new Date()
      }]);
      setIsTyping(false);
    }, 1500);
  }, [profile]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [input]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setInput('');
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setIsTyping(true);

    try {
      // Split the input into individual task lines
      const taskLines = userMessage.content
        .split(/[,\n]/)
        .map(line => line.trim())
        .filter(line => line.length > 0);

      if (taskLines.length === 0) {
        throw new Error('Please provide at least one task');
      }

      setTimeout(async () => {
        try {
          const result = await api.plan({
            tasks: taskLines,
            profile,
            day: new Date().toISOString().split('T')[0], // Today
            work_start_h: 9,
            work_end_h: 18
          });
          
          setIsTyping(false);
          
          // Save task history to localStorage
          taskHistoryStorage.save(userMessage.content, profile);
          
          const systemMessage: Message = {
            id: (Date.now() + 1).toString(),
            type: 'system',
            content: `Perfect! I've created your schedule based on your ${profile.replace('_', ' ')} energy profile. Here's what I've planned for you:`,
            timestamp: new Date()
          };
          
          setMessages(prev => [...prev, systemMessage]);
          
          setTimeout(() => {
            onScheduleGenerated(result.plan, result.summary);
          }, 1000);
          
        } catch (error) {
          console.error('Schedule generation error:', error);
          setIsTyping(false);
          
          const errorMessage: Message = {
            id: (Date.now() + 2).toString(),
            type: 'system',
            content: `Sorry, there was an error generating your schedule: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
            timestamp: new Date()
          };
          
          setMessages(prev => [...prev, errorMessage]);
        } finally {
          setIsLoading(false);
        }
      }, 800); // Small delay for better UX
      
    } catch (error) {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const messageVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 500,
        damping: 30
      }
    }
  };

  const typingVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        repeat: Infinity,
        duration: 1.5,
        ease: "easeInOut"
      }
    }
  };

  return (
    <motion.div 
      className="max-w-4xl mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
        {/* Header */}
        <motion.div 
          className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-3">
            <motion.div
              className="bg-white/20 p-2 rounded-lg"
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <MessageSquare className="w-6 h-6" />
            </motion.div>
            <div>
              <h2 className="text-xl font-bold">Task Scheduler Assistant</h2>
              <p className="text-blue-100 text-sm">
                Energy Profile: <span className="font-medium capitalize">{profile.replace('_', ' ')}</span>
              </p>
            </div>
          </div>
        </motion.div>

        {/* Messages Container */}
        <div className="h-96 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-gray-50/50 to-white/50 dark:from-gray-900/50 dark:to-gray-800/50">
          <AnimatePresence>
            {messages.map((message, index) => (
              <motion.div
                key={message.id}
                variants={messageVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex items-start gap-3 max-w-[85%] ${
                  message.type === 'user' ? 'flex-row-reverse' : 'flex-row'
                }`}>
                  {/* Avatar */}
                  <motion.div
                    className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      message.type === 'user'
                        ? 'bg-gradient-to-r from-blue-500 to-purple-600'
                        : 'bg-gradient-to-r from-green-500 to-teal-600'
                    }`}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: index * 0.1 + 0.2 }}
                  >
                    {message.type === 'user' ? (
                      <User className="w-4 h-4 text-white" />
                    ) : (
                      <Bot className="w-4 h-4 text-white" />
                    )}
                  </motion.div>
                  
                  {/* Message Bubble */}
                  <motion.div
                    className={`p-4 rounded-2xl shadow-lg ${
                      message.type === 'user'
                        ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                        : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-600'
                    }`}
                    whileHover={{ scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  >
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">
                      {message.content}
                    </p>
                    <div className={`text-xs mt-2 opacity-70 ${
                      message.type === 'user' ? 'text-blue-100' : 'text-gray-500'
                    }`}>
                      {message.timestamp.toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Typing Indicator */}
          <AnimatePresence>
            {isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex justify-start"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-green-500 to-teal-600 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 p-4 rounded-2xl shadow-lg">
                    <div className="flex items-center space-x-2">
                      <motion.div
                        variants={typingVariants}
                        initial="hidden"
                        animate="visible"
                      >
                        <Sparkles className="w-4 h-4 text-blue-500" />
                      </motion.div>
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        Creating your optimal schedule...
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={messagesEndRef} />
        </div>

        {/* Input Form */}
        <motion.form 
          onSubmit={handleSubmit} 
          className="p-6 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border-t border-gray-200 dark:border-gray-600"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex gap-3 items-end">
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe your tasks for today..."
                className="w-full px-4 py-3 pr-12 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 transition-all duration-200 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 resize-none"
                rows={1}
                disabled={isLoading}
                style={{ minHeight: '48px' }}
              />
              {input && (
                <motion.div
                  className="absolute right-3 top-3 text-gray-400"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <Clock className="w-4 h-4" />
                </motion.div>
              )}
            </div>
            
            <motion.button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-semibold shadow-lg hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              whileHover={{ scale: (!input.trim() || isLoading) ? 1 : 1.05 }}
              whileTap={{ scale: (!input.trim() || isLoading) ? 1 : 0.95 }}
            >
              {isLoading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <Loader2 className="w-5 h-5" />
                </motion.div>
              ) : (
                <Send className="w-5 h-5" />
              )}
            </motion.button>
          </div>
          
          <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            <span>Press </span>
            <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-600 rounded text-xs">Enter</kbd>
            <span> to send, </span>
            <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-600 rounded text-xs">Shift+Enter</kbd>
            <span> for new line</span>
          </div>
        </motion.form>
      </div>
    </motion.div>
  );
}