import type { ScheduleSlot } from '../../types/models';

export type DayState = 'done' | 'missed' | 'today' | 'future';
export type ScheduleDay = { date: string; total: number; done: number; state: DayState };

/**
 * One entry per scheduled day. A day is "done" when every care moment on it is ticked.
 * Today stays "today" until it is done; earlier unfinished days are "missed".
 */
export function scheduleDays(slots: ScheduleSlot[], today: string): ScheduleDay[] {
  const days = new Map<string, ScheduleDay>();
  slots.forEach((slot) => {
    const day = days.get(slot.date) ?? { date: slot.date, total: 0, done: 0, state: 'future' as DayState };
    day.total += 1; if (slot.done) day.done += 1;
    days.set(slot.date, day);
  });
  return [...days.values()].sort((a, b) => a.date.localeCompare(b.date)).map((day) => ({
    ...day,
    state: day.done === day.total ? 'done' : day.date < today ? 'missed' : day.date === today ? 'today' : 'future',
  }));
}

/** Consecutive finished days ending today (or yesterday, while today is still open). */
export function currentStreak(days: ScheduleDay[], today: string): number {
  let streak = 0;
  for (const day of [...days].reverse()) {
    if (day.date > today) continue;
    if (day.state === 'done') streak += 1;
    else if (day.state === 'today') continue;
    else break;
  }
  return streak;
}
