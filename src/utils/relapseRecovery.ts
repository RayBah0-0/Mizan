import { readCheckins } from './storage';

export interface RelapseDetection {
  isInRelapse: boolean;
  consecutiveMisses: number;
  lastCheckInDate: string | null;
  daysSinceLastCheckIn: number;
  message: string;
}

/**
 * Detect if user is in a relapse state (multiple consecutive misses)
 * A relapse is defined as 3+ consecutive days without a check-in
 */
export function detectRelapse(): RelapseDetection {
  const checkins = readCheckins();
  const checkIns = Object.entries(checkins).map(([date, entry]) => ({ date, ...entry }));
  
  if (checkIns.length === 0) {
    return {
      isInRelapse: false,
      consecutiveMisses: 0,
      lastCheckInDate: null,
      daysSinceLastCheckIn: 0,
      message: ''
    };
  }

  // Sort check-ins by date (most recent first)
  const sortedCheckIns = [...checkIns].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const lastCheckIn = sortedCheckIns[0];
  const lastCheckInDate = new Date(lastCheckIn.date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  lastCheckInDate.setHours(0, 0, 0, 0);

  const daysSinceLastCheckIn = Math.floor(
    (today.getTime() - lastCheckInDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Count consecutive missed days (starting from today going backwards)
  let consecutiveMisses = 0;
  const currentDate = new Date(today);
  
  while (consecutiveMisses < 30) { // Cap at 30 days to avoid infinite loops
    const dateStr = currentDate.toISOString().split('T')[0];
    const hasCheckIn = checkIns.some(c => c.date === dateStr);
    
    if (hasCheckIn) {
      break;
    }
    
    consecutiveMisses++;
    currentDate.setDate(currentDate.getDate() - 1);
  }

  // Relapse threshold: 3+ consecutive misses
  const isInRelapse = consecutiveMisses >= 3;

  let message = '';
  if (isInRelapse) {
    if (consecutiveMisses >= 7) {
      message = "You can return. The door is always open.";
    } else if (consecutiveMisses >= 5) {
      message = "Come back. Allah's mercy is greater than any gap.";
    } else {
      message = "Return before the gap grows. You can still rebuild.";
    }
  }

  return {
    isInRelapse,
    consecutiveMisses,
    lastCheckInDate: lastCheckIn.date,
    daysSinceLastCheckIn,
    message
  };
}

/**
 * Get recovery prompt questions based on relapse duration
 */
export function getRecoveryPrompts(consecutiveMisses: number): string[] {
  if (consecutiveMisses >= 7) {
    return [
      "What pulled you away?",
      "What made it hard to return?",
      "What would help you come back to this?"
    ];
  } else if (consecutiveMisses >= 5) {
    return [
      "What made these days harder?",
      "What distracted you from Salah?",
      "What's one small step you could take today?"
    ];
  } else {
    return [
      "What happened these last few days?",
      "Which prayer felt hardest to maintain?",
      "What would make tomorrow easier?"
    ];
  }
}

/**
 * Store user's recovery reflection (optional)
 */
export function saveRecoveryReflection(reflection: string): void {
  const reflections = getRecoveryReflections();
  reflections.push({
    date: new Date().toISOString(),
    reflection,
    consecutiveMisses: detectRelapse().consecutiveMisses
  });
  
  // Keep only last 10 reflections
  if (reflections.length > 10) {
    reflections.splice(0, reflections.length - 10);
  }
  
  localStorage.setItem('mizan_recovery_reflections', JSON.stringify(reflections));
}

/**
 * Get all recovery reflections
 */
export function getRecoveryReflections(): Array<{
  date: string;
  reflection: string;
  consecutiveMisses: number;
}> {
  try {
    const stored = localStorage.getItem('mizan_recovery_reflections');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}
