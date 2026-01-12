import { useEffect, useMemo, useState } from 'react';
import { readCheckins, readCycles, writeCycles, CycleRecord, DayEntry } from '@/utils/storage';

function getCompletedDates(checkins: Record<string, DayEntry>): string[] {
  return Object.keys(checkins)
    .filter((key) => checkins[key]?.submitted && checkins[key]?.completed)
    .sort();
}

function buildCyclesFromDates(completedDates: string[], existingCycles: CycleRecord[] = []): CycleRecord[] {
  const cycles: CycleRecord[] = [];
  let current: CycleRecord = { id: `cycle-${cycles.length + 1}`, days: [] };

  completedDates.forEach((date) => {
    if (current.days.includes(date)) return;
    if (current.days.length === 7) {
      // Preserve niyyah and completedAt from existing cycle with same days
      const existing = existingCycles.find(c => 
        c.days.length === 7 && c.days.every((d, i) => d === current.days[i])
      );
      if (existing) {
        current.niyyah = existing.niyyah;
        current.completedAt = existing.completedAt || new Date().toISOString();
      } else {
        current.completedAt = new Date().toISOString();
      }
      cycles.push(current);
      current = { id: `cycle-${cycles.length + 1}`, days: [] };
    }
    current.days.push(date);
  });

  if (current.days.length) {
    // For current incomplete cycle, preserve niyyah from existing
    const existing = existingCycles.find(c => 
      c.days.length < 7 && c.id === current.id
    );
    if (existing?.niyyah) {
      current.niyyah = existing.niyyah;
    }
    cycles.push(current);
  }

  return cycles;
}

export interface CycleState {
  cycles: CycleRecord[];
  cyclesCompleted: number;
  currentProgress: number;
  setCurrentNiyyah: (niyyah: string) => void;
  getCurrentNiyyah: () => string | undefined;
}

export function useCycle(): CycleState {
  const [cycles, setCycles] = useState<CycleRecord[]>(() => readCycles());

  useEffect(() => {
    const checkins = readCheckins();
    const completedDates = getCompletedDates(checkins);
    const existing = readCycles();
    const rebuilt = buildCyclesFromDates(completedDates, existing);
    setCycles(rebuilt);
    writeCycles(rebuilt);
  }, []);

  const derived = useMemo(() => {
    const completedCycles = cycles.filter((c) => c.days.length === 7).length;
    const current = cycles[cycles.length - 1];
    const currentProgress = current ? Math.min(current.days.length, 7) : 0;
    return { cyclesCompleted: completedCycles, currentProgress };
  }, [cycles]);

  const setCurrentNiyyah = (niyyah: string) => {
    const updated = [...cycles];
    if (updated.length > 0) {
      updated[updated.length - 1].niyyah = niyyah;
      setCycles(updated);
      writeCycles(updated);
    }
  };

  const getCurrentNiyyah = () => {
    const current = cycles[cycles.length - 1];
    return current?.niyyah;
  };

  return {
    cycles,
    cyclesCompleted: derived.cyclesCompleted,
    currentProgress: derived.currentProgress,
    setCurrentNiyyah,
    getCurrentNiyyah
  };
}
