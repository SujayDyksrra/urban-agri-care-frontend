import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import PersistedPhoto from '../components/PersistedPhoto';
import { Chip, Icon, Info, Page, Pill } from '../components/Ui';
import { cropIcon } from '../utils/crops';
import { useLocalStore } from '../services/storage/LocalStore';
import { font, shadow, theme, type, statusTone } from '../theme';
import { displayCondition } from '../data/labels';
import { effective } from '../services/feedback/corrections';

export default function SavedPlants() {
  const { data } = useLocalStore();
  const crops = [...new Set(data.plants.map((plant) => plant.crop))].sort();
  const [crop, setCrop] = useState('All');
  const list = data.plants.filter((plant) => crop === 'All' || plant.crop === crop);
  return <Page title="Saved Plants" back>
    {data.plants.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filters}>
      <Chip icon="apps-outline" label={`All (${data.plants.length})`} active={crop === 'All'} onPress={() => setCrop('All')} />
      {crops.map((item) => <Chip key={item} icon={cropIcon(item)} label={`${item} (${data.plants.filter((plant) => plant.crop === item).length})`} active={crop === item} onPress={() => setCrop(item)} />)}
    </ScrollView> : null}
    {list.length ? <View style={s.grid}>{list.map((plant) => {
      const photo = data.journal.filter((entry) => entry.plantId === plant.id && entry.photoUri).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]?.photoUri;
      const plan = data.plans.find((item) => item.plantId === plant.id);
      const steps = plan?.schedule?.slots ?? []; const done = steps.filter((slot) => slot.done).length;
      const latest = data.diagnoses.map(effective).filter((item) => item.plantId === plant.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
      return <Pressable key={plant.id} accessibilityRole="button" onPress={() => router.push({ pathname: '/journal', params: { plantId: plant.id } })} style={({ pressed }) => [s.card, pressed && { opacity: 0.7 }]}>
        <View style={s.image}>{photo ? <PersistedPhoto uri={photo} height={120} cover /> : <Icon name={cropIcon(plant.crop)} size={44} />}</View>
        <Text style={s.name} numberOfLines={1}>{plant.name}</Text>
        <Text style={s.crop} numberOfLines={1}>{plant.crop}</Text>
        <View style={s.meta}>
          {latest ? <Pill label={displayCondition(latest.condition)} tone={statusTone(latest.status)} /> : null}
          {steps.length ? <Pill label={`${done}/${steps.length}`} tone="neutral" icon="checkmark-done-outline" /> : null}
        </View>
      </Pressable>;
    })}</View> : <View style={s.empty}><Icon name="bookmark-outline" size={28} color={theme.sage} /><Info>No saved plants yet.</Info></View>}
  </Page>;
}
const s = StyleSheet.create({
  count: { color: theme.muted, fontFamily: font.regular, fontSize: type.body, marginTop: -4, marginBottom: 14 },
  filters: { gap: 6, paddingBottom: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 14, marginBottom: 10 },
  card: { width: '48%', backgroundColor: theme.surface, borderRadius: 20, padding: 10, ...shadow },
  image: { height: 120, borderRadius: 16, backgroundColor: theme.primarySoft, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 8 },
  name: { fontFamily: font.semibold, color: theme.text, fontSize: type.body },
  crop: { color: theme.muted, fontFamily: font.regular, fontSize: type.small, marginTop: 2 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 8 },
  empty: { alignItems: 'center', gap: 8, padding: 20, borderRadius: 20, borderWidth: 1, borderStyle: 'dashed', borderColor: theme.border, marginBottom: 14 },
});
