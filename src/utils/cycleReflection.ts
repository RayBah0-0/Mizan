/**
 * Cycle Reflection Generator - Premium Feature
 * Generates written summaries at cycle completion
 */

import { readCheckins, DayEntry } from './storage';

interface CycleReflection {
  improvements: string;
  weaknesses: string;
  strongestArea: string;
  reflectionQuestion: string;
  completionRate: number;
  missedDays: number;
}

export function generateCycleReflection(cycleDays: string[]): CycleReflection {
  const checkins = readCheckins();
  const cycleData = cycleDays.map(day => ({ day, entry: checkins[day] }));
  
  // Calculate metrics
  const completedDays = cycleData.filter(d => d.entry?.completed).length;
  const completionRate = (completedDays / 7) * 100;
  const missedDays = 7 - completedDays;
  
  // Analyze prayer consistency
  const prayerStats = analyzePrayers(cycleData);
  const categoryStats = analyzeCategories(cycleData);
  
  // Generate insights
  const improvements = generateImprovements(completionRate, prayerStats, categoryStats);
  const weaknesses = generateWeaknesses(prayerStats, categoryStats);
  const strongestArea = identifyStrongestArea(categoryStats);
  const reflectionQuestion = selectReflectionQuestion(completionRate, prayerStats);
  
  return {
    improvements,
    weaknesses,
    strongestArea,
    reflectionQuestion,
    completionRate,
    missedDays
  };
}

function analyzePrayers(cycleData: { day: string, entry: DayEntry }[]) {
  const prayers = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
  const stats: Record<string, { completed: number, total: number }> = {};
  
  prayers.forEach(prayer => {
    stats[prayer] = { completed: 0, total: 0 };
    cycleData.forEach(({ entry }) => {
      if (entry?.categories?.salah?.[prayer] !== undefined) {
        stats[prayer].total++;
        if (entry.categories.salah[prayer] === 'ontime' || entry.categories.salah[prayer] === 'late') {
          stats[prayer].completed++;
        }
      }
    });
  });
  
  return stats;
}

function analyzeCategories(cycleData: { day: string, entry: DayEntry }[]) {
  const categories = ['quran', 'physical', 'build', 'study', 'journal', 'rest'];
  const stats: Record<string, number> = {};
  
  categories.forEach(cat => {
    let count = 0;
    cycleData.forEach(({ entry }) => {
      const catData = entry?.categories?.[cat as keyof typeof entry.categories];
      if (catData) {
        if (typeof catData === 'object' && 'selected' in catData) {
          count += (catData.selected?.length || 0) > 0 ? 1 : 0;
        } else if (typeof catData === 'object' && 'completed' in catData) {
          count += catData.completed ? 1 : 0;
        }
      }
    });
    stats[cat] = count;
  });
  
  return stats;
}

function generateImprovements(completionRate: number, prayerStats: any, categoryStats: any): string {
  if (completionRate === 100) {
    return 'You completed every day this cycle. Consistency is becoming rooted.';
  }
  if (completionRate >= 85) {
    return 'You maintained strong consistency this cycle. Most days were complete.';
  }
  if (completionRate >= 70) {
    return 'You showed up more often than not. Progress is present.';
  }
  if (completionRate >= 50) {
    return 'You began this cycle with intention. Half the days were honored.';
  }
  return 'You took the first step. Awareness is the foundation of change.';
}

function generateWeaknesses(prayerStats: any, categoryStats: any): string {
  // Find weakest prayer
  const prayers = Object.entries(prayerStats) as [string, { completed: number, total: number }][];
  const weakestPrayer = prayers.sort((a, b) => {
    const rateA = a[1].total > 0 ? a[1].completed / a[1].total : 1;
    const rateB = b[1].total > 0 ? b[1].completed / b[1].total : 1;
    return rateA - rateB;
  })[0];
  
  if (weakestPrayer && weakestPrayer[1].total > 0) {
    const rate = (weakestPrayer[1].completed / weakestPrayer[1].total) * 100;
    if (rate < 70) {
      return `${capitalize(weakestPrayer[0])} prayer had the most misses this cycle.`;
    }
  }
  
  // Check categories
  const weakCategory = Object.entries(categoryStats).sort((a, b) => (a[1] as number) - (b[1] as number))[0];
  if (weakCategory && (weakCategory[1] as number) < 3) {
    return `${capitalize(weakCategory[0])} was rarely included this cycle.`;
  }
  
  return 'Consistency weakened toward the end of heavy days.';
}

function identifyStrongestArea(categoryStats: any): string {
  const strongest = Object.entries(categoryStats).sort((a, b) => (b[1] as number) - (a[1] as number))[0];
  if (strongest && (strongest[1] as number) >= 5) {
    return `Your strongest area was ${strongest[0]}. You returned to it consistently.`;
  }
  return 'You showed up with intention, even on difficult days.';
}

function selectReflectionQuestion(completionRate: number, prayerStats: any): string {
  const questions = [
    'What helped you stay consistent this week?',
    'Which prayer felt hardest and why?',
    'What distracted you most during this cycle?',
    'What would you protect in the next cycle?',
    'Which day felt most aligned with your intention?',
    'What made the difference on your strongest days?'
  ];
  
  if (completionRate === 100) {
    return 'What made the difference on your strongest days?';
  }
  if (completionRate < 50) {
    return 'What distracted you most during this cycle?';
  }
  
  return questions[Math.floor(Math.random() * questions.length)];
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
