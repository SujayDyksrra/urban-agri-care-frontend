import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Banner, Button, Card, Choice, Icon, Page, ui, type IconName, Notice } from '../components/Ui';
import { Dialog, Sheet, useToast } from '../components/Motion';
import { goBack } from '../components/Ui';
import { useLocalStore } from '../services/storage/LocalStore';
import { syncSlotReminders } from '../services/reminders/local';
import { PLANNER_SOURCE, defaultRoutine, formatTime, generateSchedule, routinePresets, tasksFromMarkdown } from '../services/routine/schedule';
import type { Routine, ScheduleSlot } from '../types/models';
import { font, theme, type, lineHeight } from '../theme';

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const isoOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const shiftIso = (iso: string, days: number) => { const d = new Date(`${iso}T00:00:00`); d.setDate(d.getDate() + days); return isoOf(d); };
const dayLabel = (iso: string) => { const d = new Date(`${iso}T00:00:00`); return `${dayNames[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`; };
const weekOrder = [1, 2, 3, 4, 5, 6, 0];
const kindIcon: Record<ScheduleSlot['kind'], IconName> = { water: 'water-outline', treat: 'medkit-outline', prune: 'cut-outline', inspect: 'eye-outline', general: 'leaf-outline' };

function TimeRow({ icon, label, value, onChange }: { icon: IconName; label: string; value: number; onChange: (v: number) => void }) {
  const step = (delta: number) => onChange((((value + delta) % 1440) + 1440) % 1440);
  return <View style={s.timeRow}>
    <View style={s.timeIcon}><Icon name={icon} size={18} /></View>
    <Text style={s.timeLabel}>{label}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel={`${label} 30 minutes earlier`} onPress={() => step(-30)} style={s.stepBtn} hitSlop={6}><Icon name="remove" size={16} color={theme.text} /></Pressable>
    <Text style={s.timeValue}>{formatTime(value)}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel={`${label} 30 minutes later`} onPress={() => step(30)} style={s.stepBtn} hitSlop={6}><Icon name="add" size={16} color={theme.text} /></Pressable>
  </View>;
}

function Stepper({ icon, value, onMinus, onPlus }: { icon: IconName; value: string; onMinus?: () => void; onPlus: () => void }) {
  return <View style={s.stepper}>
    <Pressable accessibilityRole="button" accessibilityLabel={`Earlier than ${value}`} disabled={!onMinus} onPress={onMinus} hitSlop={6} style={[s.miniBtn, !onMinus && { opacity: 0.3 }]}><Icon name="chevron-back" size={14} color={theme.text} /></Pressable>
    <Icon name={icon} size={13} color={theme.muted} /><Text style={s.stepText}>{value}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel={`Later than ${value}`} onPress={onPlus} hitSlop={6} style={s.miniBtn}><Icon name="chevron-forward" size={14} color={theme.text} /></Pressable>
  </View>;
}

