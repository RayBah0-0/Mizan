import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { readCheckins, calculateRank, RankTitle, readMissionsProgress, readAchievementsProgress } from '@/utils/storage';
import { Lock } from 'lucide-react';
import { listMissions, listAchievements } from '@/utils/gamification';
import { useCycle } from '@/hooks/useCycle';
import { CycleGrid } from '@/components/CycleGrid';
import { getPremiumStatus } from '@/lib/premium';
import { isQuietModeEnabled } from '@/utils/quietMode';
import { useClerkAuth } from '@/contexts/ClerkAuthContext';

// Animated counter that counts from 0 to final value
const AnimatedCounter = ({ to, delay }: { to: number; delay: number }) => {
  const [count, setCount] = React.useState(0);

  React.useEffect(() => {
    const start = Date.now();
    const duration = 800;

    const updateCount = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      setCount(Math.floor(progress * to));

      if (progress < 1) {
        requestAnimationFrame(updateCount);
      } else {
        setCount(to);
      }
    };

    const timer = setTimeout(() => {
      requestAnimationFrame(updateCount);
    }, delay * 1000);

    return () => clearTimeout(timer);
  }, [to, delay]);

  return <span>{count}</span>;
};

const RANK_MEANINGS: Record<string, { meaning: string, direction: string }> = {
  'Ghāfil': {
    meaning: 'You are at the beginning. Growth starts with awareness.',
    direction: 'Complete your first day to awaken to consistency.'
  },
  'Muntabih': {
    meaning: 'You have taken the first step. Awareness has begun.',
    direction: 'Complete your first cycle to show commitment.'
  },
  'Multazim': {
    meaning: 'You have made a promise and kept it once.',
    direction: 'Complete 3 cycles to develop regularity.'
  },
  'Muwāẓib': {
    meaning: 'Consistency is becoming natural to you.',
    direction: 'Complete 7 cycles to deepen accountability.'
  },
  'Muhāsib': {
    meaning: 'You hold yourself to account without being watched.',
    direction: 'Reach 30 days completed to embody steadfastness.'
  },
  'Muttazin': {
    meaning: 'You are steady. Your growth is deep and rooted.',
    direction: 'Maintain this state with humility and intention.'
  }
};

const StatBlock = ({ value, label, delay, sealed }: { value: number; label: string; delay: number; sealed?: boolean }) => (
  <motion.div
    initial={{ opacity: 0, y: 20, scale: 0.95 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ duration: 0.6, delay }}
    className="p-6 border border-[#1a1a1d] bg-[#0a0a0b] text-center hover:border-[#2a2a2d] transition-colors duration-300"
  >
    <motion.p 
      className="text-[#c4c4c6] text-3xl md:text-4xl font-light tracking-tight mb-2"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: delay + 0.2 }}
    >
      <span className="flex items-center justify-center gap-2">
        <AnimatedCounter to={value} delay={delay} />
        {sealed && <Lock className="w-4 h-4 text-[#6a6a6d]" title="Entry closed" />}
      </span>
    </motion.p>
    <motion.p 
      className="text-[#4a4a4d] text-xs tracking-[0.15em] uppercase"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: delay + 0.3 }}
    >
      {label}
    </motion.p>
  </motion.div>
);

const RANK_INFO: Record<RankTitle, { definition: string; nextRank?: RankTitle; nextRequirement?: string }> = {
  Ghāfil: {
    definition: 'Heedless, unaware. Default state.',
    nextRank: 'Muntabih',
    nextRequirement: 'Complete your first day to become aware.'
  },
  Muntabih: {
    definition: 'Aware, alert. First step taken.',
    nextRank: 'Multazim',
    nextRequirement: 'Complete 1 full cycle (7 days) to show commitment.'
  },
  Multazim: {
    definition: 'Committed, bound by obligation.',
    nextRank: 'Muwāẓib',
    nextRequirement: 'Complete 3 cycles to prove consistency.'
  },
  Muwāẓib: {
    definition: 'Consistent, regular. Patterns established.',
    nextRank: 'Muhāsib',
    nextRequirement: 'Complete 7 cycles and recover after at least one missed day.'
  },
  Muhāsib: {
    definition: 'One who holds himself accountable.',
    nextRank: 'Muttazin',
    nextRequirement: 'Reach 30+ completed days for balance.'
  },
  Muttazin: {
    definition: 'Balanced, measured. Highest state.',
    nextRequirement: 'Maintain consistency. This is the pinnacle.'
  }
};

