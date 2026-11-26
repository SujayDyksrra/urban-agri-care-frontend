// import { useMemo, useState } from 'react';
// import { Pressable, StyleSheet, Text, View } from 'react-native';
// import { router } from 'expo-router';
// import { Button, Icon, Page, Pill, SectionTitle, ui, type IconName } from '../components/Ui';
// import { useLocalStore } from '../services/storage/LocalStore';
// import { formatTime } from '../services/routine/schedule';
// import { useToggleSlot } from '../services/routine/useToggleSlot';
// import type { ScheduleSlot } from '../types/models';
// import { font, shadow, theme, type, lineHeight } from '../theme';
// import { plural, LOCALE } from '../utils/dates';

// type Item = { id: string; date: string; time: number; plantName: string; planId: string; task: string; note?: string; kind: ScheduleSlot['kind'] | 'checkin'; remind?: boolean; done?: boolean; slotId?: string };
// const kindIcon: Record<Item['kind'], IconName> = { water: 'water-outline', treat: 'medkit-outline', prune: 'cut-outline', inspect: 'eye-outline', general: 'leaf-outline', checkin: 'notifications-outline' };
// const weekdays = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
// const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
// const period = (minutes: number) => minutes < 12 * 60 ? 'Morning' : minutes < 17 * 60 ? 'Afternoon' : 'Evening';

// export default function Schedule() {
//   const { data } = useLocalStore();
//   const toggleSlot = useToggleSlot();
//   const today = iso(new Date());
//   const [selected, setSelected] = useState(today);
//   const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });

//   // Every saved schedule slot and check-in, across all plants.
//   const items = useMemo(() => {
//     const list: Item[] = [];
//     data.plans.forEach((plan) => {
//       const plantName = data.plants.find((p) => p.id === plan.plantId)?.name ?? 'Plant';
//       plan.schedule?.slots.forEach((slot) => list.push({ id: `${plan.id}-${slot.id}`, date: slot.date, time: slot.time, plantName, planId: plan.id, task: slot.task, kind: slot.kind, remind: plan.schedule?.remind && !slot.done, done: slot.done, slotId: slot.id }));
//       if (plan.checkInAt) { const d = new Date(plan.checkInAt); list.push({ id: `${plan.id}-checkin`, date: iso(d), time: d.getHours() * 60 + d.getMinutes(), plantName, planId: plan.id, task: 'Check-in: look at the plant and add a journal photo', kind: 'checkin' }); }
//     });
//     return list.sort((a, b) => a.time - b.time);
//   }, [data.plans, data.plants]);
//   const countByDate = useMemo(() => items.reduce<Record<string, number>>((acc, item) => { acc[item.date] = (acc[item.date] ?? 0) + 1; return acc; }, {}), [items]);
//   const dayItems = items.filter((item) => item.date === selected);

//   // Month grid starting on Monday.
//   const first = month; const offset = (first.getDay() + 6) % 7;
//   const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
//   const cells: (Date | null)[] = [...Array(offset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => new Date(first.getFullYear(), first.getMonth(), i + 1))];
//   while (cells.length % 7) cells.push(null);
//   const shiftMonth = (delta: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + delta, 1));
//   const selDate = new Date(`${selected}T00:00:00`);
//   const groups = (['Morning', 'Afternoon', 'Evening'] as const).map((name) => ({ name, list: dayItems.filter((item) => period(item.time) === name) })).filter((g) => g.list.length);

