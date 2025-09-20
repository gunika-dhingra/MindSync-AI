'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser, SignInButton } from '@clerk/nextjs';
import { format } from 'date-fns';
import { 
  Calendar, 
  Clock, 
  Edit3, 
  Trash2, 
  Plus, 
  Save, 
  X, 
  Eye,
  BarChart3,
  Download,
  Upload,
  Search,
  Brain
} from 'lucide-react';
import { scheduleStorage, SavedSchedule, exportData, importData } from '@/lib/auth';
import ScheduleDisplay from '@/components/ScheduleDisplay';
import Header from '@/components/Header';

export default function SchedulesPage() {
  const { user, isLoaded } = useUser();
  const [schedules, setSchedules] = useState<SavedSchedule[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<SavedSchedule | null>(null);
  const [editingSchedule, setEditingSchedule] = useState<SavedSchedule | null>(null);
  const [editName, setEditName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const handleScheduleUpdate = (updatedPlan: any) => {
    if (selectedSchedule) {
      const updatedSchedule = scheduleStorage.update(selectedSchedule.id, {
        plan: updatedPlan,
        updatedAt: new Date().toISOString()
      });
      
      if (updatedSchedule) {
        // Update in the schedules list
        setSchedules(prev => prev.map(s => 
          s.id === selectedSchedule.id ? updatedSchedule : s
        ));
        
        // Update selected schedule
        setSelectedSchedule(updatedSchedule);
      }
    }
  };

  const handleProfileUpdate = (updatedProfile: any) => {
    // For now, we'll just log this as profile updates are global
    console.log('Profile update requested:', updatedProfile);
    // Could implement profile storage/update logic here
  };

  const loadSchedules = () => {
    const saved = scheduleStorage.getAll();
    setSchedules(saved.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
    setIsLoading(false);
  };

  useEffect(() => {
    // Load schedules from localStorage only after user is loaded
    if (isLoaded && user) {
        const saved = scheduleStorage.getAll();
      loadSchedules();
      
      // Listen for storage changes
      const handleStorageChange = () => loadSchedules();
      window.addEventListener('storage', handleStorageChange);
      
      return () => window.removeEventListener('storage', handleStorageChange);
    }
  }, [isLoaded, user]);

  const filteredSchedules = schedules.filter((schedule: SavedSchedule) =>
    schedule.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    format(new Date(schedule.date), 'EEEE, MMMM d, yyyy').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = (schedule: SavedSchedule) => {
    setEditingSchedule(schedule);
    setEditName(schedule.name);
  };

  const handleSaveEdit = () => {
    if (editingSchedule && editName.trim()) {
      const updated = scheduleStorage.update(editingSchedule.id, { name: editName.trim() });
      if (updated) {
        setSchedules(prev => prev.map(s => s.id === updated.id ? updated : s));
        if (selectedSchedule?.id === updated.id) {
          setSelectedSchedule(updated);
        }
      }
      setEditingSchedule(null);
      setEditName('');
    }
  };

  const handleDelete = (schedule: SavedSchedule) => {
    if (confirm(`Are you sure you want to delete "${schedule.name}"?`)) {
      scheduleStorage.delete(schedule.id);
      setSchedules(prev => prev.filter(s => s.id !== schedule.id));
      if (selectedSchedule?.id === schedule.id) {
        setSelectedSchedule(null);
      }
    }
  };

  const handleExport = () => {
    const data = exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mindsync-data-${format(new Date(), 'yyyy-MM-dd')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          importData(data);
          const saved = scheduleStorage.getAll();
          setSchedules(saved.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
          alert('Data imported successfully!');
        } catch (error) {
          alert('Error importing data. Please check the file format.');
        }
      };
      reader.readAsText(file);
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <Header />
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-16 h-16 mx-auto mb-4"
            >
              <Brain className="w-full h-full text-blue-600" />
            </motion.div>
            <h2 className="text-xl font-semibold text-gray-700">Loading your schedules...</h2>
          </motion.div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <Header />
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h2>
            <p className="text-gray-600 mb-6">Please sign in to view your schedules</p>
            <SignInButton mode="modal">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Go to Sign In
              </motion.button>
            </SignInButton>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <Header />
      <div className="p-4">
        <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold gradient-text mb-2">My Schedules</h1>
              <p className="text-gray-600">Manage and review your saved task schedules</p>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={handleExport}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Export</span>
              </button>
              
              <label className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer">
                <Upload className="w-4 h-4" />
                <span>Import</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search schedules..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Schedules List */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-1"
          >
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <Calendar className="w-5 h-5 mr-2 text-blue-600" />
                Saved Schedules ({filteredSchedules.length})
              </h2>
              
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : filteredSchedules.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                  <p>No schedules found</p>
                  <p className="text-sm mt-2">Create your first schedule to get started!</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  <AnimatePresence>
                    {filteredSchedules.map((schedule, index) => (
                      <motion.div
                        key={schedule.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ delay: index * 0.1 }}
                        className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 group ${
                          selectedSchedule?.id === schedule.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                        }`}
                        onClick={() => setSelectedSchedule(schedule)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            {editingSchedule?.id === schedule.id ? (
                              <div className="flex items-center space-x-2">
                                <input
                                  type="text"
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                  className="flex-1 text-sm font-medium border border-gray-300 rounded px-2 py-1"
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveEdit();
                                    if (e.key === 'Escape') {
                                      setEditingSchedule(null);
                                      setEditName('');
                                    }
                                  }}
                                  autoFocus
                                />
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSaveEdit();
                                  }}
                                  className="text-green-600 hover:text-green-700"
                                >
                                  <Save className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingSchedule(null);
                                    setEditName('');
                                  }}
                                  className="text-gray-600 hover:text-gray-700"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <>
                                <h3 className="font-medium text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                                  {schedule.name}
                                </h3>
                                <p className="text-sm text-gray-500 mt-1">
                                  {format(new Date(schedule.date), 'EEEE, MMM d, yyyy')}
                                </p>
                                <div className="flex items-center text-xs text-gray-400 mt-2 space-x-4">
                                  <span className="flex items-center">
                                    <Clock className="w-3 h-3 mr-1" />
                                    {schedule.plan.blocks.length} tasks
                                  </span>
                                  <span className="flex items-center">
                                    <BarChart3 className="w-3 h-3 mr-1" />
                                    {Math.round(schedule.summary.energy_alignment * 100)}% aligned
                                  </span>
                                </div>
                              </>
                            )}
                          </div>
                          
                          {editingSchedule?.id !== schedule.id && (
                            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEdit(schedule);
                                }}
                                className="p-1 text-gray-600 hover:text-blue-600 transition-colors"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(schedule);
                                }}
                                className="p-1 text-gray-600 hover:text-red-600 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </motion.div>

          {/* Schedule Detail */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-2"
          >
            {selectedSchedule ? (
              <ScheduleDisplay
                plan={selectedSchedule.plan}
                summary={selectedSchedule.summary}
                energyProfile={'balanced'}
                onStartOver={() => {
                  window.location.href = '/';
                }}
                onScheduleUpdate={handleScheduleUpdate}
                onProfileUpdate={handleProfileUpdate}
              />
            ) : (
              <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
                <Eye className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">Select a Schedule</h3>
                <p className="text-gray-500">
                  Choose a schedule from the list to view its details and timeline
                </p>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
    </div>
  );
}