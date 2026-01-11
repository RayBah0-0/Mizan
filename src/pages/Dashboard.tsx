import React, { useMemo, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Target, Flame, Trophy, TrendingUp, CheckCircle2, AlertCircle, Crown } from 'lucide-react';
import { createPageUrl } from '@/utils/urls';
import { readCheckins, getTodayKey, countCompletedCategories, readLeaderboard, readUser, readPointsLog } from '@/utils/storage';
import { useCycle } from '@/hooks/useCycle';
import { CircleProgress } from '@/components/CircleProgress';
import { handleStripeRedirect, checkStripeRedirect, isPremiumPending, activatePremium, migrateOldPremiumData } from '@/lib/premium';
import { useClerkAuth } from '@/contexts/ClerkAuthContext';

function formatDateLabel(dateKey: string): string {
  if (!dateKey) return '—';
  const [year, month, day] = dateKey.split('-');
  return `${day}/${month}/${year.slice(-2)}`;
}

const AnimatedCounter = ({ value }: { value: number }) => {
  return (
    <motion.span
      key={value}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.3 }}
    >
      {value}
    </motion.span>
  );
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useClerkAuth();
  const { cyclesCompleted, currentProgress } = useCycle();
  const [showPremiumActivated, setShowPremiumActivated] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [activationCode, setActivationCode] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');

  // If we came back from Stripe, mark it so we can handle once user is loaded
  useEffect(() => {
    if (checkStripeRedirect()) {
      sessionStorage.setItem('stripe_redirect_pending', 'true');
    }
  }, []);

  // Handle Stripe redirect once user is available
  useEffect(() => {
    if (user?.id && sessionStorage.getItem('stripe_redirect_pending') === 'true') {
      handleStripeRedirect(user.id);
      sessionStorage.removeItem('stripe_redirect_pending');
    }
  }, [user?.id]);

  // Migrate old premium data when user changes
  useEffect(() => {
    if (user?.id) {
      migrateOldPremiumData(user.id);
    }
  }, [user?.id]);

  const handleActivatePremium = async () => {
    setIsActivating(true);

    // Simulate activation process (like Stripe's animation timing)
    await new Promise(resolve => setTimeout(resolve, 800));

    const code = activatePremium(user?.id);
    setActivationCode(code);
    setShowPremiumActivated(true);
    setIsActivating(false);

    // No longer auto-hide - user must click copy or X to close
  };

  const metrics = useMemo(() => {
    const checkins = readCheckins();
    const entries = Object.entries(checkins).sort(([a], [b]) => (a < b ? -1 : 1));
    const todayKey = getTodayKey();
    const todayEntry = checkins[todayKey];

    const submittedDays = entries.filter(([, d]) => d.submitted).length;
    const completedDays = entries.filter(([, d]) => d.completed).length;
    const penaltiesOutstanding = entries.reduce((acc, [, d]) => acc + d.penalties.filter((p) => !p.resolved).length, 0);

    let currentStreak = 0;
    for (let i = entries.length - 1; i >= 0; i -= 1) {
      const [, entry] = entries[i];
      if (entry.completed) {
        currentStreak += 1;
      } else if (entry.submitted) {
        break;
      } else {
        break;
      }
    }

    const lastCompleted = entries.filter(([, d]) => d.completed).pop()?.[0] ?? '';
    const categoriesDone = todayEntry ? countCompletedCategories(todayEntry.categories) : 0;

    let todayStatus = 'Not started';
    let todayHint = 'Begin your daily check-in to log discipline.';
    if (todayEntry?.completed) {
      todayStatus = 'Completed';
      todayHint = 'Today is balanced. See your status or cycles.';
    } else if (todayEntry?.submitted) {
      todayStatus = 'Logged';
      todayHint = 'Submitted but not balanced. Clear any debts if needed.';
    } else if (categoriesDone > 0) {
      todayStatus = 'In progress';
      todayHint = 'You have activity saved. Finish and submit when ready.';
    }

    const leaderboard = readLeaderboard().sort((a, b) => b.points - a.points);
    const user = readUser() || 'guest';
    const yourPoints = leaderboard.find((l) => l.user === user)?.points ?? 0;
    const lastPoints = [...readPointsLog()].pop();

    return {
      todayKey,
      todayStatus,
      todayHint,
      submittedDays,
      completedDays,
      currentStreak,
      penaltiesOutstanding,
      lastCompleted,
      categoriesDone,
      leaderboard,
      yourPoints,
      lastPoints,
      user
    };
  }, [cyclesCompleted]);

  const handlePrimary = () => {
    navigate(createPageUrl('CheckIn'));
  };

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-[#c4c4c6] px-6 py-12">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="max-w-2xl mx-auto">

        {/* Premium Pending Banner */}
        {isPremiumPending(user?.id) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-[#1a1a1d] border border-[#2a2a2d] rounded-lg"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Crown className="w-5 h-5 text-[#3dd98f]" />
                <span className="text-sm text-[#c4c4c6]">Payment received. Activate premium to continue.</span>
              </div>
              <button
                onClick={handleActivatePremium}
                disabled={isActivating}
                className="px-4 py-2 bg-[#2d4a3a] hover:bg-[#3d5a4a] disabled:bg-[#2d4a3a] text-[#0a0a0a] text-sm font-medium rounded transition-all duration-300 flex items-center gap-2 min-w-[120px] justify-center"
              >
                {isActivating ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="flex items-center gap-2"
                  >
                    <motion.svg
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 1 }}
                      transition={{ duration: 0.5, delay: 0.2, ease: "easeInOut" }}
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-[#0a0a0a]"
                    >
                      <motion.path
                        d="M20 6L9 17L4 12"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.5, delay: 0.2, ease: "easeInOut" }}
                      />
                    </motion.svg>
                    <span>Activated</span>
                  </motion.div>
                ) : (
                  <span>Activate Premium</span>
                )}
              </button>
            </div>
          </motion.div>
        )}

        {/* Premium Activated Confirmation */}
        {showPremiumActivated && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mb-6 p-4 bg-[#1a1a1d]/50 border border-[#2d4a3a]/40 rounded-lg relative"
          >
            {/* Close button */}
            <button
              onClick={() => {
                setShowPremiumActivated(false);
                setActivationCode(null);
                setCopyStatus('idle');
              }}
              className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center text-[#6a6a6d] hover:text-[#c4c4c6] hover:bg-[#2a2a2d] rounded transition-colors"
            >
              ✕
            </button>

            <div className="text-center pr-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="w-8 h-8 bg-[#3dd98f] rounded-full flex items-center justify-center mx-auto mb-3"
              >
                <Crown className="w-4 h-4 text-[#0a0a0a]" />
              </motion.div>
              <h3 className="text-sm font-medium text-[#3dd98f] mb-2">Premium Activated Successfully!</h3>
              <p className="text-xs text-[#6a6a6d] mb-3">Your premium features are now unlocked for 1 year.</p>

              {activationCode && (
                <div className="bg-[#0a0a0b] border border-[#1a1a1d] p-3 rounded-lg">
                  <p className="text-xs text-[#6a6a6d] mb-2">Save this activation code for backup:</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-2 py-1 bg-[#1a1a1d] text-[#3dd98f] font-mono text-xs rounded border border-[#2a2a2d]">
                      {activationCode}
                    </code>
                    <motion.button
                      onClick={async () => {
                        await navigator.clipboard.writeText(activationCode);
                        setCopyStatus('copied');
                        setTimeout(() => setCopyStatus('idle'), 2000);
                      }}
                      className="px-2 py-1 bg-[#1a1a1d] hover:bg-[#2a2a2d] text-[#c4c4c6] text-xs rounded border border-[#2a2a2d] transition-colors min-w-[60px]"
                      animate={copyStatus === 'copied' ? { scale: [1, 1.05, 1] } : {}}
                      transition={{ duration: 0.2 }}
                    >
                      <motion.span
                        key={copyStatus}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.2 }}
                      >
                        {copyStatus === 'copied' ? 'Copied!' : 'Copy'}
                      </motion.span>
                    </motion.button>
                  </div>
                  <p className="text-xs text-[#6a6a6d] mt-2">Use this code to reactivate premium if needed.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        <motion.div 
          className="mb-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <motion.p 
            className="text-[11px] uppercase tracking-[0.22em] text-[#4a4a4d] mb-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
          >
            Today
          </motion.p>
          <motion.div
            className="flex items-center gap-3"
            key={metrics.todayStatus}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {metrics.todayStatus === 'Completed' ? (
              <CheckCircle2 className="w-8 h-8 text-[#3dd98f]" />
            ) : metrics.todayStatus === 'In progress' ? (
              <AlertCircle className="w-8 h-8 text-[#ffa500]" />
            ) : (
              <Calendar className="w-8 h-8 text-[#6a6a6d]" />
            )}
            <h1 className="text-3xl font-light">
              {metrics.todayStatus}
            </h1>
          </motion.div>
        </motion.div>

        <motion.div 
          className="border border-[#1a1a1d] bg-[#0a0a0b] p-6 mb-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <motion.p 
            className="text-[#6a6a6d] text-sm mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {metrics.todayHint}
          </motion.p>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <motion.p 
                className="text-[11px] uppercase tracking-[0.18em] text-[#4a4a4d]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35 }}
              >
                Cycle progress
              </motion.p>
            </div>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              className="flex justify-center"
            >
              <CircleProgress 
                value={currentProgress}
                max={7}
                size={140}
                label="days completed"
                color="#3dd98f"
              />
            </motion.div>
          </div>

          <motion.button
            type="button"
            onClick={handlePrimary}
            className="w-full bg-[#0e0e10] border border-[#1a1a1d] text-[#8a8a8d] py-4 px-5 text-sm tracking-[0.15em] uppercase transition-all duration-300 relative overflow-hidden"
            whileHover={{ 
              borderColor: '#2a2a2d',
              color: '#c4c4c6'
            }}
            whileTap={{ scale: 0.98 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45 }}
          >
            <motion.span
              className="relative z-10"
              animate={{ opacity: [1, 0.8, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              Start check-in
            </motion.span>
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-[#2d4a3a]/0 via-[#2d4a3a]/20 to-[#2d4a3a]/0"
              animate={{ x: ['-100%', '100%'] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </motion.button>
        </motion.div>

        <motion.div 
          className="border border-[#1a1a1d] bg-[#0a0a0b] p-6 mb-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
        >
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-[#0e0e10] border border-[#1a1a1d]">
              <div className="flex items-center gap-2 mb-2">
                <Flame className="w-4 h-4 text-[#ff6b4a]" />
                <p className="text-[10px] uppercase tracking-[0.15em] text-[#4a4a4d]">Streak</p>
              </div>
              <motion.p 
                className="text-3xl text-[#c4c4c6] font-light"
                key={metrics.currentStreak}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 200 }}
              >
                {metrics.currentStreak}
              </motion.p>
              <p className="text-xs text-[#6a6a6d] mt-1">days</p>
            </div>
            <div className="p-4 bg-[#0e0e10] border border-[#1a1a1d]">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="w-4 h-4 text-[#3dd98f]" />
                <p className="text-[10px] uppercase tracking-[0.15em] text-[#4a4a4d]">Points</p>
              </div>
              <motion.p 
                className="text-3xl text-[#c4c4c6] font-light"
                key={metrics.yourPoints}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 200 }}
              >
                {metrics.yourPoints}
              </motion.p>
              {metrics.lastPoints && (
                <p className="text-xs text-[#6a6a6d] mt-1">+{metrics.lastPoints.points} last</p>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-[#4a4a4d]" />
              <p className="text-[11px] uppercase tracking-[0.18em] text-[#4a4a4d]">Leaderboard</p>
            </div>
            <div className="space-y-2">
              {metrics.leaderboard.slice(0, 5).map((entry, idx) => (
                <motion.div 
                  key={entry.user} 
                  className="flex items-center justify-between text-sm text-[#c4c4c6] p-2 bg-[#0e0e10] border border-[#1a1a1d]"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + idx * 0.05 }}
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-semibold w-5 h-5 flex items-center justify-center rounded-full ${
                      idx === 0 ? 'bg-[#3dd98f] text-black' : 
                      idx === 1 ? 'bg-[#6a6a6d] text-black' : 
                      idx === 2 ? 'bg-[#8a6040] text-black' : 
                      'bg-[#1a1a1d] text-[#4a4a4d]'
                    }`}>
                      {idx + 1}
                    </span>
                    <span className={entry.user === metrics.user ? 'text-[#3dd98f] font-semibold' : 'text-[#8a8a8d]'}>
                      {entry.user}{entry.user === metrics.user ? ' (You)' : ''}
                    </span>
                  </div>
                  <span className="text-[#8a8a8d]">{entry.points}</span>
                </motion.div>
              ))}
              {metrics.leaderboard.length === 0 && (
                <p className="text-xs text-[#4a4a4d] p-2">No scores yet. Complete a day to enter the board.</p>
              )}
            </div>
          </div>
        </motion.div>

        <motion.div 
          className="grid gap-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, staggerChildren: 0.1 }}
        >
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.55 }}
          >
            <Link to={createPageUrl('Analytics')} className="border border-[#1a1a1d] bg-[#0a0a0b] p-4 hover:border-[#2a2a2d] transition-all duration-300 block hover:shadow-lg hover:shadow-[#2d4a3a]/20 group">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <motion.div 
                    className="flex items-center gap-2 mb-1"
                    whileHover={{ x: 2 }}
                  >
                    <Target className="w-4 h-4 text-[#4a4a4d] group-hover:text-[#3dd98f] transition-colors" />
                    <p className="text-xs uppercase tracking-[0.15em] text-[#4a4a4d] group-hover:text-[#8a8a8d] transition-colors">
                      Analytics
                    </p>
                  </motion.div>
                  <p className="text-sm text-[#c4c4c6] group-hover:text-white transition-colors">
                    Performance insights
                  </p>
                </div>
                <TrendingUp className="w-5 h-5 text-[#1a1a1d] group-hover:text-[#3dd98f] transition-colors" />
              </div>
            </Link>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Link to={createPageUrl('Status')} className="border border-[#1a1a1d] bg-[#0a0a0b] p-4 hover:border-[#2a2a2d] transition-all duration-300 block hover:shadow-lg hover:shadow-[#2d4a3a]/20 group">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <motion.div 
                    className="flex items-center gap-2 mb-1"
                    whileHover={{ x: 2 }}
                  >
                    <Calendar className="w-4 h-4 text-[#4a4a4d] group-hover:text-[#3dd98f] transition-colors" />
                    <p className="text-xs uppercase tracking-[0.15em] text-[#4a4a4d] group-hover:text-[#8a8a8d] transition-colors">
                      View more
                    </p>
                  </motion.div>
                  <p className="text-sm text-[#c4c4c6] group-hover:text-white transition-colors">
                    Status & history
                  </p>
                </div>
                <CheckCircle2 className="w-5 h-5 text-[#1a1a1d] group-hover:text-[#3dd98f] transition-colors" />
              </div>
            </Link>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.65 }}
          >
            <Link to={createPageUrl('Settings')} className="border border-[#1a1a1d] bg-[#0a0a0b] p-4 hover:border-[#2a2a2d] transition-all duration-300 block hover:shadow-lg hover:shadow-[#2d4a3a]/20 group">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <motion.div 
                    className="flex items-center gap-2 mb-1"
                    whileHover={{ x: 2 }}
                  >
                    <AlertCircle className="w-4 h-4 text-[#4a4a4d] group-hover:text-[#3dd98f] transition-colors" />
                    <p className="text-xs uppercase tracking-[0.15em] text-[#4a4a4d] group-hover:text-[#8a8a8d] transition-colors">
                      Manage
                    </p>
                  </motion.div>
                  <p className="text-sm text-[#c4c4c6] group-hover:text-white transition-colors">
                    Settings
                  </p>
                </div>
              </div>
            </Link>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}