//   return <Page title="Schedule" tab="schedule">
//     <View style={s.calendar}>
//       <View style={s.monthRow}>
//         <Pressable accessibilityRole="button" accessibilityLabel="Previous month" onPress={() => shiftMonth(-1)} style={s.arrow} hitSlop={8}><Icon name="chevron-back" size={18} color={theme.text} /></Pressable>
//         <Text style={ui.serifMedium}>{month.toLocaleDateString(LOCALE, { month: 'long', year: 'numeric' })}</Text>
//         <Pressable accessibilityRole="button" accessibilityLabel="Next month" onPress={() => shiftMonth(1)} style={s.arrow} hitSlop={8}><Icon name="chevron-forward" size={18} color={theme.text} /></Pressable>
//       </View>
//       <View style={s.week}>{weekdays.map((d) => <Text key={d} style={s.weekday}>{d}</Text>)}</View>
//       <View style={s.grid}>{cells.map((day, i) => {
//         if (!day) return <View key={`e${i}`} style={s.cell} />;
//         const key = iso(day); const on = key === selected; const isToday = key === today; const n = countByDate[key] ?? 0;
//         return <Pressable key={key} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={`${day.toDateString()}, ${plural(n, 'task')}`} onPress={() => setSelected(key)} style={s.cell}>
//           <View style={[s.dayCircle, isToday && s.today, on && s.selected]}><Text style={[s.dayNum, on && { color: '#fff', fontFamily: font.bold }]}>{day.getDate()}</Text></View>
//           <View style={s.dotRow}>{Array.from({ length: Math.min(n, 3) }).map((_, j) => <View key={j} style={[s.dot, on && { backgroundColor: theme.sage }]} />)}</View>
//         </Pressable>;
//       })}</View>
//     </View>

//     <SectionTitle title={selDate.toLocaleDateString(LOCALE, { weekday: 'long', day: 'numeric', month: 'short' })} />
//     {groups.length ? groups.map((group) => <View key={group.name}>
//       <View style={s.periodRow}><Icon name={group.name === 'Morning' ? 'sunny-outline' : group.name === 'Afternoon' ? 'partly-sunny-outline' : 'moon-outline'} size={15} color={theme.muted} /><Text style={ui.label}>{group.name}</Text></View>
//       {group.list.map((item) => <Pressable key={item.id} accessibilityRole="button" onPress={() => router.push({ pathname: '/care-plan', params: { id: item.planId } })} style={({ pressed }) => [s.slot, pressed && { opacity: 0.7 }]}>
//         <View style={s.timeCol}><Text style={s.time}>{formatTime(item.time)}</Text><View style={s.timeLine} /></View>
//         <View style={s.slotBody}>
//           <View style={s.slotHead}><View style={s.icon}><Icon name={kindIcon[item.kind]} size={17} /></View><Pill label={item.plantName} icon="leaf-outline" /><View style={{ flex: 1 }} />{item.slotId && item.date === today ? <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: !!item.done }} accessibilityLabel={item.task} hitSlop={10} onPress={() => void toggleSlot(item.planId, item.slotId!)}><Icon name={item.done ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={item.done ? theme.primary : theme.sage} /></Pressable> : item.done ? <Icon name="checkmark-circle" size={16} color={theme.primary} /> : item.remind ? <Icon name="notifications" size={15} color={theme.sage} /> : null}</View>
//           <Text style={[s.task, item.done && { color: theme.muted, textDecorationLine: 'line-through' }]}>{item.task}</Text>
//           {item.note ? <Text style={s.note}>{item.note}</Text> : null}
//         </View>
//       </Pressable>)}
//     </View>) : <View style={s.empty}><Icon name="calendar-clear-outline" size={26} color={theme.sage} /><Text style={s.emptyText}>Nothing planned.</Text></View>}
//     {data.plans.length ? null : <Button label="Scan a Leaf to Start" icon="scan-outline" onPress={() => router.push('/scan')} />}
//   </Page>;
// }
// const CELL = `${100 / 7}%` as const;
// const s = StyleSheet.create({
//   calendar: { backgroundColor: theme.surface, borderRadius: 24, padding: 14, marginBottom: 14, ...shadow },
//   monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
//   arrow: { width: 34, height: 34, borderRadius: 12, backgroundColor: theme.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
//   week: { flexDirection: 'row' },
//   weekday: { width: CELL, textAlign: 'center', color: theme.muted, fontSize: type.small, fontFamily: font.semibold, marginBottom: 6 },
//   grid: { flexDirection: 'row', flexWrap: 'wrap' },
//   cell: { width: CELL, alignItems: 'center', paddingVertical: 3, minHeight: 46 },
//   dayCircle: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
//   today: { borderWidth: 1.5, borderColor: theme.sage },
//   selected: { backgroundColor: theme.primary, borderColor: theme.primary },
//   dayNum: { color: theme.text, fontFamily: font.regular, fontSize: type.body },
//   dotRow: { flexDirection: 'row', gap: 2, height: 6, marginTop: 2 },
//   dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: theme.primary },
//   periodRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, marginTop: 4 },
//   slot: { flexDirection: 'row', gap: 12, marginBottom: 10 },
//   timeCol: { width: 50, alignItems: 'center' },
//   time: { fontFamily: font.bold, color: theme.primary, fontSize: type.body, marginTop: 14 },
//   timeLine: { flex: 1, width: 2, backgroundColor: theme.border, marginTop: 6, borderRadius: 1 },
//   slotBody: { flex: 1, backgroundColor: theme.surface, borderRadius: 18, padding: 14, ...shadow },
//   slotHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
//   icon: { width: 30, height: 30, borderRadius: 10, backgroundColor: theme.primarySoft, alignItems: 'center', justifyContent: 'center' },
//   task: { color: theme.text, fontSize: type.body, fontFamily: font.medium, lineHeight: lineHeight(type.body) },
//   note: { color: theme.muted, fontFamily: font.regular, fontSize: type.small, lineHeight: lineHeight(type.small), marginTop: 4 },
//   empty: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 20, borderWidth: 1, borderStyle: 'dashed', borderColor: theme.border, marginBottom: 16 },
//   emptyText: { flex: 1, color: theme.muted, fontFamily: font.regular, fontSize: type.body, lineHeight: lineHeight(type.body) },
// });

import { useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Icon, Page, Pill, SectionTitle, ui, type IconName } from '../components/Ui';
import { useLocalStore } from '../services/storage/LocalStore';
import { formatTime } from '../services/routine/schedule';
import { useToggleSlot } from '../services/routine/useToggleSlot';
import type { ScheduleSlot } from '../types/models';
import { font, shadow, theme, type, lineHeight } from '../theme';
import { plural, LOCALE } from '../utils/dates';
import { effective } from '../services/feedback/corrections';

type Item = { id: string; date: string; time: number; plantName: string; photoUri?: string; planId: string; task: string; note?: string; kind: ScheduleSlot['kind'] | 'checkin'; remind?: boolean; done?: boolean; slotId?: string };
const kindIcon: Record<Item['kind'], IconName> = { water: 'water-outline', treat: 'medkit-outline', prune: 'cut-outline', inspect: 'eye-outline', general: 'leaf-outline', checkin: 'notifications-outline' };
const weekdays = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const period = (minutes: number) => minutes < 12 * 60 ? 'Morning' : minutes < 17 * 60 ? 'Afternoon' : 'Evening';

function SlotThumb({ photoUri, kind }: { photoUri?: string; kind: Item['kind'] }) {
  const [failed, setFailed] = useState(false);
  if (photoUri && !failed) {
    return <Image source={{ uri: photoUri }} style={s.thumb} resizeMode="cover" onError={() => setFailed(true)} />;
  }
  return <View style={s.icon}><Icon name={kindIcon[kind]} size={17} /></View>;
}

