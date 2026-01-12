import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Calendar, Target, Lock, Crown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { readCheckins } from '@/utils/storage';
import { useClerkAuth } from '@/contexts/ClerkAuthContext';
import { getPremiumStatus } from '@/lib/premium';
import { createPageUrl } from '@/utils/urls';
import { generateWeeklyTrends, generateMonthlyTrends, analyzePrayerTrends, calculateCycleConsistency } from '@/utils/visualProgress';

export default function Analytics() {
  const { user } = useClerkAuth();
  const premium = getPremiumStatus(user?.id);
  const navigate = useNavigate();
  
  // Calculate basic stats for preview
  const checkins = readCheckins();
  const entries = Object.entries(checkins);
  const completedDays = entries.filter(([, d]) => d.completed).length;
  const totalDays = entries.length;
  const completionRate = totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0;

  // Premium visual progress data
  const weeklyTrends = premium.active ? generateWeeklyTrends() : [];
  const monthlyTrends = premium.active ? generateMonthlyTrends() : [];
  const prayerTrends = premium.active ? analyzePrayerTrends() : [];
  const cycleConsistency = premium.active ? calculateCycleConsistency() : null;

  const exportCsv = () => {
    if (!premium.active) {
      // Free users: only last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentEntries = entries.filter(([date]) => new Date(date) >= thirtyDaysAgo);
      
      if (recentEntries.length === 0) {
        alert('No data to export yet. Start tracking to build your history!');
        return;
      }

      const header = ['date', 'submitted', 'completed', 'points', 'latePrayers', 'completedCategories'];
      const rows = recentEntries.map(([date, d]) => {
        const lateCount = d.categories ? Object.values(d.categories.salah).filter((s) => s === 'late').length : 0;
        return [
          date,
          d.submitted ? 'yes' : 'no',
          d.completed ? 'yes' : 'no',
          d.pointsAwarded ?? '',
          lateCount,
          d.scoreBreakdown ? d.scoreBreakdown.length : ''
        ];
      });
      const csv = [header, ...rows].map((r) => r.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'mizan-analytics-last30days.csv';
      a.click();
      URL.revokeObjectURL(url);
      return;
    }

    // Premium users: full history
    const header = ['date', 'submitted', 'completed', 'points', 'latePrayers', 'completedCategories'];
    const rows = entries.map(([date, d]) => {
      const lateCount = d.categories ? Object.values(d.categories.salah).filter((s) => s === 'late').length : 0;
      return [
        date,
        d.submitted ? 'yes' : 'no',
        d.completed ? 'yes' : 'no',
        d.pointsAwarded ?? '',
        lateCount,
        d.scoreBreakdown ? d.scoreBreakdown.length : ''
      ];
    });
    const csv = [header, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mizan-analytics-full.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportNotion = () => {
    alert('Notion export placeholder: connect Notion API to push your analytics.');
  };

  return (
    <div className="min-h-screen bg-[#050507] text-white">
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="mb-8">
          <p className="text-[11px] uppercase tracking-[0.15em] text-[#4a4a4d]">Analytics</p>
          <p className="text-xl text-[#e4e4e6] tracking-tight">Performance Insights</p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="grid md:grid-cols-3 gap-4 mb-8"
        >
          <div className="p-6 border border-[#1a1a1d] bg-[#0a0a0b]">
            <div className="flex items-center gap-2 mb-2">
              <Target size={16} className="text-[#4a4a4d]" />
              <p className="text-[#4a4a4d] text-xs">Completion Rate</p>
            </div>
            <p className="text-3xl text-[#c4c4c6]">{completionRate}%</p>
            <p className="text-[#6a6a6d] text-xs mt-2">{completedDays} of {totalDays} days</p>
          </div>
          <div className="p-6 border border-[#1a1a1d] bg-[#0a0a0b]">
            <div className="flex items-center gap-2 mb-2">
              <Calendar size={16} className="text-[#4a4a4d]" />
              <p className="text-[#4a4a4d] text-xs">Best Weekday</p>
            </div>
            <p className="text-3xl text-[#c4c4c6]">Coming Soon</p>
            <p className="text-[#6a6a6d] text-xs mt-2">Pattern analysis</p>
          </div>
          <div className="p-6 border border-[#1a1a1d] bg-[#0a0a0b]">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={16} className="text-[#4a4a4d]" />
              <p className="text-[#4a4a4d] text-xs">Average Points</p>
            </div>
            <p className="text-3xl text-[#c4c4c6]">Coming Soon</p>
            <p className="text-[#6a6a6d] text-xs mt-2">Per day average</p>
          </div>
        </motion.div>

        {/* Premium Visual Progress */}
        {premium.active && (
          <>
            {/* Weekly Trends */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="border border-[#2d4a3a]/40 bg-[#0a0a0b] p-6 mt-8"
            >
              <div className="flex items-center gap-2 mb-6">
                <TrendingUp className="w-5 h-5 text-[#3dd98f]" />
                <h3 className="text-lg font-light text-[#c4c4c6]">Weekly Completion Trends</h3>
              </div>
              <div className="space-y-3">
                {weeklyTrends.map((trend, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <span className="text-xs text-[#6a6a6d] w-16">{trend.week}</span>
                    <div className="flex-1 h-8 bg-[#1a1a1d] relative overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${trend.completionRate}%` }}
                        transition={{ duration: 0.8, delay: index * 0.05 }}
                        className="h-full bg-[#2d4a3a]"
                      />
                    </div>
                    <span className="text-sm text-[#c4c4c6] w-12 text-right">{trend.completionRate}%</span>
                    <span className="text-xs text-[#6a6a6d] w-16">{trend.daysTracked}/{trend.totalPossibleDays} days</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Monthly Trends */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="border border-[#2d4a3a]/40 bg-[#0a0a0b] p-6 mt-6"
            >
              <div className="flex items-center gap-2 mb-6">
                <Calendar className="w-5 h-5 text-[#3dd98f]" />
                <h3 className="text-lg font-light text-[#c4c4c6]">Monthly Overview</h3>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {monthlyTrends.map((trend, index) => (
                  <div key={index} className="p-4 border border-[#1a1a1d] bg-[#0e0e10]">
                    <p className="text-sm text-[#c4c4c6] mb-2">{trend.month}</p>
                    <div className="flex items-baseline gap-2 mb-3">
                      <span className="text-2xl font-light text-[#3dd98f]">{trend.completionRate}%</span>
                      <span className="text-xs text-[#6a6a6d]">completion</span>
                    </div>
                    <div className="space-y-1 text-xs text-[#8a8a8d]">
                      <p>Tracked: {trend.daysTracked}/{trend.totalPossibleDays} days</p>
                      <p>Missed: {trend.missedDays} days</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Prayer-by-Prayer Analysis */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="border border-[#2d4a3a]/40 bg-[#0a0a0b] p-6 mt-6"
            >
              <div className="flex items-center gap-2 mb-6">
                <Target className="w-5 h-5 text-[#3dd98f]" />
                <h3 className="text-lg font-light text-[#c4c4c6]">Prayer Analysis</h3>
              </div>
              <div className="space-y-4">
                {prayerTrends.map((prayer, index) => (
                  <div key={index} className="p-4 border border-[#1a1a1d] bg-[#0e0e10]">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-[#c4c4c6] capitalize">{prayer.prayer}</span>
                      <span className="text-xs text-[#6a6a6d]">{prayer.totalDays} days tracked</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-[#8a8a8d] mb-1">Completion</p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-[#1a1a1d] relative overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${prayer.completionRate}%` }}
                              transition={{ duration: 0.8, delay: index * 0.1 }}
                              className="h-full bg-[#3dd98f]"
                            />
                          </div>
                          <span className="text-xs text-[#c4c4c6]">{prayer.completionRate}%</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-[#8a8a8d] mb-1">On Time</p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-[#1a1a1d] relative overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${prayer.onTimeRate}%` }}
                              transition={{ duration: 0.8, delay: index * 0.1 + 0.2 }}
                              className="h-full bg-[#4a7a5a]"
                            />
                          </div>
                          <span className="text-xs text-[#c4c4c6]">{prayer.onTimeRate}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Cycle Consistency */}
            {cycleConsistency && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="border border-[#2d4a3a]/40 bg-[#0a0a0b] p-6 mt-6"
              >
                <h3 className="text-lg font-light text-[#c4c4c6] mb-6">7-Day Cycle Consistency</h3>
                <div className="grid md:grid-cols-4 gap-4">
                  <div className="p-4 border border-[#1a1a1d] bg-[#0e0e10] text-center">
                    <p className="text-2xl font-light text-[#3dd98f] mb-1">{cycleConsistency.cyclesStarted}</p>
                    <p className="text-xs text-[#8a8a8d]">Cycles Started</p>
                  </div>
                  <div className="p-4 border border-[#1a1a1d] bg-[#0e0e10] text-center">
                    <p className="text-2xl font-light text-[#3dd98f] mb-1">{cycleConsistency.cyclesCompleted}</p>
                    <p className="text-xs text-[#8a8a8d]">Cycles Completed</p>
                  </div>
                  <div className="p-4 border border-[#1a1a1d] bg-[#0e0e10] text-center">
                    <p className="text-2xl font-light text-[#3dd98f] mb-1">{cycleConsistency.consistencyRate}%</p>
                    <p className="text-xs text-[#8a8a8d]">Completion Rate</p>
                  </div>
                  <div className="p-4 border border-[#1a1a1d] bg-[#0e0e10] text-center">
                    <p className="text-2xl font-light text-[#3dd98f] mb-1">{cycleConsistency.averageDaysPerCycle}</p>
                    <p className="text-xs text-[#8a8a8d]">Avg Days/Cycle</p>
                  </div>
                </div>
              </motion.div>
            )}
          </>
        )}

        {/* Free User Locked Visual Progress */}
        {!premium.active && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="border border-[#1a1a1d] bg-[#0a0a0b] p-6 mt-8 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-10 flex items-center justify-center">
              <div className="text-center px-6">
                <Lock className="w-12 h-12 text-[#3dd98f] mx-auto mb-4" />
                <p className="text-lg font-semibold mb-2">Premium Visual Progress</p>
                <p className="text-[#8a8a8d] text-sm mb-4">
                  See weekly trends, monthly overviews, prayer analysis, and cycle consistency
                </p>
                <button
                  onClick={() => navigate(createPageUrl('Pricing'))}
                  className="px-6 py-2 bg-[#2d4a3a] hover:bg-[#3d5a4a] text-[#0a0a0a] font-semibold text-sm tracking-wide transition-all duration-300 flex items-center gap-2 mx-auto"
                >
                  <Crown className="w-4 h-4" />
                  Reflect Intentionally
                </button>
              </div>
            </div>
            <p className="text-[#c4c4c6] mb-4">Performance Trend</p>
            <div className="h-64 flex items-center justify-center text-[#4a4a4d]">
              <div className="text-center">
                <TrendingUp size={48} className="mx-auto mb-4 opacity-20" />
                <p className="text-sm">Chart visualization</p>
                <p className="text-xs mt-2">Track your daily progress over time</p>
              </div>
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-8 p-6 border border-[#2d4a3a]/40 bg-[#0a0a0b]"
        >
          <p className="text-[#c4c4c6] text-sm mb-2">Export Your Data</p>
          <p className="text-[#6a6a6d] text-xs mb-4">
            Download your check-in history for personal analysis or backup.
          </p>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={exportCsv}
              className="px-4 py-2 bg-[#2d4a3a] hover:bg-[#3d5a4a] text-[#0a0a0a] font-semibold text-xs tracking-wide"
            >
              {premium.active ? 'Export Full History (CSV)' : 'Export Last 30 Days (CSV)'}
            </button>
            <button
              onClick={exportNotion}
              className="px-4 py-2 border border-[#2d4a3a] text-[#c4c4c6] hover:text-white text-xs tracking-wide"
            >
              Export to Notion
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