export default function RoutinePlanner() {
  const { planId, edit, fresh } = useLocalSearchParams<{ planId?: string; edit?: string; fresh?: string }>();
  const [ready, setReady] = useState(false);
  const { data, update } = useLocalStore();
  const plan = data.plans.find((item) => item.id === planId);
  const plant = data.plants.find((item) => item.id === plan?.plantId);
  const [routine, setRoutine] = useState<Routine>(data.routine ?? defaultRoutine);
  const [slots, setSlots] = useState<ScheduleSlot[] | null>(plan?.schedule?.slots ?? null);
  const [message, setMessage] = useState('');
  const [preview, setPreview] = useState(edit === '1' && !!plan?.schedule);
  const [openId, setOpenId] = useState('');
  const [remind, setRemind] = useState(plan?.schedule?.remind ?? true);
  const todayIso = isoOf(new Date());
  const patchSlot = (id: string, patch: Partial<ScheduleSlot>) => setSlots((old) => (old ?? []).map((slot) => slot.id === id ? { ...slot, ...patch } : slot));
  const removeSlot = (id: string) => { setSlots((old) => (old ?? []).filter((slot) => slot.id !== id)); setOpenId(''); };
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<{ date: string; time: number; task: string; kind: ScheduleSlot['kind'] }>({ date: todayIso, time: 9 * 60, task: '', kind: 'water' });
  const nextDays = Array.from({ length: 14 }, (_, i) => shiftIso(todayIso, i));
  const startAdd = () => { setDraft({ date: todayIso, time: 9 * 60, task: '', kind: 'water' }); setAdding(true); };
  const confirmAdd = () => { if (!draft.task.trim()) return; setSlots((old) => [...(old ?? []), { id: `custom-${Date.now()}`, ...draft, task: draft.task.trim(), reason: 'Added by you' }]); setAdding(false); toast('Step added', 'add-circle'); };
  const toast = useToast();
  const pending = plan ? plan.tasks.filter((task) => !task.done).map((task) => task.text) : [];
  const tasks = pending.length ? pending : plan ? tasksFromMarkdown(plan.markdown) : [];
  const set = (patch: Partial<Routine>) => { setRoutine((old) => ({ ...old, ...patch })); setSlots(null); };
  const toggleDay = (day: number) => set({ workDays: routine.workDays.includes(day) ? routine.workDays.filter((d) => d !== day) : [...routine.workDays, day] });
  const generate = async () => {
    if (!tasks.length) return setMessage('No tasks or guidance steps to schedule. Add tasks to the Care Plan first.');
    setSlots(generateSchedule(tasks, routine, new Date())); setOpenId(''); setPreview(true);
    try { await update((old) => ({ ...old, routine })); setMessage(''); } catch { setMessage('Schedule shown, but your routine could not be saved.'); }
  };
  const save = async () => {
    if (!plan || !slots) return;
    const kept = slots.filter((slot) => slot.task.trim()).map((slot) => ({ ...slot, task: slot.task.trim() }));
    let ids: string[] = []; let remindOn = remind; let blocked = false;
    try { ids = await syncSlotReminders(plant?.name ?? 'Your plant', kept, remind, plan.schedule?.notificationIds); } catch { remindOn = false; blocked = remind; }
    try { await update((old) => ({ ...old, routine, plans: old.plans.map((item) => item.id === plan.id ? { ...item, schedule: { createdAt: new Date().toISOString(), source: PLANNER_SOURCE, slots: kept, remind: remindOn, notificationIds: ids } } : item) })); setPreview(false); toast(blocked ? 'Saved · notifications blocked' : remindOn ? 'Saved · reminders on' : 'Schedule saved', blocked ? 'notifications-off' : remindOn ? 'notifications' : 'checkmark-circle'); if (fresh === '1') setReady(true); else goBack(); }
    catch { setMessage('Schedule was not saved.'); }
  };
  const byDay = useMemo(() => {
    const groups: { date: string; items: ScheduleSlot[] }[] = [];
    [...(slots ?? [])].sort((a, b) => a.date.localeCompare(b.date) || a.time - b.time).forEach((slot) => { const g = groups.find((item) => item.date === slot.date); if (g) g.items.push(slot); else groups.push({ date: slot.date, items: [slot] }); });
    return groups;
  }, [slots]);

const presetIcon: Record<string, IconName> = { Office: 'briefcase-outline', Early: 'alarm-outline', Student: 'school-outline', Home: 'home-outline' };

  if (!plan) return <Page title="Recovery Schedule" back><Banner tone="error" text="Care Plan not found. Open this from a Care Plan." /><Button label="Home" icon="home-outline" onPress={() => router.replace('/')} /></Page>;
  return <Page title={plant?.name ?? 'Schedule'} back>
    <View style={ui.rowWrap}>{routinePresets.map((preset) => <Choice key={preset.label} label={preset.label} active={JSON.stringify(preset.routine) === JSON.stringify(routine)} icon={presetIcon[preset.label] ?? 'person-outline'} onPress={() => { setRoutine(preset.routine); setSlots(null); }} />)}</View>
    <Card>
      <TimeRow icon="sunny-outline" label="Wake" value={routine.wake} onChange={(wake) => set({ wake })} />
      <TimeRow icon="car-outline" label="Leave" value={routine.leave} onChange={(leave) => set({ leave })} />
      <TimeRow icon="home-outline" label="Back" value={routine.back} onChange={(back) => set({ back })} />
      <TimeRow icon="moon-outline" label="Sleep" value={routine.sleep} onChange={(sleep) => set({ sleep })} />
      <View style={s.days}><View style={s.daysIcon}><Icon name="briefcase-outline" size={16} color={theme.muted} /></View>{weekOrder.map((day) => { const on = routine.workDays.includes(day); return <Pressable key={day} accessibilityRole="checkbox" accessibilityState={{ checked: on }} onPress={() => toggleDay(day)} style={[s.day, on && s.dayOn]}><Text style={[s.dayText, on && { color: '#fff' }]}>{dayNames[day].slice(0, 2)}</Text></Pressable>; })}</View>
    </Card>
    <Button label={slots ? 'Regenerate' : 'Generate'} icon="sparkles-outline" onPress={() => void generate()} />
    <Notice message={message} onClear={() => setMessage('')} />

    {slots && !preview ? <Button label="View" icon="calendar-outline" outline onPress={() => setPreview(true)} /> : null}
    <Sheet visible={preview && !!slots && !adding} onClose={() => setPreview(false)} title="Next steps">
      <Pressable accessibilityRole="switch" accessibilityState={{ checked: remind }} onPress={() => setRemind((v) => !v)} style={s.remindRow}>
        <Icon name={remind ? 'notifications' : 'notifications-off-outline'} size={18} color={remind ? theme.primary : theme.muted} />
        <Text style={s.remindText}>Remind me</Text>
        <Switch value={remind} onValueChange={setRemind} trackColor={{ true: theme.primary, false: theme.border }} thumbColor={theme.surface} />
      </Pressable>
      {byDay.map((group) => {
        const date = new Date(`${group.date}T00:00:00`);
        const work = routine.workDays.includes(date.getDay());
        return <View key={group.date} style={s.dayCard}>
          <View style={s.dayHead}><Text style={s.dayTitle}>{dayLabel(group.date)}</Text><Icon name={work ? 'briefcase-outline' : 'cafe-outline'} size={16} color={work ? theme.muted : theme.primary} /></View>
          {group.items.map((slot) => { const open = openId === slot.id; return <View key={slot.id} style={s.slotWrap}>
            <Pressable accessibilityRole="button" accessibilityLabel={`Edit ${slot.task || 'step'}`} onPress={() => setOpenId(open ? '' : slot.id)} style={s.slot}>
              <View style={s.slotTime}><Text style={s.slotTimeText}>{formatTime(slot.time)}</Text></View>
              <View style={s.slotIcon}><Icon name={kindIcon[slot.kind]} size={15} /></View>
              <Text style={[s.slotTask, { flex: 1 }, !slot.task && { color: theme.muted }]} numberOfLines={open ? undefined : 1}>{slot.task || 'New step'}</Text>
              <Icon name={open ? 'chevron-up' : 'create-outline'} size={15} color={theme.muted} />
            </Pressable>
            {open ? <View style={s.editor}>
              <TextInput value={slot.task} onChangeText={(task) => patchSlot(slot.id, { task })} placeholder="Step" placeholderTextColor={theme.muted} style={s.editInput} multiline autoFocus={!slot.task} />
              <View style={s.editRow}>
                <Stepper icon="calendar-outline" value={dayLabel(slot.date)} onMinus={slot.date > todayIso ? () => patchSlot(slot.id, { date: shiftIso(slot.date, -1) }) : undefined} onPlus={() => patchSlot(slot.id, { date: shiftIso(slot.date, 1) })} />
                <Stepper icon="time-outline" value={formatTime(slot.time)} onMinus={() => patchSlot(slot.id, { time: (slot.time + 1440 - 15) % 1440 })} onPlus={() => patchSlot(slot.id, { time: (slot.time + 15) % 1440 })} />
                <Pressable accessibilityRole="button" accessibilityLabel="Delete step" onPress={() => removeSlot(slot.id)} hitSlop={6} style={s.trash}><Icon name="trash-outline" size={16} color={theme.danger} /></Pressable>
              </View>
            </View> : null}
          </View>; })}
        </View>;
      })}
      <Button small outline label="Add step" icon="add" onPress={startAdd} />
      <Button label="Save" icon="checkmark" onPress={() => void save()} />
    </Sheet>
    <Dialog visible={ready} onClose={() => router.replace({ pathname: '/care-plan', params: { id: plan.id } })} icon="sparkles" title="Plan ready" actions={[
      { label: 'Open plan', onPress: () => router.replace({ pathname: '/care-plan', params: { id: plan.id } }) },
      { label: 'Scan another', kind: 'plain', onPress: () => router.replace('/scan') },
      { label: 'Home', kind: 'plain', onPress: () => router.dismissTo('/') },
    ]} />
    <Sheet visible={adding} onClose={() => setAdding(false)} title="New step">
      <Text style={s.fieldLabel}>Day</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.dayPick}>{nextDays.map((iso) => { const d = new Date(`${iso}T00:00:00`); const on = draft.date === iso; return <Pressable key={iso} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={dayLabel(iso)} onPress={() => setDraft((v) => ({ ...v, date: iso }))} style={[s.dayChip, on && s.dayChipOn]}>
        <Text style={[s.dayChipTop, on && { color: '#fff' }]}>{dayNames[d.getDay()]}</Text><Text style={[s.dayChipNum, on && { color: '#fff' }]}>{d.getDate()}</Text>
      </Pressable>; })}</ScrollView>
      <Text style={s.fieldLabel}>Time</Text>
      <View style={s.timePick}>
        <Pressable accessibilityRole="button" accessibilityLabel="Earlier" onPress={() => setDraft((v) => ({ ...v, time: (v.time + 1440 - 15) % 1440 }))} style={s.stepBtn} hitSlop={6}><Icon name="remove" size={16} color={theme.text} /></Pressable>
        <Text style={s.bigTime}>{formatTime(draft.time)}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Later" onPress={() => setDraft((v) => ({ ...v, time: (v.time + 15) % 1440 }))} style={s.stepBtn} hitSlop={6}><Icon name="add" size={16} color={theme.text} /></Pressable>
      </View>
      <Text style={s.fieldLabel}>Type</Text>
      <View style={s.kindRow}>{(Object.keys(kindIcon) as ScheduleSlot['kind'][]).map((kind) => { const on = draft.kind === kind; return <Pressable key={kind} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={kind} onPress={() => setDraft((v) => ({ ...v, kind }))} style={[s.kindChip, on && s.dayChipOn]}><Icon name={kindIcon[kind]} size={18} color={on ? '#fff' : theme.primary} /></Pressable>; })}</View>
      <TextInput value={draft.task} onChangeText={(task) => setDraft((v) => ({ ...v, task }))} placeholder="What to do" placeholderTextColor={theme.muted} style={[s.editInput, { marginTop: 4, marginBottom: 6 }]} accessibilityLabel="What to do" />
      <View style={s.addActions}><View style={{ flex: 1 }}><Button outline label="Back" onPress={() => setAdding(false)} /></View><View style={{ flex: 1 }}><Button label="Add" icon="add" disabled={!draft.task.trim()} onPress={confirmAdd} /></View></View>
    </Sheet>
  </Page>;
}
const s = StyleSheet.create({
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5 },
  timeIcon: { width: 30, height: 30, borderRadius: 10, backgroundColor: theme.primarySoft, alignItems: 'center', justifyContent: 'center' },
  timeLabel: { flex: 1, color: theme.text, fontSize: type.body, fontFamily: font.medium },
  stepBtn: { width: 28, height: 28, borderRadius: 9, borderWidth: 1, borderColor: theme.border, alignItems: 'center', justifyContent: 'center' },
  timeValue: { width: 50, textAlign: 'center', fontFamily: font.semibold, fontSize: type.body, color: theme.primaryDark },
  days: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  daysIcon: { width: 30, alignItems: 'center' },
  day: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: theme.border, alignItems: 'center', justifyContent: 'center' },
  dayOn: { backgroundColor: theme.primary, borderColor: theme.primary },
  dayText: { color: theme.text, fontFamily: font.semibold, fontSize: type.caption },
  dayTitle: { color: theme.text, fontFamily: font.semibold, fontSize: type.body },
  dayCard: { backgroundColor: theme.surfaceAlt, borderRadius: 16, padding: 11, marginBottom: 8 },
  dayHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  fieldLabel: { fontFamily: font.semibold, fontSize: type.caption, color: theme.muted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6, marginTop: 4 },
  dayPick: { gap: 6, paddingBottom: 10 },
  dayChip: { width: 46, paddingVertical: 7, borderRadius: 12, borderWidth: 1, borderColor: theme.border, alignItems: 'center', backgroundColor: theme.surface },
  dayChipOn: { backgroundColor: theme.primary, borderColor: theme.primary },
  dayChipTop: { fontFamily: font.regular, fontSize: type.caption, color: theme.muted },
  dayChipNum: { fontFamily: font.semibold, fontSize: type.body, color: theme.text },
  timePick: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 18, paddingBottom: 10 },
  bigTime: { fontFamily: font.bold, fontSize: type.display, color: theme.primaryDark, minWidth: 80, textAlign: 'center' },
  kindRow: { flexDirection: 'row', gap: 8, paddingBottom: 8 },
  kindChip: { width: 42, height: 42, borderRadius: 12, borderWidth: 1, borderColor: theme.border, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.surface },
  addActions: { flexDirection: 'row', gap: 8 },
  remindRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.primarySoft, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 10 },
  remindText: { flex: 1, fontFamily: font.medium, fontSize: type.body, color: theme.text },
  slotWrap: { borderTopWidth: 1, borderTopColor: theme.border },
  editor: { paddingBottom: 8, gap: 8 },
  editInput: { backgroundColor: theme.surface, borderRadius: 10, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 10, paddingVertical: 8, fontFamily: font.regular, fontSize: type.body, color: theme.text, outlineWidth: 0 },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.surface, borderRadius: 10, paddingHorizontal: 4, paddingVertical: 3 },
  stepText: { fontFamily: font.semibold, fontSize: type.small, color: theme.text, minWidth: 40, textAlign: 'center' },
  miniBtn: { width: 24, height: 24, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  trash: { marginLeft: 'auto', width: 30, height: 30, borderRadius: 9, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center' },
  slot: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  slotTime: { backgroundColor: theme.primary, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 3 },
  slotTimeText: { color: '#fff', fontFamily: font.semibold, fontSize: type.caption },
  slotIcon: { width: 26, height: 26, borderRadius: 8, backgroundColor: theme.primarySoft, alignItems: 'center', justifyContent: 'center' },
  slotTask: { color: theme.text, fontSize: type.body, fontFamily: font.medium, lineHeight: lineHeight(type.body) },
  slotReason: { color: theme.muted, fontFamily: font.regular, fontSize: type.small, lineHeight: lineHeight(type.small), marginTop: 2 },
});