export default function Schedule() {
  const { data } = useLocalStore();
  const toggleSlot = useToggleSlot();
  const today = iso(new Date());
  const [selected, setSelected] = useState(today);
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });

  // Every saved schedule slot and check-in, across all plants.
  const items = useMemo(() => {
    const list: Item[] = [];
    data.plans.forEach((plan) => {
      const plantName = data.plants.find((p) => p.id === plan.plantId)?.name ?? 'Plant';
      const diagPhoto = data.diagnoses.find((d) => d.id === plan.diagnosisId && d.photoUri)?.photoUri
        ?? data.diagnoses.map(effective).filter((d) => d.plantId === plan.plantId && d.photoUri).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]?.photoUri;
      const journalPhoto = data.journal.filter((j) => j.plantId === plan.plantId && j.photoUri).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]?.photoUri;
      const photoUri = diagPhoto ?? journalPhoto;

      plan.schedule?.slots.forEach((slot) => list.push({ id: `${plan.id}-${slot.id}`, date: slot.date, time: slot.time, plantName, photoUri, planId: plan.id, task: slot.task, kind: slot.kind, remind: plan.schedule?.remind && !slot.done, done: slot.done, slotId: slot.id }));
      if (plan.checkInAt) { const d = new Date(plan.checkInAt); list.push({ id: `${plan.id}-checkin`, date: iso(d), time: d.getHours() * 60 + d.getMinutes(), plantName, photoUri, planId: plan.id, task: 'Check-in: look at the plant and add a journal photo', kind: 'checkin' }); }
    });
    return list.sort((a, b) => a.time - b.time);
  }, [data.plans, data.plants, data.diagnoses, data.journal]);
  const countByDate = useMemo(() => items.reduce<Record<string, number>>((acc, item) => { acc[item.date] = (acc[item.date] ?? 0) + 1; return acc; }, {}), [items]);
  const dayItems = items.filter((item) => item.date === selected);

  // Month grid starting on Monday.
  const first = month; const offset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [...Array(offset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => new Date(first.getFullYear(), first.getMonth(), i + 1))];
  while (cells.length % 7) cells.push(null);
  const shiftMonth = (delta: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + delta, 1));
  const selDate = new Date(`${selected}T00:00:00`);
  const groups = (['Morning', 'Afternoon', 'Evening'] as const).map((name) => ({ name, list: dayItems.filter((item) => period(item.time) === name) })).filter((g) => g.list.length);

  return <Page title="Schedule" tab="schedule">
    <View style={s.calendar}>
      <View style={s.monthRow}>
        <Pressable accessibilityRole="button" accessibilityLabel="Previous month" onPress={() => shiftMonth(-1)} style={s.arrow} hitSlop={8}><Icon name="chevron-back" size={18} color={theme.text} /></Pressable>
        <Text style={ui.serifMedium}>{month.toLocaleDateString(LOCALE, { month: 'long', year: 'numeric' })}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Next month" onPress={() => shiftMonth(1)} style={s.arrow} hitSlop={8}><Icon name="chevron-forward" size={18} color={theme.text} /></Pressable>
      </View>
      <View style={s.week}>{weekdays.map((d) => <Text key={d} style={s.weekday}>{d}</Text>)}</View>
      <View style={s.grid}>{cells.map((day, i) => {
        if (!day) return <View key={`e${i}`} style={s.cell} />;
        const key = iso(day); const on = key === selected; const isToday = key === today; const n = countByDate[key] ?? 0;
        return <Pressable key={key} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={`${day.toDateString()}, ${plural(n, 'task')}`} onPress={() => setSelected(key)} style={s.cell}>
          <View style={[s.dayCircle, isToday && s.today, on && s.selected]}><Text style={[s.dayNum, on && { color: '#fff', fontFamily: font.bold }]}>{day.getDate()}</Text></View>
          <View style={s.dotRow}>{Array.from({ length: Math.min(n, 3) }).map((_, j) => <View key={j} style={[s.dot, on && { backgroundColor: theme.sage }]} />)}</View>
        </Pressable>;
      })}</View>
    </View>

    <SectionTitle title={selDate.toLocaleDateString(LOCALE, { weekday: 'long', day: 'numeric', month: 'short' })} />
    {groups.length ? groups.map((group) => <View key={group.name}>
      <View style={s.periodRow}><Icon name={group.name === 'Morning' ? 'sunny-outline' : group.name === 'Afternoon' ? 'partly-sunny-outline' : 'moon-outline'} size={15} color={theme.muted} /><Text style={ui.label}>{group.name}</Text></View>
      {group.list.map((item) => <Pressable key={item.id} accessibilityRole="button" onPress={() => router.push({ pathname: '/care-plan', params: { id: item.planId } })} style={({ pressed }) => [s.slot, pressed && { opacity: 0.7 }]}>
        <View style={s.timeCol}><Text style={s.time}>{formatTime(item.time)}</Text><View style={s.timeLine} /></View>
        <View style={s.slotBody}>
          <View style={s.slotHead}><SlotThumb photoUri={item.photoUri} kind={item.kind} /><Pill label={item.plantName} icon="leaf-outline" /><View style={{ flex: 1 }} />{item.slotId && item.date === today ? <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: !!item.done }} accessibilityLabel={item.task} hitSlop={10} onPress={() => void toggleSlot(item.planId, item.slotId!)}><Icon name={item.done ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={item.done ? theme.primary : theme.sage} /></Pressable> : item.done ? <Icon name="checkmark-circle" size={16} color={theme.primary} /> : item.remind ? <Icon name="notifications" size={15} color={theme.sage} /> : null}</View>
          <Text style={[s.task, item.done && { color: theme.muted, textDecorationLine: 'line-through' }]}>{item.task}</Text>
          {item.note ? <Text style={s.note}>{item.note}</Text> : null}
        </View>
      </Pressable>)}
    </View>) : <View style={s.empty}><Icon name="calendar-clear-outline" size={26} color={theme.sage} /><Text style={s.emptyText}>Nothing planned.</Text></View>}
    {data.plans.length ? null : <Button label="Scan a Leaf to Start" icon="scan-outline" onPress={() => router.push('/scan')} />}
  </Page>;
}
const CELL = `${100 / 7}%` as const;
const s = StyleSheet.create({
  calendar: { backgroundColor: theme.surface, borderRadius: 24, padding: 14, marginBottom: 14, ...shadow },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  arrow: { width: 34, height: 34, borderRadius: 12, backgroundColor: theme.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  week: { flexDirection: 'row' },
  weekday: { width: CELL, textAlign: 'center', color: theme.muted, fontSize: type.small, fontFamily: font.semibold, marginBottom: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: CELL, alignItems: 'center', paddingVertical: 3, minHeight: 46 },
  dayCircle: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  today: { borderWidth: 1.5, borderColor: theme.sage },
  selected: { backgroundColor: theme.primary, borderColor: theme.primary },
  dayNum: { color: theme.text, fontFamily: font.regular, fontSize: type.body },
  dotRow: { flexDirection: 'row', gap: 2, height: 6, marginTop: 2 },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: theme.primary },
  periodRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, marginTop: 4 },
  slot: { flexDirection: 'row', gap: 12, marginBottom: 10 },
  timeCol: { width: 50, alignItems: 'center' },
  time: { fontFamily: font.bold, color: theme.primary, fontSize: type.body, marginTop: 14 },
  timeLine: { flex: 1, width: 2, backgroundColor: theme.border, marginTop: 6, borderRadius: 1 },
  slotBody: { flex: 1, backgroundColor: theme.surface, borderRadius: 18, padding: 14, ...shadow },
  slotHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  icon: { width: 30, height: 30, borderRadius: 10, backgroundColor: theme.primarySoft, alignItems: 'center', justifyContent: 'center' },
  thumb: { width: 30, height: 30, borderRadius: 10, backgroundColor: theme.primarySoft },
  task: { color: theme.text, fontSize: type.body, fontFamily: font.medium, lineHeight: lineHeight(type.body) },
  note: { color: theme.muted, fontFamily: font.regular, fontSize: type.small, lineHeight: lineHeight(type.small), marginTop: 4 },
  empty: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 20, borderWidth: 1, borderStyle: 'dashed', borderColor: theme.border, marginBottom: 16 },
  emptyText: { flex: 1, color: theme.muted, fontFamily: font.regular, fontSize: type.body, lineHeight: lineHeight(type.body) },
});