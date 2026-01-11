import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Calendar, Target, Lock, Crown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { readCheckins } from '@/utils/storage';
import { useClerkAuth } from '@/contexts/ClerkAuthContext';
import { isPremiumEnabled } from '@/lib/premium';
import { createPageUrl } from '@/utils/urls';

export default function Analytics() {
  const { user } = useClerkAuth();
  const isPremium = isPremiumEnabled(user?.id);
  const navigate = useNavigate();
  
  // Calculate basic stats for preview
  const checkins = readCheckins();
  const entries = Object.entries(checkins);
  const completedDays = entries.filter(([, d]) => d.completed).length;
  const totalDays = entries.length;
  const completionRate = totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0;

  const exportCsv = () => {
    if (!isPremium) {
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

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="border border-[#1a1a1d] bg-[#0a0a0b] p-6 relative overflow-hidden"
        >
          {!isPremium && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-10 flex items-center justify-center">
              <div className="text-center px-6">
                <Lock className="w-12 h-12 text-[#3dd98f] mx-auto mb-4" />
                <p className="text-lg font-semibold mb-2">Premium Feature</p>
                <p className="text-[#8a8a8d] text-sm mb-4">
                  Unlock detailed charts and insights with Premium
                </p>
                <button
                  onClick={() => navigate(createPageUrl('Pricing'))}
                  className="px-6 py-2 bg-[#2d4a3a] hover:bg-[#3d5a4a] text-[#0a0a0a] font-semibold text-sm tracking-wide transition-all duration-300 flex items-center gap-2 mx-auto"
                >
                  <Crown className="w-4 h-4" />
                  Upgrade to Premium
                </button>
              </div>
            </div>
          )}
          <p className="text-[#c4c4c6] mb-4">Performance Trend</p>
          <div className="h-64 flex items-center justify-center text-[#4a4a4d]">
            <div className="text-center">
              <TrendingUp size={48} className="mx-auto mb-4 opacity-20" />
              <p className="text-sm">Chart visualization</p>
              <p className="text-xs mt-2">Track your daily progress over time</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-8 p-6 border border-[#2d4a3a]/40 bg-[#0a0a0b]"
        >
          <p className="text-[#c4c4c6] text-sm mb-2">Analytics roadmap</p>
          <p className="text-[#6a6a6d] text-xs">
            Advanced analytics features are being built. You'll receive weekly insights via email and see detailed charts here soon.
          </p>
          <div className="mt-4 grid md:grid-cols-2 gap-3 text-sm text-[#c4c4c6]">
            <div className="p-4 border border-[#1a1a1d] bg-[#0e0e10]">
              <p className="text-[#8a8a8d] text-xs mb-2">Weekly AI Insights</p>
              <p className="text-[#c4c4c6] text-sm">Coaching summaries (stub) ready for everyone.</p>
            </div>
            <div className="p-4 border border-[#1a1a1d] bg-[#0e0e10]">
              <p className="text-[#8a8a8d] text-xs mb-2">Trend Charts</p>
              <p className="text-[#c4c4c6] text-sm">Trend visualizations will render here using your check-ins.</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={exportCsv}
              className="px-4 py-2 bg-[#2d4a3a] hover:bg-[#3d5a4a] text-[#0a0a0a] font-semibold text-xs tracking-wide"
            >
              Export CSV
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
