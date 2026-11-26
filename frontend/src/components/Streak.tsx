import { LOCALE } from '../utils/dates';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PopIn } from './Motion';
import { Icon } from './Ui';
import type { ScheduleDay } from '../services/routine/streak';
import { font, theme, type } from '../theme';

export const FLAME = '#D9822B';

/** Streak count plus one flame per day: filled when the day is done, outline otherwise. */
export default function StreakRow({ days, streak, right }: { days: ScheduleDay[]; streak: number; right?: ReactNode }) {
  return <View style={s.row}>
    <View style={s.head}><Icon name={streak ? 'flame' : 'flame-outline'} size={18} color={FLAME} /><Text style={s.count}>{streak}</Text></View>
    <View style={s.flames}>{days.map((day) => { const d = new Date(`${day.date}T00:00:00`); return <View key={day.date} style={[s.day, day.state === 'future' && { opacity: 0.4 }]} accessibilityLabel={`${d.toDateString()}: ${day.state}`}>
      <PopIn key={day.state}><Icon name={day.state === 'done' ? 'flame' : 'flame-outline'} size={20} color={day.state === 'missed' ? theme.border : FLAME} /></PopIn>
      <Text style={[s.label, day.state === 'today' && { color: theme.text, fontFamily: font.bold }]}>{d.toLocaleDateString(LOCALE, { weekday: 'narrow' })}</Text>
    </View>; })}</View>
    {right}
  </View>;
}

/** Up to 7 scheduled days around today, for a compact week view. */
export function weekWindow(days: ScheduleDay[], today: string) {
  const d = new Date(`${today}T00:00:00`); d.setDate(d.getDate() - 3);
  const from = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return days.filter((day) => day.date >= from).slice(0, 7);
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 3, minWidth: 34 },
  count: { fontFamily: font.semibold, fontSize: type.body, color: theme.text },
  flames: { flex: 1, flexDirection: 'row', justifyContent: 'space-between' },
  day: { alignItems: 'center', gap: 2, minWidth: 24 },
  label: { fontFamily: font.regular, fontSize: type.caption, color: theme.muted },
});
