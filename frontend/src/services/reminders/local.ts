import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { ScheduleSlot } from '../../types/models';

Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }) });
export async function scheduleCheckIn(plantName: string, date: Date): Promise<string> {
  if (date.getTime() <= Date.now()) throw new Error('Choose a future date and time.');
  if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync('care-check-in', { name: 'Plant care check-ins', importance: 3 });
  const existing = await Notifications.getPermissionsAsync();
  const permission = existing.granted ? existing : await Notifications.requestPermissionsAsync();
  if (!permission.granted) throw new Error('Reminder not enabled: notification permission denied.');
  return Notifications.scheduleNotificationAsync({ content: { title: `Check ${plantName}`, body: 'Time for your plant care check-in.' }, trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date, ...(Platform.OS === 'android' ? { channelId: 'care-check-in' } : {}) } });
}
export async function cancelCheckIn(id?: string) { if (id) await Notifications.cancelScheduledNotificationAsync(id); }

/**
 * Replace a schedule's reminders: cancels the old ones, then (when `on`) schedules one
 * notification per future, unfinished step. Web has no local notifications, so it only keeps the setting.
 */
export async function syncSlotReminders(plantName: string, slots: ScheduleSlot[], on: boolean, oldIds: string[] = []): Promise<string[]> {
  await Promise.all(oldIds.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined)));
  if (!on || Platform.OS === 'web') return [];
  if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync('care-check-in', { name: 'Plant care check-ins', importance: 3 });
  const existing = await Notifications.getPermissionsAsync();
  const permission = existing.granted ? existing : await Notifications.requestPermissionsAsync();
  if (!permission.granted) throw new Error('Notifications are off for this app.');
  const now = Date.now();
  const due = slots.map((slot) => ({ slot, date: slotDate(slot) })).filter((item) => !item.slot.done && item.date.getTime() > now).slice(0, 40);
  return Promise.all(due.map(({ slot, date }) => Notifications.scheduleNotificationAsync({ content: { title: plantName, body: slot.task }, trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date, ...(Platform.OS === 'android' ? { channelId: 'care-check-in' } : {}) } })));
}
export function slotDate(slot: ScheduleSlot) { const d = new Date(`${slot.date}T00:00:00`); d.setMinutes(slot.time); return d; }
