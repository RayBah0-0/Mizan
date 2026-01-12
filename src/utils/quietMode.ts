/**
 * Quiet Mode - Premium feature to hide gamification elements
 * Users can focus on intention and completion without streaks/points/ranks
 */

export function isQuietModeEnabled(): boolean {
  const saved = localStorage.getItem('mizan_quiet_mode');
  return saved === 'true';
}

export function setQuietMode(enabled: boolean): void {
  localStorage.setItem('mizan_quiet_mode', enabled.toString());
}
