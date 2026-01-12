/**
 * Mirror Insights - Premium Feature
 * Gentle pattern analysis showing consistency insights
 */

import { readCheckins, DayEntry } from './storage';

export interface MirrorInsight {
  type: 'prayer_weakness' | 'day_pattern' | 'category_strength' | 'rest_correlation';
  message: string;
  icon: 'prayer' | 'calendar' | 'fire' | 'rest';
}

export function generateMirrorInsights(limit: number = 2): MirrorInsight[] {
  const checkins = readCheckins();
  const entries = Object.entries(checkins)
    .filter(([_, entry]) => entry.submitted)
    .sort(([a], [b]) => b.localeCompare(a)) // Most recent first
    .slice(0, 21); // Last 3 weeks
  
  if (entries.length < 7) {
    return []; // Not enough data
  }
  
  const insights: MirrorInsight[] = [];
  
  // Check prayer patterns
  const prayerInsight = analyzePrayerWeakness(entries);
  if (prayerInsight) insights.push(prayerInsight);
  
  // Check day-of-week patterns
  const dayInsight = analyzeDayPatterns(entries);
  if (dayInsight) insights.push(dayInsight);
  
  // Check rest correlation
  const restInsight = analyzeRestCorrelation(entries);
  if (restInsight) insights.push(restInsight);
  
  // Check category strength
  const categoryInsight = analyzeCategoryStrength(entries);
  if (categoryInsight) insights.push(categoryInsight);
  
  return insights.slice(0, limit);
}

function analyzePrayerWeakness(entries: [string, DayEntry][]): MirrorInsight | null {
  const prayers = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
  const stats: Record<string, { completed: number, total: number }> = {};
  
  prayers.forEach(prayer => {
    stats[prayer] = { completed: 0, total: 0 };
    entries.forEach(([_, entry]) => {
      if (entry.categories?.salah?.[prayer] !== undefined) {
        stats[prayer].total++;
        if (entry.categories.salah[prayer] === 'ontime' || entry.categories.salah[prayer] === 'late') {
          stats[prayer].completed++;
        }
      }
    });
  });
  
  // Find weakest prayer
  const weakest = Object.entries(stats)
    .filter(([_, s]) => s.total >= 5) // Need enough data
    .sort((a, b) => {
      const rateA = a[1].completed / a[1].total;
      const rateB = b[1].completed / b[1].total;
      return rateA - rateB;
    })[0];
  
  if (weakest && weakest[1].total > 0) {
    const rate = (weakest[1].completed / weakest[1].total) * 100;
    if (rate < 65) {
      const prayerName = capitalize(weakest[0]);
      return {
        type: 'prayer_weakness',
        message: `${prayerName} is where consistency weakens most often.`,
        icon: 'prayer'
      };
    }
  }
  
  return null;
}

function analyzeDayPatterns(entries: [string, DayEntry][]): MirrorInsight | null {
  const dayStats: Record<string, { completed: number, total: number }> = {
    Mon: { completed: 0, total: 0 },
    Tue: { completed: 0, total: 0 },
    Wed: { completed: 0, total: 0 },
    Thu: { completed: 0, total: 0 },
    Fri: { completed: 0, total: 0 },
    Sat: { completed: 0, total: 0 },
    Sun: { completed: 0, total: 0 },
  };
  
  entries.forEach(([dateKey, entry]) => {
    const date = new Date(dateKey);
    const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];
    dayStats[dayName].total++;
    if (entry.completed) {
      dayStats[dayName].completed++;
    }
  });
  
  // Find strongest day
  const strongest = Object.entries(dayStats)
    .filter(([_, s]) => s.total >= 2)
    .sort((a, b) => {
      const rateA = a[1].completed / a[1].total;
      const rateB = b[1].completed / b[1].total;
      return rateB - rateA;
    })[0];
  
  if (strongest && strongest[1].total >= 3) {
    const rate = (strongest[1].completed / strongest[1].total) * 100;
    if (rate >= 75) {
      return {
        type: 'day_pattern',
        message: `Your strongest days tend to be ${strongest[0]}days.`,
        icon: 'calendar'
      };
    }
  }
  
  return null;
}

function analyzeRestCorrelation(entries: [string, DayEntry][]): MirrorInsight | null {
  let withRest = 0;
  let withoutRest = 0;
  let completedWithRest = 0;
  let completedWithoutRest = 0;
  
  entries.forEach(([_, entry]) => {
    const hadRest = entry.categories?.rest?.completed === true;
    if (hadRest) {
      withRest++;
      if (entry.completed) completedWithRest++;
    } else {
      withoutRest++;
      if (entry.completed) completedWithoutRest++;
    }
  });
  
  if (withRest >= 3 && withoutRest >= 3) {
    const restRate = completedWithRest / withRest;
    const noRestRate = withoutRest > 0 ? completedWithoutRest / withoutRest : 0;
    
    if (noRestRate < restRate - 0.2) {
      return {
        type: 'rest_correlation',
        message: 'Misses cluster when rest is skipped.',
        icon: 'rest'
      };
    }
  }
  
  return null;
}

function analyzeCategoryStrength(entries: [string, DayEntry][]): MirrorInsight | null {
  const categories = ['quran', 'physical', 'build', 'study', 'journal'];
  const stats: Record<string, number> = {};
  
  categories.forEach(cat => {
    let count = 0;
    entries.forEach(([_, entry]) => {
      const catData = entry.categories?.[cat as keyof typeof entry.categories];
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
  
  const strongest = Object.entries(stats).sort((a, b) => b[1] - a[1])[0];
  if (strongest && strongest[1] >= entries.length * 0.6) {
    return {
      type: 'category_strength',
      message: `Days with ${strongest[0]} tend to be more consistent.`,
      icon: 'fire'
    };
  }
  
  return null;
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
