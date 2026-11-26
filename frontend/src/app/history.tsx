// import { useState } from 'react';
// import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
// import { router } from 'expo-router';
// import { Choice, Icon, Info, Page, Row } from '../components/Ui';
// import { useLocalStore } from '../services/storage/LocalStore';
// import type { Diagnosis } from '../types/models';
// import { font, shadow, statusColors, theme, type } from '../theme';
// import { formatWhen } from '../utils/dates';
// import { cropLabels } from '../data/labels';
// import { cropIcon } from '../utils/crops';
// import { effective } from '../services/feedback/corrections';
// import { Dialog, useToast } from '../components/Motion';

// type Filter = 'All' | Diagnosis['status'];
// const filters: Filter[] = ['All', 'Unhealthy', 'Healthy', 'Uncertain'];

// export default function History() {
//   const { data, update } = useLocalStore();
//   const toast = useToast();
//   const [deleting, setDeleting] = useState<Diagnosis | null>(null);
//   const remove = async () => {
//     if (!deleting) return;
//     const target = deleting; setDeleting(null);
//     try { await update((old) => ({ ...old, diagnoses: old.diagnoses.filter((item) => item.id !== target.id), guidance: old.guidance.filter((item) => item.diagnosisId !== target.id) })); toast('Deleted', 'trash'); }
//     catch { toast('Could not delete', 'alert-circle'); }
//   };
//   const [filter, setFilter] = useState<Filter>('All');
//   const [crop, setCrop] = useState('all');
//   const [query, setQuery] = useState('');
//   const q = query.trim().toLowerCase();
//   const all = data.diagnoses.map(effective).reverse();
//   // Every plant the model knows, plus any other crop that shows up in saved scans.
//   const crops = [...new Set([...Object.keys(cropLabels), ...all.map((item) => item.crop)])];
//   const count = (name: string) => all.filter((item) => item.crop === name).length;
//   const plantName = (id?: string) => data.plants.find((item) => item.id === id)?.name ?? '';
//   const list = all.filter((item) => (filter === 'All' || item.status === filter) && (crop === 'all' || item.crop === crop)
//     && (!q || [item.crop, item.condition, plantName(item.plantId)].some((text) => text.toLowerCase().includes(q))));
//   return <Page title="All Diagnoses" tab="history">
//     <View style={s.search}>
//       <Icon name="search-outline" size={17} color={theme.muted} />
//       <TextInput style={s.searchInput} placeholder="Search" placeholderTextColor={theme.muted} value={query} onChangeText={setQuery} accessibilityLabel="Search diagnoses" />
//       {query ? <Pressable accessibilityLabel="Clear search" onPress={() => setQuery('')} hitSlop={8}><Icon name="close-circle" size={17} color={theme.muted} /></Pressable> : null}
//     </View>
//     <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filters}>
//       {filters.map((key) => { const on = filter === key; const color = key === 'All' ? theme.primary : statusColors(key).main; return <Pressable key={key} accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => setFilter(key)} style={[s.status, on && { backgroundColor: color, borderColor: color }]}>
//         {key === 'All' ? null : <View style={[s.dot, { backgroundColor: on ? '#fff' : color }]} />}<Text style={[s.statusText, on && { color: '#fff' }]}>{key}</Text>
//       </Pressable>; })}
//     </ScrollView>
//     <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.crops}>
//       <Choice label="All" icon="leaf-outline" active={crop === 'all'} onPress={() => setCrop('all')} />
//       {crops.map((name) => <Choice key={name} label={count(name) ? `${name} ${count(name)}` : name} icon={cropIcon(name)} active={crop === name} onPress={() => setCrop(name)} />)}
//     </ScrollView>
//     {list.length ? list.map((diagnosis) => {
//       const plant = plantName(diagnosis.plantId);
//       return <Row key={diagnosis.id} accent={statusColors(diagnosis.status)} icon={diagnosis.status === 'Healthy' ? 'happy-outline' : diagnosis.status === 'Unhealthy' ? 'bug-outline' : 'help-circle-outline'}
//         title={diagnosis.crop} subtitle={diagnosis.condition}
//         meta={<Text style={s.meta} numberOfLines={1}>{formatWhen(diagnosis.createdAt)}{plant ? ` · ${plant}` : ''}</Text>}
//         onPress={() => router.push({ pathname: '/result', params: { id: diagnosis.id, view: '1' } })} onLongPress={() => setDeleting(diagnosis)} />;
//     }) : <Info>{data.diagnoses.length ? 'No match.' : 'No saved diagnoses yet.'}</Info>}
//     <Dialog visible={!!deleting} onClose={() => setDeleting(null)} icon="trash-outline" color={theme.danger} title="Delete this scan?" message={deleting ? `${deleting.crop} · ${deleting.condition}` : undefined} actions={[
//       { label: 'Delete', kind: 'danger', onPress: () => void remove() },
//       { label: 'Cancel', kind: 'plain', onPress: () => setDeleting(null) },
//     ]} />
//   </Page>;
// }
// const s = StyleSheet.create({
//   search: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.surface, borderRadius: 14, paddingHorizontal: 12, minHeight: 42, marginBottom: 12, ...shadow },
//   searchInput: { flex: 1, fontFamily: font.regular, fontSize: type.body, color: theme.text, paddingVertical: 8, outlineWidth: 0 },
//   filters: { gap: 6, paddingBottom: 8 },
//   status: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 11, borderRadius: 999, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface },
//   statusText: { fontFamily: font.medium, fontSize: type.small, color: theme.text },
//   dot: { width: 8, height: 8, borderRadius: 4 },
//   crops: { gap: 8, paddingBottom: 12 },
//   meta: { fontFamily: font.regular, fontSize: type.caption, color: theme.muted },
// });
import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Choice, Icon, Info, Page } from '../components/Ui';
import { useLocalStore } from '../services/storage/LocalStore';
import type { Diagnosis } from '../types/models';
import { font, shadow, statusColors, theme, type } from '../theme';
import { formatWhen } from '../utils/dates';
import { cropLabels } from '../data/labels';
import { cropIcon } from '../utils/crops';
import { effective } from '../services/feedback/corrections';
import { Dialog, useToast } from '../components/Motion';