export default function Status() {
  const { user, premiumStatus } = useClerkAuth();
  const quietMode = isQuietModeEnabled();
  const { cyclesCompleted, currentProgress } = useCycle();
  const missions = React.useMemo(() => listMissions(readMissionsProgress()), []);
  const achievements = React.useMemo(() => listAchievements(readAchievementsProgress()), []);

  const totals = useMemo(() => {
    const checkins = readCheckins();
    const entries = Object.entries(checkins).sort(([a], [b]) => (a < b ? -1 : 1));
    const submittedDays = entries.filter(([, d]) => d.submitted).length;
    const completedDays = entries.filter(([, d]) => d.completed).length;
    const penaltiesOutstanding = entries.reduce((acc, [, d]) => acc + d.penalties.filter((p) => !p.resolved).length, 0);

    let currentStreak = 0;
    let hasRecovered = false;
    for (let i = entries.length - 1; i >= 0; i -= 1) {
      const [, entry] = entries[i];
      if (entry.completed) {
        currentStreak += 1;
      } else if (entry.submitted && !entry.completed) {
        hasRecovered = true;
        break;
      } else {
        break;
      }
    }

    const rank = calculateRank(completedDays, cyclesCompleted, hasRecovered);

    return { submittedDays, completedDays, penaltiesOutstanding, currentStreak, rank };
  }, [cyclesCompleted]);

  const rankInfo = RANK_INFO[totals.rank];

  const exportCsv = () => {
    const header = ['date', 'submitted', 'completed', 'points'];
    const rows = Object.entries(readCheckins()).map(([date, d]) => [
      date,
      d.submitted ? 'yes' : 'no',
      d.completed ? 'yes' : 'no',
      d.pointsAwarded ?? ''
    ]);
    const csv = [header, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mizan-status.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportNotion = () => {
    alert('Notion export placeholder: hook up Notion API to push status data.');
  };
  return (
    <div className="min-h-screen bg-[#050507] text-white">
      <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">
        <div>
          <p className="text-[11px] uppercase tracking-[0.15em] text-[#4a4a4d]">Status</p>
          <p className="text-xl text-[#e4e4e6] tracking-tight">Progress, rank, and missions</p>
        </div>

        <motion.div
          className="grid grid-cols-2 gap-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ staggerChildren: 0.05, delayChildren: 0.3 }}
        >
          <StatBlock value={totals.completedDays} label="Days completed" delay={0.3} sealed />
          <StatBlock value={cyclesCompleted} label="Cycles completed" delay={0.4} />
          <StatBlock value={totals.currentStreak} label="Current streak" delay={0.5} />
          <StatBlock value={totals.penaltiesOutstanding} label="Penalties pending" delay={0.6} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35 }}
          className="flex flex-wrap gap-3"
        >
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
          <span className="text-[#8a8a8d] text-xs self-center">Export your progress anytime.</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="p-5 border border-[#1a1a1d] bg-[#0a0a0b] hover:border-[#2a2a2d] transition-all duration-300"
        >
          <motion.p
            className="text-[#4a4a4d] text-xs tracking-[0.15em] uppercase mb-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            Current state
          </motion.p>
          <motion.p
            className="text-[#c4c4c6] text-lg tracking-wide mb-3"
            key={totals.rank}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.85 }}
          >
            {totals.rank}
          </motion.p>
          <motion.p
            className="text-[#5a5a5d] text-xs leading-relaxed mb-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
          >
            {rankInfo.definition}
          </motion.p>
          
          {premium.active && RANK_MEANINGS[totals.rank] && (
            <motion.div
              className="p-3 bg-[#0e0e10] border border-[#2d4a3a]/30 rounded mb-4"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              transition={{ delay: 0.95 }}
            >
              <p className="text-sm text-[#c4c4c6] mb-2">{RANK_MEANINGS[totals.rank].meaning}</p>
              <p className="text-xs text-[#6a6a6d]">{RANK_MEANINGS[totals.rank].direction}</p>
            </motion.div>
          )}
          
          {rankInfo.nextRank && (
            <motion.div
              className="pt-4 border-t border-[#1a1a1d]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
            >
              <p className="text-[#3a3a3d] text-[10px] tracking-[0.15em] uppercase mb-1">Path forward</p>
              <p className="text-[#4a4a4d] text-xs leading-relaxed">{rankInfo.nextRequirement}</p>
            </motion.div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-2"
        >
          <CycleGrid filled={currentProgress} label={`Current cycle progress (${currentProgress}/7)`} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="grid md:grid-cols-2 gap-4"
        >
          <div className="p-5 border border-[#1a1a1d] bg-[#0a0a0b]">
            <p className="text-[#4a4a4d] text-xs tracking-[0.15em] uppercase mb-3">Missions</p>
            <div className="space-y-3">
              {missions.map((m) => (
                <div key={m.id} className="flex items-start justify-between text-sm text-[#c4c4c6]">
                  <div>
                    <p className="text-[#c4c4c6]">{m.title}</p>
                    <p className="text-[#4a4a4d] text-xs">{m.description}</p>
                    <p className="text-[11px] text-[#6a6a6d] mt-1">Reward: {m.points} pts</p>
                  </div>
                  <span
                    className={`text-[11px] uppercase tracking-[0.12em] text-right ${m.completed ? 'text-[#2d4a3a]' : 'text-[#6a6a6d]'}`}
                  >
                    {m.completed ? 'Done' : 'Active'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-5 border border-[#1a1a1d] bg-[#0a0a0b]">
            <p className="text-[#4a4a4d] text-xs tracking-[0.15em] uppercase mb-3">Achievements</p>
            <div className="space-y-3">
              {achievements.map((a) => (
                <div key={a.id} className="flex items-start justify-between text-sm text-[#c4c4c6]">
                  <div>
                    <p className="text-[#c4c4c6]">{a.title}</p>
                    <p className="text-[#4a4a4d] text-xs">{a.description}</p>
                    <p className="text-[11px] text-[#6a6a6d] mt-1">Reward: {a.points} pts</p>
                  </div>
                  <span
                    className={`text-[11px] uppercase tracking-[0.12em] text-right ${a.completed ? 'text-[#2d4a3a]' : 'text-[#6a6a6d]'}`}
                  >
                    {a.completed ? 'Earned' : 'Locked'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
