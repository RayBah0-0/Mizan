export type SalahPrayer = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
export type SalahStatus = 'ontime' | 'late' | null;

export type QuranOption = 'recitation' | 'reading' | 'reflection';
export type PhysicalOption = 'strength' | 'cardio' | 'walk' | 'mobility';
export type BuildOption = 'work' | 'skill' | 'output';

export interface SalahState {
  fajr: SalahStatus;
  dhuhr: SalahStatus;
  asr: SalahStatus;
  maghrib: SalahStatus;
  isha: SalahStatus;
}

export interface QuranState {
  selected: QuranOption[];
  duration?: number;
}

export interface PhysicalState {
  selected: PhysicalOption[];
  duration?: number;
}

export interface BuildState {
  selected: BuildOption[];
  description?: string;
}

export interface OptionalTaskState {
  completed: boolean;
  notes?: string;
}

export interface CategoryStates {
  salah: SalahState;
  quran: QuranState;
  physical: PhysicalState;
  build: BuildState;
  study: OptionalTaskState;
  journal: OptionalTaskState;
  rest: OptionalTaskState;
}

export interface DayEntry {
  categories: CategoryStates;
  submitted: boolean;
  completed: boolean;
  submittedAt?: string;
  penalties: Penalty[];
  pointsAwarded?: number;
  scoreBreakdown?: string[];
}

export type PenaltyType = 'extra-mile' | 'discipline-debt';

export interface Penalty {
  id: string;
  label: string;
  origin: string; // date key of the miss
  due: string; // date key penalty applies to
  type: PenaltyType;
  resolved: boolean;
}

export interface FeatureFlags {
  prioritySupport?: boolean;
  earlyAccess?: boolean;
  supportChannel?: 'discord' | 'email' | 'none';
}

export interface Settings {
  theme?: string;
  focusPhrase?: string;
  customCategories?: string[];
  featureFlags?: FeatureFlags;
}

export interface LeaderboardEntry {
  user: string;
  points: number;
}

export interface PointsLogEntry {
  date: string;
  points: number;
  breakdown: string[];
}

export interface MissionProgressEntry {
  completed: boolean;
  completedAt?: string;
  pointsAwarded?: number;
}

export interface AchievementProgressEntry {
  completed: boolean;
  completedAt?: string;
  pointsAwarded?: number;
}

export interface CycleRecord {
  id: string;
  days: string[]; // completed date keys in order
  niyyah?: string; // Premium: intention set for this cycle
  completedAt?: string; // ISO timestamp when cycle completed
}

export interface StoredData {
  checkins: Record<string, DayEntry>;
  cycles: CycleRecord[];
  settings: Settings;
}

import { syncData, saveCheckin, saveCycle, saveSettings } from './api';

const CHECKINS_KEY = 'mizan_v1_checkins';
const CYCLES_KEY = 'mizan_v1_cycles';
const SETTINGS_KEY = 'mizan_v1_settings';
const USER_KEY = 'mizan_v1_user';
const LAST_SYNC_KEY = 'mizan_v1_last_sync';
const LEADERBOARD_KEY = 'mizan_v1_leaderboard';
const POINTS_LOG_KEY = 'mizan_v1_points_log';
const MISSIONS_KEY = 'mizan_v1_missions';
const ACHIEVEMENTS_KEY = 'mizan_v1_achievements';

const defaultCategories: CategoryStates = {
  salah: {
    fajr: null,
    dhuhr: null,
    asr: null,
    maghrib: null,
    isha: null
  },
  quran: { selected: [] },
  physical: { selected: [] },
  build: { selected: [] },
  study: { completed: false },
  journal: { completed: false },
  rest: { completed: false }
};

export function getTodayKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getPreviousDayKey(date = new Date()): string {
  const copy = new Date(date);
  copy.setDate(copy.getDate() - 1);
  return getTodayKey(copy);
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return parsed as T;
  } catch (err) {
    console.warn('Failed to parse storage payload', err);
    return fallback;
  }
}

export function readCheckins(): Record<string, DayEntry> {
  if (typeof window === 'undefined') return {};
  return safeParse<Record<string, DayEntry>>(window.localStorage.getItem(CHECKINS_KEY), {});
}

export function writeCheckins(payload: Record<string, DayEntry>): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(CHECKINS_KEY, JSON.stringify(payload));
  
  // Note: Sync happens on submit, not on every toggle
}

export function readCycles(): CycleRecord[] {
  if (typeof window === 'undefined') return [];
  return safeParse<CycleRecord[]>(window.localStorage.getItem(CYCLES_KEY), []);
}

