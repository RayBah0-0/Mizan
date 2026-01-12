import { readCheckins } from './storage';

export interface WeeklyTrend {
  week: string; // "Week of Jan 1"
  completionRate: number; // 0-100
  daysTracked: number;
  totalPossibleDays: number;
}

export interface MonthlyTrend {
  month: string; // "January 2024"
  completionRate: number;
  daysTracked: number;
  totalPossibleDays: number;
  missedDays: number;
}

export interface PrayerTrend {
  prayer: 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
  completionRate: number;
  onTimeRate: number;
  totalDays: number;
}

/**
 * Generate weekly completion trends for the last 12 weeks
 */
export function generateWeeklyTrends(): WeeklyTrend[] {
  const checkins = readCheckins();
  const checkIns = Object.entries(checkins).map(([date, entry]) => ({ date, ...entry }));
  const trends: WeeklyTrend[] = [];
  const today = new Date();
  
  for (let weekOffset = 11; weekOffset >= 0; weekOffset--) {
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - (weekOffset * 7) - today.getDay()); // Start of week (Sunday)
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    
    // Count check-ins in this week
    let daysTracked = 0;
    let totalPossibleDays = 7;
    
    // If week is in the future, skip
    if (weekStart > today) continue;
    
    // If week includes today, adjust total possible days
    if (weekEnd > today) {
      totalPossibleDays = Math.floor((today.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    }
    
    for (let d = 0; d < 7; d++) {
      const checkDate = new Date(weekStart);
      checkDate.setDate(weekStart.getDate() + d);
      
      if (checkDate > today) break;
      
      const dateStr = checkDate.toISOString().split('T')[0];
      const hasCheckIn = checkIns.some(c => c.date === dateStr && c.submitted);
      
      if (hasCheckIn) daysTracked++;
    }
    
    const completionRate = totalPossibleDays > 0 
      ? Math.round((daysTracked / totalPossibleDays) * 100) 
      : 0;
    
    const weekLabel = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    trends.push({
      week: weekLabel,
      completionRate,
      daysTracked,
      totalPossibleDays
    });
  }
  
  return trends;
}

/**
 * Generate monthly completion trends for the last 6 months
 */
export function generateMonthlyTrends(): MonthlyTrend[] {
  const checkins = readCheckins();
  const checkIns = Object.entries(checkins).map(([date, entry]) => ({ date, ...entry }));
  const trends: MonthlyTrend[] = [];
  const today = new Date();
  
  for (let monthOffset = 5; monthOffset >= 0; monthOffset--) {
    const monthStart = new Date(today.getFullYear(), today.getMonth() - monthOffset, 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() - monthOffset + 1, 0);
    monthEnd.setHours(23, 59, 59, 999);
    
    // If month is in the future, skip
    if (monthStart > today) continue;
    
    let daysTracked = 0;
    let totalPossibleDays = monthEnd.getDate();
    
    // If month includes today, adjust
    if (monthEnd > today) {
      totalPossibleDays = today.getDate();
    }
    
    for (let d = 1; d <= totalPossibleDays; d++) {
      const checkDate = new Date(monthStart.getFullYear(), monthStart.getMonth(), d);
      const dateStr = checkDate.toISOString().split('T')[0];
      const hasCheckIn = checkIns.some(c => c.date === dateStr && c.submitted);
      
      if (hasCheckIn) daysTracked++;
    }
    
    const completionRate = totalPossibleDays > 0 
      ? Math.round((daysTracked / totalPossibleDays) * 100) 
      : 0;
    
    const missedDays = totalPossibleDays - daysTracked;
    
    const monthLabel = monthStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    
    trends.push({
      month: monthLabel,
      completionRate,
      daysTracked,
      totalPossibleDays,
      missedDays
    });
  }
  
  return trends;
}

/**
 * Analyze completion rates by prayer time
 */
export function analyzePrayerTrends(): PrayerTrend[] {
  const checkins = readCheckins();
  const checkIns = Object.entries(checkins).map(([date, entry]) => ({ date, ...entry }));
  const prayers: Array<'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha'> = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
  
  return prayers.map(prayer => {
    let completed = 0;
    let onTime = 0;
    let totalDays = 0;
    
    checkIns.forEach(checkIn => {
      if (checkIn.categories?.salah?.[prayer]) {
        totalDays++;
        const status = checkIn.categories.salah[prayer];
        if (status === 'ontime' || status === 'late') {
          completed++;
          if (status === 'ontime') {
            onTime++;
          }
        }
      }
    });
    
    const completionRate = totalDays > 0 ? Math.round((completed / totalDays) * 100) : 0;
    const onTimeRate = totalDays > 0 ? Math.round((onTime / totalDays) * 100) : 0;
    
    return {
      prayer,
      completionRate,
      onTimeRate,
      totalDays
    };
  });
}

/**
 * Calculate cycle consistency (percentage of cycles completed)
 */
export function calculateCycleConsistency(): {
  cyclesStarted: number;
  cyclesCompleted: number;
  consistencyRate: number;
  averageDaysPerCycle: number;
} {
  const checkins = readCheckins();
  const checkIns = Object.entries(checkins).map(([date, entry]) => ({ date, ...entry }));
  
  // Group check-ins into potential cycles (7 consecutive days)
  const sortedCheckIns = [...checkIns]
    .filter(c => c.submitted)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  let cyclesStarted = 0;
  let cyclesCompleted = 0;
  let currentStreak = 0;
  let totalDaysInCycles = 0;
  
  for (let i = 0; i < sortedCheckIns.length; i++) {
    const currentDate = new Date(sortedCheckIns[i].date);
    const prevDate = i > 0 ? new Date(sortedCheckIns[i - 1].date) : null;
    
    const isConsecutive = prevDate 
      ? (currentDate.getTime() - prevDate.getTime()) === (1000 * 60 * 60 * 24)
      : true;
    
    if (isConsecutive) {
      currentStreak++;
      if (currentStreak === 1) {
        cyclesStarted++;
      }
      if (currentStreak === 7) {
        cyclesCompleted++;
        totalDaysInCycles += 7;
        currentStreak = 0;
      }
    } else {
      if (currentStreak > 0 && currentStreak < 7) {
        totalDaysInCycles += currentStreak;
      }
      currentStreak = 1;
      cyclesStarted++;
    }
  }
  
  // Add final incomplete cycle
  if (currentStreak > 0 && currentStreak < 7) {
    totalDaysInCycles += currentStreak;
  }
  
  const consistencyRate = cyclesStarted > 0 
    ? Math.round((cyclesCompleted / cyclesStarted) * 100) 
    : 0;
  
  const averageDaysPerCycle = cyclesStarted > 0
    ? Math.round(totalDaysInCycles / cyclesStarted)
    : 0;
  
  return {
    cyclesStarted,
    cyclesCompleted,
    consistencyRate,
    averageDaysPerCycle
  };
}
