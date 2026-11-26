import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Banner, Button, Card, Icon, LeafArt, Page, Progress, RoundButton, ui, Notice } from '../components/Ui';
import GuidanceMarkdown from '../components/GuidanceMarkdown';
import { syncSlotReminders } from '../services/reminders/local';
import { useLocalStore } from '../services/storage/LocalStore';
import { Dialog, PopIn, useToast } from '../components/Motion';
import PlantPicker from '../components/PlantPicker';
import { formatTime } from '../services/routine/schedule';
import { currentStreak, scheduleDays } from '../services/routine/streak';
import StreakRow from '../components/Streak';
import { useToggleSlot } from '../services/routine/useToggleSlot';
import type { CarePlan, Plant } from '../types/models';
import { font, shadow, theme, type, lineHeight } from '../theme';
import { formatDate, LOCALE } from '../utils/dates';
import { effective } from '../services/feedback/corrections';

const uid = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
export default function CarePlanScreen() {
  const { diagnosisId, guidanceId, id } = useLocalSearchParams<{ diagnosisId?: string; guidanceId?: string; id?: string }>();
  const { data, update, error: storeError } = useLocalStore();
  const guidance = data.guidance.find((item) => item.id === guidanceId);
  const diagnosis = data.diagnoses.map(effective).find((item) => item.id === (diagnosisId ?? guidance?.diagnosisId));
  const existing = data.plans.find((item) => item.id === id) ?? data.plans.find((item) => item.guidanceId === guidanceId && item.diagnosisId === diagnosisId);
  const [plantId, setPlantId] = useState('');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [celebrate, setCelebrate] = useState(false);
  const [fieldError, setFieldError] = useState('');
  const toast = useToast();
  const [showGuide, setShowGuide] = useState(false);
  const plan = existing;
  const plant = data.plants.find((item) => item.id === plan?.plantId);
  const savePlan = async () => {
    if (!diagnosis || !guidance) return setMessage('Diagnosis or selected guidance is unavailable.');
    if (plan) return setMessage('A plan already exists for this diagnosis and guidance. Open it below.');
    // A typed name that matches an existing plant means that same plant, so its history stays in one place.
    const selected = data.plants.find((item) => item.id === plantId) ?? data.plants.find((item) => item.name.trim().toLowerCase() === name.trim().toLowerCase());
    if (!selected && !name.trim()) return setFieldError('Choose a plant or type a new name.');
    const newPlant: Plant | null = selected ? null : { id: uid('plant'), name: name.trim(), crop: diagnosis.crop, createdAt: new Date().toISOString() };
    const next: CarePlan = { id: uid('plan'), plantId: selected?.id ?? newPlant!.id, diagnosisId: diagnosis.id, guidanceId: guidance.id, source: guidance.source, markdown: guidance.markdown, tasks: [], createdAt: new Date().toISOString() };
    try {
      await update((old) => ({ ...old, plants: newPlant ? [...old.plants, newPlant] : old.plants, diagnoses: old.diagnoses.map((item) => item.id === diagnosis.id ? { ...item, plantId: next.plantId } : item), plans: [...old.plans, next] }));
      router.replace({ pathname: '/routine', params: { planId: next.id, fresh: '1' } });
    } catch { setMessage('Plan was not saved. Check local storage and retry.'); }
  };
  const toggleRemind = async () => {
    if (!plan?.schedule) return;
    const on = !plan.schedule.remind;
    try {
      const ids = await syncSlotReminders(plant?.name ?? 'Your plant', plan.schedule.slots, on, plan.schedule.notificationIds);
      await update((old) => ({ ...old, plans: old.plans.map((item) => item.id === plan.id && item.schedule ? { ...item, schedule: { ...item.schedule, remind: on, notificationIds: ids } } : item) }));
      toast(on ? 'Reminders on' : 'Reminders off', on ? 'notifications' : 'notifications-off');
    } catch (cause) { setMessage(String(cause instanceof Error ? cause.message : cause)); }
  };
  const today = new Date(); const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const slots = plan?.schedule?.slots ?? [];
  const todaySlots = slots.filter((slot) => slot.date === todayIso);
  const upcoming = todaySlots.length ? todaySlots : slots.filter((slot) => slot.date > todayIso).slice(0, 3);
  const days = scheduleDays(slots, todayIso);
  const streak = currentStreak(days, todayIso);
  const total = slots.length;
  const doneCount = slots.filter((slot) => slot.done).length;
  const toggleSlotIn = useToggleSlot();
  const toggleSlot = async (slotId: string) => {
    if (!plan) return;
    try { const result = await toggleSlotIn(plan.id, slotId); if (result?.allDone) setCelebrate(true); }
    catch { setMessage('Care moment was not saved.'); }
  };
  return <Page title="Care Plan" back right={plan ? <RoundButton icon="book-outline" label="Open Plant Journal" onPress={() => router.push({ pathname: '/journal', params: { plantId: plan.plantId } })} /> : undefined}>
    {storeError ? <Banner tone="error" text={storeError} /> : null}<Notice message={message} onClear={() => setMessage('')} />
    {!plan ? <>
      <PlantPicker plants={data.plants} name={name} selectedId={plantId} error={fieldError} onChange={(value, id) => { setName(value); setPlantId(id); setFieldError(''); }} />
      {guidance ? <Card><GuidanceMarkdown markdown={guidance.markdown} /></Card> : <Banner tone="error" text="No selected guidance. Return to Result." />}
      <Button label="Create Plan" icon="add-circle-outline" onPress={() => void savePlan()} />
    </> : <>
      <View style={s.header}>
        <LeafArt size={60} />
        <View style={{ flex: 1 }}>
          <Text style={ui.serifMedium} numberOfLines={1}>{plant?.name ?? 'Unknown plant'}</Text>
          <Text style={s.small}>{plant?.crop ?? ''} · {formatDate(plan.createdAt)}</Text>
        </View>
      </View>

      {total ? <View style={s.progressHead}><View style={{ flex: 1 }}><Progress value={total ? doneCount / total : 0} /></View><Text style={s.progressCount}>{doneCount}/{total}</Text></View> : null}

      <Card tone="soft">
        {days.length ? <View style={{ marginBottom: 8 }}><StreakRow days={days} streak={streak} right={<Pressable accessibilityRole="switch" accessibilityLabel="Reminders" accessibilityState={{ checked: !!plan.schedule?.remind }} onPress={() => void toggleRemind()} hitSlop={8} style={[s.bell, plan.schedule?.remind && s.bellOn]}><Icon name={plan.schedule?.remind ? 'notifications' : 'notifications-off-outline'} size={16} color={plan.schedule?.remind ? '#fff' : theme.muted} /></Pressable>} /></View> : null}
        {upcoming.map((slot) => { const canTick = slot.date === todayIso; return <Pressable key={slot.id} disabled={!canTick} accessibilityRole={canTick ? 'checkbox' : undefined} accessibilityState={canTick ? { checked: !!slot.done } : undefined} onPress={() => void toggleSlot(slot.id)} style={s.upRow}>
          {canTick ? <PopIn key={slot.done ? 'on' : 'off'}><View style={[s.check, slot.done && s.checkOn]}>{slot.done ? <Icon name="checkmark" size={16} color="#fff" /> : null}</View></PopIn> : null}
          <Text style={s.upTime}>{canTick ? formatTime(slot.time) : `${new Date(`${slot.date}T00:00:00`).toLocaleDateString(LOCALE, { weekday: 'short' })} ${formatTime(slot.time)}`}</Text>
          <Text style={[s.upTask, slot.done && s.taskDone]} numberOfLines={2}>{slot.task}</Text>
        </Pressable>; })}
        <Button small outline={!!plan.schedule} label={plan.schedule ? 'Edit' : 'Plan schedule'} icon={plan.schedule ? 'create-outline' : 'time-outline'} onPress={() => router.push({ pathname: '/routine', params: { planId: plan.id, ...(plan.schedule ? { edit: '1' } : {}) } })} />
      </Card>



      <Pressable accessibilityRole="button" onPress={() => setShowGuide((v) => !v)} style={s.guideToggle}><Text style={ui.serifMedium}>Saved guidance</Text><Icon name={showGuide ? 'chevron-up' : 'chevron-down'} size={20} color={theme.muted} /></Pressable>
      {showGuide ? <Card><GuidanceMarkdown markdown={plan.markdown} /></Card> : null}
    </>}
    {plan ? <Dialog visible={celebrate} onClose={() => setCelebrate(false)} icon="trophy" title="Plan complete" message={`All ${total} steps done for ${plant?.name ?? 'this plant'}.`} actions={[
      { label: 'Share Progress', onPress: () => { setCelebrate(false); router.push({ pathname: '/share', params: { plantId: plan.plantId } }); } },
      { label: 'Close', kind: 'plain', onPress: () => setCelebrate(false) },
    ]} /> : null}
  </Page>;
}
const s = StyleSheet.create({
  bell: { width: 30, height: 30, borderRadius: 15, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center' },
  bellOn: { backgroundColor: theme.primary },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  small: { color: theme.muted, fontFamily: font.regular, fontSize: type.small, lineHeight: lineHeight(type.small) },
  progressHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  progressCount: { fontFamily: font.semibold, fontSize: type.small, color: theme.primary, marginBottom: 16 },
  task: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 11, borderRadius: 14, backgroundColor: theme.surface, marginBottom: 10, ...shadow },
  taskMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  check: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: theme.sage, alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: theme.primary, borderColor: theme.primary },
  taskText: { flex: 1, color: theme.text, fontFamily: font.regular, fontSize: type.body, lineHeight: lineHeight(type.body) },
  taskDone: { color: theme.muted, textDecorationLine: 'line-through' },
  upRow: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: theme.surface, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 10, marginBottom: 6 },
  upTime: { color: theme.primary, fontFamily: font.semibold, fontSize: type.small, minWidth: 44 },
  upTask: { flex: 1, color: theme.text, fontFamily: font.regular, fontSize: type.body },
  guideToggle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, marginBottom: 6 },
});