export function writeCycles(payload: CycleRecord[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(CYCLES_KEY, JSON.stringify(payload));
  
  // Note: Sync happens on cycle completion
}

export function readSettings(): Settings {
  if (typeof window === 'undefined') return {};
  const parsed = safeParse<Settings | null>(window.localStorage.getItem(SETTINGS_KEY), null) ?? {};
  return {
    theme: parsed.theme || 'dark',
    focusPhrase: parsed.focusPhrase || 'Consistency is earned.',
    customCategories: parsed.customCategories || [],
    featureFlags: {
      prioritySupport: parsed.featureFlags?.prioritySupport ?? false,
      earlyAccess: parsed.featureFlags?.earlyAccess ?? false,
      supportChannel: parsed.featureFlags?.supportChannel || 'discord'
    }
  };
}

export function writeSettings(payload: Settings): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(payload));

  // Persist to server when authenticated
  const token = localStorage.getItem('mizan_token');
  if (token) {
    saveSettings(payload).catch(() => {
      // Best-effort; keep local value even if network fails
    });
  }
}

export function getEmptyDay(): DayEntry {
  return { categories: JSON.parse(JSON.stringify(defaultCategories)), submitted: false, completed: false, penalties: [] };
}

export function clearAll(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(CHECKINS_KEY);
  window.localStorage.removeItem(CYCLES_KEY);
  window.localStorage.removeItem(SETTINGS_KEY);
  window.localStorage.removeItem(LEADERBOARD_KEY);
  window.localStorage.removeItem(POINTS_LOG_KEY);
  window.localStorage.removeItem(MISSIONS_KEY);
  window.localStorage.removeItem(ACHIEVEMENTS_KEY);
  
  // Clear notification settings
  window.localStorage.removeItem('mizan_notifications_enabled');
  window.localStorage.removeItem('mizan_notification_times');
  window.localStorage.removeItem('mizan_notify_daily_checkin');
  window.localStorage.removeItem('mizan_notify_cycle_end');
  window.localStorage.removeItem('mizan_reminders_per_day');
  
  // Clear premium features
  window.localStorage.removeItem('mizan_quiet_mode');
  window.localStorage.removeItem('mizan_recovery_reflections');
  window.localStorage.removeItem('mizan_guided_reflections');
  
  // Clear niyyah tracking (all cycles)
  const allKeys = Object.keys(window.localStorage);
  allKeys.forEach(key => {
    if (key.startsWith('niyyah_shown_') || key.startsWith('cycle_niyyah_')) {
      window.localStorage.removeItem(key);
    }
  });
  
  // Don't clear user key on reset - user stays logged in
}

// Category completion helpers
export function isSalahComplete(salah: SalahState): boolean {
  const prayers = Object.values(salah);
  return prayers.every((status) => status === 'ontime' || status === 'late');
}

export function salahLateCount(salah: SalahState): number {
  return Object.values(salah).filter((status) => status === 'late').length;
}

export function isQuranComplete(quran: QuranState): boolean {
  return quran.selected.length > 0 && (quran.duration ?? 0) >= 10;
}

export function isPhysicalComplete(physical: PhysicalState): boolean {
  return physical.selected.length > 0 && (physical.duration ?? 0) >= 20;
}

export function isBuildComplete(build: BuildState): boolean {
  return build.selected.length > 0 && (build.description?.trim().length ?? 0) > 0;
}

export function countCompletedCategories(categories: CategoryStates): number {
  let count = 0;
  if (isSalahComplete(categories.salah)) count++;
  if (isQuranComplete(categories.quran)) count++;
  if (isPhysicalComplete(categories.physical)) count++;
  if (isBuildComplete(categories.build)) count++;
  if (categories.study.completed) count++;
  if (categories.journal.completed) count++;
  if (categories.rest.completed) count++;
  return count;
}

export function calculateDailyPoints(day: DayEntry): { points: number; breakdown: string[]; lateCount: number; completedCount: number } {
  const breakdown: string[] = [];
  let points = 0;

  const completedCount = countCompletedCategories(day.categories);

  // Base: 1 point per completed obligation (7 total)
  if (isSalahComplete(day.categories.salah)) {
    points += 1;
    breakdown.push('Salah completed: +1');
  }
  if (isQuranComplete(day.categories.quran)) {
    points += 1;
    breakdown.push("Qur'an completed: +1");
  }
  if (isPhysicalComplete(day.categories.physical)) {
    points += 1;
    breakdown.push('Physical completed: +1');
  }
  if (isBuildComplete(day.categories.build)) {
    points += 1;
    breakdown.push('Build completed: +1');
  }
  if (day.categories.study.completed) {
    points += 1;
    breakdown.push('Study completed: +1');
  }
  if (day.categories.journal.completed) {
    points += 1;
    breakdown.push('Journal completed: +1');
  }
  if (day.categories.rest.completed) {
    points += 1;
    breakdown.push('Rest completed: +1');
  }

  // Penalty: each late prayer removes 0.5 (min clamp 0 for Salah portion)
  const lateCount = salahLateCount(day.categories.salah);
  if (lateCount > 0) {
    const deduction = Math.min(points, lateCount * 0.5);
    points -= deduction;
    breakdown.push(`Late prayers (${lateCount}): -${deduction.toFixed(1)}`);
  }

  // Bonus: all 7 done => +2
  if (completedCount === 7) {
    points += 2;
    breakdown.push('All tasks completed: +2 bonus');
  }

  return { points, breakdown, lateCount, completedCount };
}

