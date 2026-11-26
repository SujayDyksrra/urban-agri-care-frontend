/** The app is in English, so dates follow English formatting whatever the phone's language is. */
export const LOCALE = 'en-GB';
const time = (d: Date) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
/** Short, readable date-time for lists: "15 Nov 2026, 7:08 PM" (no seconds). */
export const formatDateTime = (value: string | number | Date) => { const d = new Date(value); return `${formatDate(d)}, ${time(d)}`; };
export const formatDate = (value: string | number | Date) => new Date(value).toLocaleDateString(LOCALE, { day: 'numeric', month: 'short', year: 'numeric' });
/** Even shorter, for dense lists: "Today, 10:26 PM", "Yesterday, 9:00 AM", "14 Nov, 8:15 AM", "3 Jan 2025". */
export const formatWhen = (value: string | number | Date) => {
  const d = new Date(value); const now = new Date();
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(now) - day(d)) / 86400000);
  if (diff === 0) return `Today, ${time(d)}`;
  if (diff === 1) return `Yesterday, ${time(d)}`;
  if (d.getFullYear() === now.getFullYear()) return `${d.toLocaleDateString(LOCALE, { day: 'numeric', month: 'short' })}, ${time(d)}`;
  return formatDate(d);
};
export const plural = (n: number, word: string, many = `${word}s`) => `${n} ${n === 1 ? word : many}`;
