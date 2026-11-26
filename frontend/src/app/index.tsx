import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import PersistedPhoto from '../components/PersistedPhoto';
import { FadeIn, PopIn, PressScale } from '../components/Motion';
import { Icon, Page, RoundButton, SectionTitle } from '../components/Ui';
import { useLocalStore } from '../services/storage/LocalStore';
import { formatTime } from '../services/routine/schedule';
import { currentStreak, scheduleDays } from '../services/routine/streak';
import StreakRow, { weekWindow } from '../components/Streak';
import { useToggleSlot } from '../services/routine/useToggleSlot';
import { cropIcon } from '../utils/crops';
import { font, shadow, theme, type, statusColors } from '../theme';
import { effective } from '../services/feedback/corrections';

const todayIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; };

export default function Home() {
  const { data, error } = useLocalStore();
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const plants = data.plants.filter((plant) => !q || plant.name.toLowerCase().includes(q) || plant.crop.toLowerCase().includes(q));
  const today = todayIso();
  const todayTasks = data.plans.flatMap((plan) => (plan.schedule?.slots ?? []).filter((slot) => slot.date === today).map((slot) => ({ ...slot, planId: plan.id, plant: data.plants.find((p) => p.id === plan.plantId)?.name ?? 'Plant' }))).sort((a, b) => a.time - b.time);

  const toggleSlot = useToggleSlot();
  const allDays = scheduleDays(data.plans.flatMap((plan) => plan.schedule?.slots ?? []), today);
  const streak = currentStreak(allDays, today);
  const week = weekWindow(allDays, today);

  return <Page tab="home">
    <View style={s.header}>
      <View style={{ flex: 1 }}><Text style={s.hello}>{greeting()}</Text></View>
      <RoundButton icon="images-outline" label="Gallery" onPress={() => router.push('/gallery')} />
    </View>

    {week.length ? <FadeIn><PressScale accessibilityRole="button" accessibilityLabel={`${streak}-day streak`} scaleTo={0.98} onPress={() => router.push('/schedule')} style={s.streakCard}><StreakRow days={week} streak={streak} /></PressScale></FadeIn> : null}
    <View style={s.search}>
      <Icon name="search-outline" size={18} color={theme.muted} />
      <TextInput style={s.searchInput} placeholder="Search your plants" placeholderTextColor={theme.muted} value={query} onChangeText={setQuery} />
      {query ? <Pressable accessibilityLabel="Clear search" onPress={() => setQuery('')} hitSlop={8}><Icon name="close-circle" size={18} color={theme.muted} /></Pressable> : null}
    </View>
    {error ? <Text style={s.error}>{error}</Text> : null}

    <SectionTitle title="My Plants" action={data.plants.length ? 'View All' : undefined} onAction={() => router.push('/plants')} />
    {plants.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.plantList}>
      {plants.map((plant, index) => {
        const photo = data.journal.filter((entry) => entry.plantId === plant.id && entry.photoUri).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
        const latest = data.diagnoses.map(effective).filter((item) => item.plantId === plant.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
        return <FadeIn key={plant.id} delay={80 + index * 70}><PressScale accessibilityRole="button" onPress={() => router.push({ pathname: '/journal', params: { plantId: plant.id } })} style={[s.plantCard, latest && { borderWidth: 2, borderColor: statusColors(latest.status).main }]}>
          <View style={s.plantImage}>{photo?.photoUri ? <PersistedPhoto uri={photo.photoUri} height={110} cover /> : <Icon name={cropIcon(plant.crop)} size={38} />}</View>
          <Text style={s.plantName} numberOfLines={1}>{plant.name}</Text>
          <View style={s.plantMeta}><Text style={s.plantCrop} numberOfLines={1}>{plant.crop}</Text></View>
        </PressScale></FadeIn>;
      })}
    </ScrollView> : <Pressable accessibilityRole="button" onPress={() => router.push('/scan')} style={s.empty}><Icon name="add-circle-outline" size={26} color={theme.sage} /><Text style={s.emptyText}>{q ? 'No match.' : 'Scan a leaf to add a plant.'}</Text></Pressable>}

    <SectionTitle title="Today" action={todayTasks.length ? 'Schedule' : undefined} onAction={() => router.push('/schedule')} />
    {todayTasks.length ? todayTasks.slice(0, 4).map((task, index) => <FadeIn key={`${task.planId}-${task.id}`} delay={160 + index * 60}><PressScale accessibilityRole="button" scaleTo={0.98} onPress={() => router.push({ pathname: '/care-plan', params: { id: task.planId } })} style={s.task}>
      <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: !!task.done }} accessibilityLabel={task.task} hitSlop={8} onPress={() => void toggleSlot(task.planId, task.id)}><PopIn key={task.done ? 'on' : 'off'}><View style={[s.check, task.done && s.checkOn]}>{task.done ? <Icon name="checkmark" size={14} color="#fff" /> : null}</View></PopIn></Pressable>
      <Text style={s.taskTime}>{formatTime(task.time)}</Text>
      <View style={{ flex: 1 }}><Text style={[s.taskText, task.done && s.done]} numberOfLines={1}>{task.task}</Text><Text style={s.taskPlant}>{task.plant}</Text></View>
      <Icon name="chevron-forward" size={16} color={theme.muted} />
    </PressScale></FadeIn>) : <View style={s.empty}><Icon name="sunny-outline" size={24} color={theme.sage} /><Text style={s.emptyText}>Nothing to do today.</Text></View>}
  </Page>;
}

