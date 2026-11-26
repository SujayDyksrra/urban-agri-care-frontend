import { useLocalStore } from '../storage/LocalStore';
import { syncSlotReminders } from '../reminders/local';
import { useToast } from '../../components/Motion';
import { currentStreak, scheduleDays } from './streak';

export const isoToday = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

/**
 * Tick or untick one scheduled step, from any screen. Refreshes reminders so finished steps stop ringing,
 * toasts the streak when today becomes complete, and reports when the whole plan is done.
 */
export function useToggleSlot() {
  const { data, update } = useLocalStore();
  const toast = useToast();
  return async (planId: string, slotId: string): Promise<{ allDone: boolean } | null> => {
    const plan = data.plans.find((item) => item.id === planId);
    if (!plan?.schedule) return null;
    const today = isoToday();
    const slots = plan.schedule.slots;
    const nextSlots = slots.map((slot) => slot.id === slotId ? { ...slot, done: !slot.done, doneAt: slot.done ? undefined : new Date().toISOString() } : slot);
    const plantName = data.plants.find((item) => item.id === plan.plantId)?.name ?? 'Your plant';
    const ids = plan.schedule.remind ? await syncSlotReminders(plantName, nextSlots, true, plan.schedule.notificationIds).catch(() => plan.schedule?.notificationIds) : plan.schedule.notificationIds;
    await update((old) => ({ ...old, plans: old.plans.map((item) => item.id === planId && item.schedule ? { ...item, schedule: { ...item.schedule, slots: nextSlots, notificationIds: ids } } : item) }));
    const allDone = nextSlots.every((slot) => slot.done);
    // Streak across every plant, so Home, Schedule and the care plan agree.
    const allSlots = (list: typeof slots) => data.plans.flatMap((item) => item.id === planId ? list : item.schedule?.slots ?? []);
    const before = scheduleDays(allSlots(slots), today).find((day) => day.date === today)?.state;
    const afterDays = scheduleDays(allSlots(nextSlots), today);
    if (!allDone && before !== 'done' && afterDays.find((day) => day.date === today)?.state === 'done') toast(`Today done · ${currentStreak(afterDays, today)}-day streak`, 'flame');
    return { allDone };
  };
}
