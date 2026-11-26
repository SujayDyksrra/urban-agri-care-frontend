import type { Routine, ScheduleSlot } from '../../types/models';

/**
 * On-device routine planner (demo stand-in for an AI endpoint).
 * It never invents treatment steps: it only places the user's confirmed tasks
 * (or the guidance bullets) into free time around their routine.
 */
export const PLANNER_SOURCE = 'Routine planner (demo, on-device; no AI service called)';
export const defaultRoutine: Routine = { wake: 6 * 60 + 30, leave: 8 * 60, back: 18 * 60, sleep: 23 * 60, workDays: [1, 2, 3, 4, 5] };
export const routinePresets: { label: string; routine: Routine }[] = [
  { label: 'Office', routine: defaultRoutine },
  { label: 'Early', routine: { wake: 5 * 60, leave: 6 * 60, back: 15 * 60, sleep: 22 * 60, workDays: [1, 2, 3, 4, 5, 6] } },
  { label: 'Student', routine: { wake: 7 * 60, leave: 8 * 60, back: 17 * 60, sleep: 24 * 60 - 30, workDays: [1, 2, 3, 4, 5] } },
  { label: 'Home', routine: { wake: 7 * 60 + 30, leave: 9 * 60, back: 9 * 60, sleep: 23 * 60 + 30, workDays: [] } },
];

export const formatTime = (minutes: number) => {
  const m = ((Math.round(minutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};

/** Pulls bullet or numbered list items out of guidance Markdown. */
export function tasksFromMarkdown(markdown: string): string[] {
  return markdown.split('\n')
    .map((line) => line.trim().match(/^(?:[-*•]|\d+[.)])\s+(.+)$/)?.[1] ?? '')
    .map((text) => text.replace(/\*\*|__/g, '').trim())
    .filter((text) => text.length > 3);
}

export function classifyTask(task: string): ScheduleSlot['kind'] {
  const t = task.toLowerCase();
  if (/water|irrigat|moist/.test(t)) return 'water';
  if (/spray|fungicide|pesticide|apply|copper|neem|treat/.test(t)) return 'treat';
  if (/remove|prune|cut|destroy|trim|clear/.test(t)) return 'prune';
  if (/inspect|check|monitor|observe|photo|record|look/.test(t)) return 'inspect';
  return 'general';
}

const everyDays: Record<ScheduleSlot['kind'], number> = { water: 1, inspect: 2, prune: 3, treat: 7, general: 2 };

function slotsFor(routine: Routine, workDay: boolean) {
  const awakeEnd = routine.sleep <= routine.wake ? routine.sleep + 1440 : routine.sleep;
  const homeEvening = routine.back + 30 <= awakeEnd - 60 ? routine.back + 30 : null;
  const beforeWork = routine.wake + 20 <= routine.leave - 15 ? routine.wake + 20 : null;
  // Off days: a relaxed morning slot that is still cool (no later than 09:30 unless the user wakes later).
  const offMorning = Math.max(routine.wake + 60, Math.min(9 * 60 + 30, routine.wake + 120));
  return {
    morning: workDay ? beforeWork : offMorning,
    evening: workDay ? homeEvening : Math.max(offMorning + 60, 17 * 60),
    fallback: workDay ? (homeEvening ?? routine.wake + 15) : offMorning,
  };
}

const reasons: Record<ScheduleSlot['kind'], { morning: string; evening: string; off: string }> = {
  water: { morning: 'Before you leave: watering early lets leaves dry during the day.', evening: 'No time before work, so water at the base when you are back and keep the leaves dry.', off: 'Morning watering on your day off, at the base of the plant.' },
  treat: { morning: 'Cool morning on a day off, so there is time to follow the product label carefully.', evening: 'No free day this week, so do it after work when it is cooler than midday.', off: 'Day off with a cool morning: best time for a careful treatment step.' },
  prune: { morning: 'Done on a free morning so you have daylight to see affected leaves.', evening: 'After work, while there is still light, so it does not wait until the weekend.', off: 'Free morning with good light to spot affected leaves.' },
  inspect: { morning: 'Quick morning look before your day starts.', evening: 'A 5-minute check when you get home.', off: 'Relaxed check on your day off; add a journal photo.' },
  general: { morning: 'Fits before your day starts.', evening: 'Fits in your free time after work.', off: 'Scheduled on your day off.' },
};

export function generateSchedule(tasks: string[], routine: Routine, start: Date, days = 7): ScheduleSlot[] {
  const slots: ScheduleSlot[] = [];
  const first = new Date(start); first.setHours(0, 0, 0, 0);
  const offDays = Array.from({ length: days }, (_, i) => i).filter((i) => !routine.workDays.includes(new Date(first.getTime() + i * 86400000).getDay()));
  tasks.forEach((task, taskIndex) => {
    const kind = classifyTask(task);
    const step = everyDays[kind];
    // Heavier work (treat/prune) is anchored on the first day off when one exists.
    const anchor = (kind === 'treat' || kind === 'prune') && offDays.length ? offDays[0] % step : 0;
    for (let i = anchor; i < days; i += step) {
      let dayIndex = i;
      if ((kind === 'treat' || kind === 'prune') && offDays.length) {
        const nextOff = offDays.find((d) => d >= i && d < i + step);
        if (nextOff !== undefined) dayIndex = nextOff;
      }
      const date = new Date(first.getTime() + dayIndex * 86400000);
      const workDay = routine.workDays.includes(date.getDay());
      const times = slotsFor(routine, workDay);
      const wantsMorning = kind === 'water' || kind === 'treat' || kind === 'prune';
      const preferred = wantsMorning ? times.morning : times.evening;
      const time = (preferred ?? (wantsMorning ? times.evening : times.morning) ?? times.fallback) + (taskIndex % 3) * 10;
      const usedMorning = preferred !== null && wantsMorning;
      const reason = !workDay ? reasons[kind].off : usedMorning || (!wantsMorning && times.evening === null) ? reasons[kind].morning : reasons[kind].evening;
      const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      if (!slots.some((slot) => slot.date === iso && slot.task === task)) slots.push({ id: `${iso}-${taskIndex}-${time}`, date: iso, time, task, reason, kind });
    }
  });
  return slots.sort((a, b) => a.date.localeCompare(b.date) || a.time - b.time);
}
