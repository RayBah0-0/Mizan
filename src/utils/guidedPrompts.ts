import { readCheckins, readCycles } from './storage';

export interface GuidedPrompt {
  type: 'cycle_complete' | 'streak_milestone' | 'relapse_recovery' | 'weekly_reflection';
  question: string;
  context: string;
}

/**
 * Determine if a guided prompt should be shown based on current state
 */
export function shouldShowGuidedPrompt(): GuidedPrompt | null {
  const checkins = readCheckins();
  const checkIns = Object.entries(checkins).map(([date, entry]) => ({ date, ...entry }));
  const cycles = readCycles();
  
  if (checkIns.length === 0) return null;

  // Check for completed cycle (7 consecutive days)
  const cycleCompletePrompt = checkCycleComplete(cycles);
  if (cycleCompletePrompt) return cycleCompletePrompt;

  // Check for streak milestones (7, 14, 21, 30 days)
  const streakPrompt = checkStreakMilestone(checkIns);
  if (streakPrompt) return streakPrompt;

  // Check for weekly reflection (every 7 days)
  const weeklyPrompt = checkWeeklyReflection();
  if (weeklyPrompt) return weeklyPrompt;

  return null;
}

/**
 * Check if user just completed a cycle
 */
function checkCycleComplete(cycles: any[]): GuidedPrompt | null {
  if (cycles.length === 0) return null;

  const lastCycle = cycles[cycles.length - 1];
  if (!lastCycle.completedAt) return null;

  const completedDate = new Date(lastCycle.completedAt);
  const today = new Date();
  const hoursSinceCompletion = (today.getTime() - completedDate.getTime()) / (1000 * 60 * 60);

  // Show prompt within 24 hours of cycle completion
  if (hoursSinceCompletion < 24 && hoursSinceCompletion > 0) {
    const lastShown = localStorage.getItem('last_cycle_complete_prompt');
    if (lastShown === lastCycle.id) return null;

    const questions = [
      "What helped you stay consistent through this cycle?",
      "Which prayer felt most meaningful this week?",
      "What made these 7 days different from before?",
      "How did accountability change your approach?",
      "What would make the next cycle stronger?"
    ];

    return {
      type: 'cycle_complete',
      question: questions[Math.floor(Math.random() * questions.length)],
      context: "You completed a full 7-day cycle"
    };
  }

  return null;
}

/**
 * Check for streak milestones
 */
function checkStreakMilestone(checkIns: any[]): GuidedPrompt | null {
  // Calculate current streak
  const sortedCheckIns = [...checkIns].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  let currentStreak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < 90; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(today.getDate() - i);
    const dateStr = checkDate.toISOString().split('T')[0];
    
    const hasCheckIn = checkIns.some(c => c.date === dateStr);
    if (!hasCheckIn) break;
    currentStreak++;
  }

  // Milestone thresholds
  const milestones = [7, 14, 21, 30, 60, 90];
  const milestone = milestones.find(m => m === currentStreak);
  
  if (milestone) {
    const lastShown = localStorage.getItem('last_streak_prompt');
    if (lastShown === `${milestone}`) return null;

    const questions = milestone >= 30
      ? [
          "How has your relationship with Salah changed?",
          "What keeps you coming back each day?",
          "Which prayer time has become easiest?",
          "What would you tell someone just starting?"
        ]
      : [
          "What's helping you maintain this streak?",
          "Which prayer still feels hardest?",
          "What almost made you skip, but didn't?",
          "How are you feeling about your consistency?"
        ];

    return {
      type: 'streak_milestone',
      question: questions[Math.floor(Math.random() * questions.length)],
      context: `${milestone}-day streak achieved`
    };
  }

  return null;
}

/**
 * Check for weekly reflection (every Sunday)
 */
function checkWeeklyReflection(): GuidedPrompt | null {
  const today = new Date();
  const dayOfWeek = today.getDay();
  
  // Only on Sundays (0)
  if (dayOfWeek !== 0) return null;

  const lastShown = localStorage.getItem('last_weekly_prompt');
  const todayStr = today.toISOString().split('T')[0];
  if (lastShown === todayStr) return null;

  const questions = [
    "How was your week with Salah?",
    "Which day was strongest? Which was hardest?",
    "What pattern do you notice in your consistency?",
    "What would make next week better?",
    "Which prayer needs more attention?"
  ];

  return {
    type: 'weekly_reflection',
    question: questions[Math.floor(Math.random() * questions.length)],
    context: "Weekly reflection"
  };
}

/**
 * Mark a prompt as shown to prevent repeated displays
 */
export function markPromptShown(prompt: GuidedPrompt): void {
  const today = new Date().toISOString().split('T')[0];
  
  switch (prompt.type) {
    case 'cycle_complete':
      const cycles = readCycles();
      if (cycles.length > 0) {
        localStorage.setItem('last_cycle_complete_prompt', cycles[cycles.length - 1].id);
      }
      break;
    case 'streak_milestone':
      const currentStreak = parseInt(prompt.context.split('-')[0]);
      localStorage.setItem('last_streak_prompt', `${currentStreak}`);
      break;
    case 'weekly_reflection':
      localStorage.setItem('last_weekly_prompt', today);
      break;
  }
}

/**
 * Save user's reflection response
 */
export function saveGuidedReflection(prompt: GuidedPrompt, response: string): void {
  const reflections = getGuidedReflections();
  reflections.push({
    date: new Date().toISOString(),
    type: prompt.type,
    question: prompt.question,
    response,
    context: prompt.context
  });
  
  // Keep only last 50 reflections
  if (reflections.length > 50) {
    reflections.splice(0, reflections.length - 50);
  }
  
  localStorage.setItem('mizan_guided_reflections', JSON.stringify(reflections));
}

/**
 * Get all guided reflections
 */
export function getGuidedReflections(): Array<{
  date: string;
  type: string;
  question: string;
  response: string;
  context: string;
}> {
  try {
    const stored = localStorage.getItem('mizan_guided_reflections');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}