export function computeStreak(checkins: Record<string, DayEntry>, upToKey: string): number {
  const keys = Object.keys(checkins)
    .filter((k) => k <= upToKey)
    .sort();
  let streak = 0;
  for (let i = keys.length - 1; i >= 0; i -= 1) {
    const entry = checkins[keys[i]];
    if (entry?.submitted && entry.completed) {
      streak += 1;
    } else {
      break;
    }
  }
  return streak;
}

export function readLeaderboard(): LeaderboardEntry[] {
  if (typeof window === 'undefined') return [];
  return safeParse<LeaderboardEntry[]>(window.localStorage.getItem(LEADERBOARD_KEY), []);
}

export function writeLeaderboard(payload: LeaderboardEntry[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(payload));
}

export function readPointsLog(): PointsLogEntry[] {
  if (typeof window === 'undefined') return [];
  return safeParse<PointsLogEntry[]>(window.localStorage.getItem(POINTS_LOG_KEY), []);
}

export function appendPointsLog(entry: PointsLogEntry): void {
  if (typeof window === 'undefined') return;
  const current = readPointsLog();
  current.push(entry);
  window.localStorage.setItem(POINTS_LOG_KEY, JSON.stringify(current));
}

export function updateLeaderboard(user: string, delta: number): void {
  if (typeof window === 'undefined') return;
  if (!user) user = 'guest';
  const current = readLeaderboard();
  const existing = current.find((c) => c.user === user);
  if (existing) {
    existing.points += delta;
  } else {
    current.push({ user, points: delta });
  }
  writeLeaderboard(current);
}

export function updateLeaderboardUsername(oldUsername: string, newUsername: string): void {
  if (typeof window === 'undefined') return;
  if (!oldUsername || !newUsername) return;
  const current = readLeaderboard();
  const entry = current.find((c) => c.user === oldUsername);
  if (entry) {
    entry.user = newUsername;
    writeLeaderboard(current);
  }
}

export function readMissionsProgress(): Record<string, MissionProgressEntry> {
  if (typeof window === 'undefined') return {};
  return safeParse<Record<string, MissionProgressEntry>>(window.localStorage.getItem(MISSIONS_KEY), {});
}

export function writeMissionsProgress(payload: Record<string, MissionProgressEntry>): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(MISSIONS_KEY, JSON.stringify(payload));
}

export function readAchievementsProgress(): Record<string, AchievementProgressEntry> {
  if (typeof window === 'undefined') return {};
  return safeParse<Record<string, AchievementProgressEntry>>(window.localStorage.getItem(ACHIEVEMENTS_KEY), {});
}

export function writeAchievementsProgress(payload: Record<string, AchievementProgressEntry>): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(payload));
}

export type RankTitle = 'Ghāfil' | 'Muntabih' | 'Multazim' | 'Muwāẓib' | 'Muhāsib' | 'Muttazin';

export function calculateRank(completedDays: number, cyclesCompleted: number, hasRecovered: boolean): RankTitle {
  if (completedDays >= 30) return 'Muttazin';
  if (cyclesCompleted >= 7 && hasRecovered) return 'Muhāsib';
  if (cyclesCompleted >= 3) return 'Muwāẓib';
  if (cyclesCompleted >= 1) return 'Multazim';
  if (completedDays >= 1) return 'Muntabih';
  return 'Ghāfil';
}

// Sync all data from server
export async function syncFromServer(): Promise<void> {
  try {
    const token = localStorage.getItem('mizan_token');
    if (!token) return;

    const data = await syncData();

    // Update local storage with server data
    if (data.checkins && data.checkins.length > 0) {
      const checkinsMap: Record<string, DayEntry> = {};
      data.checkins.forEach((c: any) => {
        checkinsMap[c.date] = {
          categories: c.categories,
          submitted: c.completed,
          completed: c.completed,
          penalties: Array(c.penalties).fill({ id: '', label: '', origin: '', due: '', type: 'discipline-debt', resolved: false })
        };
      });
      window.localStorage.setItem(CHECKINS_KEY, JSON.stringify(checkinsMap));
    }

    if (data.cycles && data.cycles.length > 0) {
      const cycles: CycleRecord[] = data.cycles.map((c: any, index: number) => ({
        id: `cycle-${index + 1}`,
        days: c.days
      }));
      window.localStorage.setItem(CYCLES_KEY, JSON.stringify(cycles));
    }

    if (data.settings) {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(data.settings));
    }

    window.localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
  } catch (error) {
    console.error('Sync failed:', error);
    // Continue with local data
  }
}

export function readUser(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(USER_KEY);
}

export function writeUser(username: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(USER_KEY, username);
}

export function hasUser(): boolean {
  return !!readUser();
}