type Filter = 'All' | Diagnosis['status'];
const filters: Filter[] = ['All', 'Unhealthy', 'Healthy', 'Uncertain'];

function ScanThumb({ diagnosis }: { diagnosis: Diagnosis }) {
  const [failed, setFailed] = useState(false);
  const tone = statusColors(diagnosis.status);
  const fallbackIcon = diagnosis.status === 'Healthy' ? 'happy-outline' : diagnosis.status === 'Unhealthy' ? 'bug-outline' : 'help-circle-outline';

  if (diagnosis.photoUri && !failed) {
    return (
      <Image
        source={{ uri: diagnosis.photoUri }}
        style={s.thumb}
        resizeMode="cover"
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <View style={[s.thumbFallback, { backgroundColor: tone.soft }]}>
      <Icon name={fallbackIcon} size={20} color={tone.main} />
    </View>
  );
}

export default function History() {
  const { data, update } = useLocalStore();
  const toast = useToast();
  const [deleting, setDeleting] = useState<Diagnosis | null>(null);
  const remove = async () => {
    if (!deleting) return;
    const target = deleting; setDeleting(null);
    try { await update((old) => ({ ...old, diagnoses: old.diagnoses.filter((item) => item.id !== target.id), guidance: old.guidance.filter((item) => item.diagnosisId !== target.id) })); toast('Deleted', 'trash'); }
    catch { toast('Could not delete', 'alert-circle'); }
  };
  const [filter, setFilter] = useState<Filter>('All');
  const [crop, setCrop] = useState('all');
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const all = data.diagnoses.map(effective).reverse();
  const crops = [...new Set([...Object.keys(cropLabels), ...all.map((item) => item.crop)])];
  const count = (name: string) => all.filter((item) => item.crop === name).length;
  const statusCount = (key: Filter) => key === 'All' ? all.length : all.filter((item) => item.status?.trim().toLowerCase() === key.toLowerCase()).length;
  const plantName = (id?: string) => data.plants.find((item) => item.id === id)?.name ?? '';
  const list = all.filter((item) =>
    (filter === 'All' || item.status?.trim().toLowerCase() === filter.toLowerCase())
    && (crop === 'all' || item.crop === crop)
    && (!q || [item.crop, item.condition, plantName(item.plantId)].some((text) => text.toLowerCase().includes(q)))
  );

  return <Page title="All Diagnoses" tab="history">
    <View style={s.search}>
      <Icon name="search-outline" size={17} color={theme.muted} />
      <TextInput style={s.searchInput} placeholder="Search" placeholderTextColor={theme.muted} value={query} onChangeText={setQuery} accessibilityLabel="Search diagnoses" />
      {query ? <Pressable accessibilityLabel="Clear search" onPress={() => setQuery('')} hitSlop={8}><Icon name="close-circle" size={17} color={theme.muted} /></Pressable> : null}
    </View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filters}>
      {filters.map((key) => {
        const on = filter === key;
        const color = key === 'All' ? theme.primary : statusColors(key).main;
        const n = statusCount(key);
        return <Pressable key={key} accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => setFilter(key)} style={[s.status, on && { backgroundColor: color, borderColor: color }]}>
          {key === 'All' ? null : <View style={[s.dot, { backgroundColor: on ? '#fff' : color }]} />}
          <Text style={[s.statusText, on && { color: '#fff' }]}>{n ? `${key} (${n})` : key}</Text>
        </Pressable>;
      })}
    </ScrollView>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.crops}>
      <Choice label="All" icon="leaf-outline" active={crop === 'all'} onPress={() => setCrop('all')} />
      {crops.map((name) => <Choice key={name} label={count(name) ? `${name} ${count(name)}` : name} icon={cropIcon(name)} active={crop === name} onPress={() => setCrop(name)} />)}
    </ScrollView>
    {list.length ? list.map((diagnosis) => {
      const plant = plantName(diagnosis.plantId);
      const tone = statusColors(diagnosis.status);
      return (
        <Pressable
          key={diagnosis.id}
          accessibilityRole="button"
          onPress={() => router.push({ pathname: '/result', params: { id: diagnosis.id, view: '1' } })}
          onLongPress={() => setDeleting(diagnosis)}
          style={s.card}
        >
          <ScanThumb diagnosis={diagnosis} />
          <View style={s.cardBody}>
            <View style={s.cardTop}>
              <Text style={s.cardTitle} numberOfLines={1}>{diagnosis.crop}</Text>
              <View style={[s.badge, { backgroundColor: tone.soft }]}>
                <Text style={[s.badgeText, { color: tone.main }]}>{diagnosis.status}</Text>
              </View>
            </View>
            <Text style={s.cardSub} numberOfLines={1}>{diagnosis.condition}</Text>
            <Text style={s.meta} numberOfLines={1}>{formatWhen(diagnosis.createdAt)}{plant ? ` · ${plant}` : ''}</Text>
          </View>
          <Icon name="chevron-forward" size={18} color={theme.muted} />
        </Pressable>
      );
    }) : <Info>{data.diagnoses.length ? 'No match.' : 'No saved diagnoses yet.'}</Info>}
    <Dialog visible={!!deleting} onClose={() => setDeleting(null)} icon="trash-outline" color={theme.danger} title="Delete this scan?" message={deleting ? `${deleting.crop} · ${deleting.condition}` : undefined} actions={[
      { label: 'Delete', kind: 'danger', onPress: () => void remove() },
      { label: 'Cancel', kind: 'plain', onPress: () => setDeleting(null) },
    ]} />
  </Page>;
}

const s = StyleSheet.create({
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.surface, borderRadius: 14, paddingHorizontal: 12, minHeight: 42, marginBottom: 12, ...shadow },
  searchInput: { flex: 1, fontFamily: font.regular, fontSize: type.body, color: theme.text, paddingVertical: 8, outlineWidth: 0 },
  filters: { gap: 6, paddingBottom: 8 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 11, borderRadius: 999, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface },
  statusText: { fontFamily: font.medium, fontSize: type.small, color: theme.text },
  dot: { width: 8, height: 8, borderRadius: 4 },
  crops: { gap: 8, paddingBottom: 12 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.surface, borderRadius: 18, padding: 10, marginBottom: 10, ...shadow },
  thumb: { width: 52, height: 52, borderRadius: 12, backgroundColor: theme.primarySoft },
  thumbFallback: { width: 52, height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardBody: { flex: 1, gap: 2 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cardTitle: { fontFamily: font.semibold, fontSize: type.body, color: theme.text, flex: 1 },
  cardSub: { fontFamily: font.regular, fontSize: type.small, color: theme.text },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  badgeText: { fontFamily: font.semibold, fontSize: type.caption },
  meta: { fontFamily: font.regular, fontSize: type.caption, color: theme.muted },
});