const s = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4, marginBottom: 12 },
  hello: { fontFamily: font.bold, letterSpacing: -0.3, fontSize: type.display, color: theme.text },
  sub: { color: theme.muted, fontFamily: font.regular, fontSize: type.body, marginTop: 4 },
  check: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: theme.sage, alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: theme.primary, borderColor: theme.primary },
  done: { color: theme.muted, textDecorationLine: 'line-through' },
  streakCard: { backgroundColor: theme.surface, borderRadius: 16, paddingVertical: 10, paddingHorizontal: 12, marginBottom: 12, ...shadow },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: theme.surface, borderRadius: 16, paddingHorizontal: 12, minHeight: 42, marginBottom: 14, ...shadow },
  searchInput: { flex: 1, fontFamily: font.regular, fontSize: type.body, color: theme.text, paddingVertical: 10 },
  error: { color: theme.danger, fontFamily: font.regular, fontSize: type.small, marginBottom: 12 },
  plantList: { gap: 10, paddingBottom: 10, paddingRight: 8, marginBottom: 8 },
  plantCard: { width: 132, backgroundColor: theme.surface, borderRadius: 18, padding: 8, ...shadow },
  plantImage: { height: 110, borderRadius: 14, backgroundColor: theme.primarySoft, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 10 },
  plantName: { fontFamily: font.semibold, color: theme.text, fontSize: type.body },
  plantMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginTop: 4 },
  plantCrop: { color: theme.muted, fontFamily: font.regular, fontSize: type.small, flexShrink: 1 },
  task: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.surface, borderRadius: 14, padding: 11, marginBottom: 8, ...shadow },
  taskTime: { backgroundColor: theme.primarySoft, color: theme.primary, fontFamily: font.bold, fontSize: type.small, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, overflow: 'hidden' },
  taskText: { color: theme.text, fontSize: type.body, fontFamily: font.medium },
  taskPlant: { color: theme.muted, fontFamily: font.regular, fontSize: type.small, marginTop: 2 },
  empty: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 20, borderWidth: 1, borderStyle: 'dashed', borderColor: theme.border, marginBottom: 16 },
  emptyText: { flex: 1, color: theme.muted, fontFamily: font.regular, fontSize: type.small },
});
