import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Sheet } from '../components/Motion';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, Card, Choice, Icon, Input, Page, Pill, SectionTitle, ui, Notice } from '../components/Ui';
import PersistedPhoto from '../components/PersistedPhoto';
import { useLocalStore } from '../services/storage/LocalStore';
import type { JournalEntry } from '../types/models';
import { font, shadow, theme, type, lineHeight } from '../theme';
import { formatDateTime } from '../utils/dates';

const choices = ['Fewer visible symptoms', 'About the same', 'More visible symptoms'] as const;
export default function Compare() {
  const { plantId } = useLocalSearchParams<{ plantId: string }>();
  const { data, update } = useLocalStore();
  const plant = data.plants.find((item) => item.id === plantId);
  // Every saved photo: journal photos and scan photos. This plant's first, then the rest.
  type Photo = { id: string; uri: string; createdAt: string; plantId?: string };
  const all: Photo[] = [
    ...data.journal.filter((item) => item.photoUri).map((item) => ({ id: item.id, uri: item.photoUri!, createdAt: item.createdAt, plantId: item.plantId })),
    ...data.diagnoses.filter((item) => item.photoUri && !data.journal.some((entry) => entry.photoUri === item.photoUri)).map((item) => ({ id: item.id, uri: item.photoUri!, createdAt: item.createdAt, plantId: item.plantId })),
  ].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const own = all.filter((item) => item.plantId === plantId);
  const others = all.filter((item) => item.plantId !== plantId);
  const [pickedIds, setPickedIds] = useState<[string, string] | null>(null);
  const [picking, setPicking] = useState<0 | 1 | null>(null);
  const defaults: [Photo | undefined, Photo | undefined] = own.length >= 2 ? [own[0], own[own.length - 1]] : [own[0] ?? others[0], own.length >= 2 ? own[own.length - 1] : undefined];
  const pair: [Photo | undefined, Photo | undefined] = pickedIds ? [all.find((p) => p.id === pickedIds[0]), all.find((p) => p.id === pickedIds[1])] : defaults;
  const choose = (photo: Photo) => { if (picking === null) return; const next: [string, string] = [pair[0]?.id ?? '', pair[1]?.id ?? '']; next[picking] = photo.id; setPickedIds(next); setPicking(null); };
  const ready = !!pair[0] && !!pair[1];
  const plantName = (id?: string) => data.plants.find((p) => p.id === id)?.name ?? '';
  const [choice, setChoice] = useState<(typeof choices)[number] | null>(null);
  const [note, setNote] = useState('');
  const [message, setMessage] = useState('');
  const save = async () => {
    if (!plant || !choice || !ready) return;
    const entry: JournalEntry = { id: `observe-${Date.now()}`, plantId, kind: 'observation', text: `${choice}${note.trim() ? ` — ${note.trim()}` : ''} (user observation, not a model conclusion)`, createdAt: new Date().toISOString() };
    try { await update((old) => ({ ...old, journal: [...old.journal, entry] })); setNote(''); setChoice(null); setMessage('Observation saved to this plant.'); }
    catch { setMessage('Observation was not saved.'); }
  };
  return <Page title="Compare Progress" back>
    <Text style={ui.serifTitle}>{plant?.name ?? 'Plant not found'}</Text>
    <View style={{ height: 14 }} />
    {!all.length ? <Card tone="soft"><View style={s.emptyRow}><Icon name="images-outline" size={26} /><Text style={s.emptyText}>No photos yet.</Text></View></Card> : <>
      <View style={s.row}>{pair.map((photo, i) => <Pressable key={i} accessibilityRole="button" accessibilityLabel={i ? 'Choose after photo' : 'Choose before photo'} onPress={() => setPicking(i as 0 | 1)} style={s.column}>
        {photo ? <PersistedPhoto uri={photo.uri} height={170} cover /> : <View style={s.placeholder}><Icon name="add-circle-outline" size={30} color={theme.sage} /></View>}
        <View style={s.caption}><View style={s.capRow}><Pill label={i ? 'After' : 'Before'} tone={i ? 'green' : 'neutral'} /><Icon name="swap-horizontal" size={15} color={theme.muted} /></View>{photo ? <Text style={s.date}>{formatDateTime(photo.createdAt)}</Text> : null}</View>
      </Pressable>)}</View>
      {ready ? <>
      <SectionTitle title="What do you observe?" />
      <View style={s.choices}>{choices.map((item, i) => <Choice key={item} label={item} active={choice === item} icon={(['trending-down-outline', 'remove-outline', 'trending-up-outline'] as const)[i]} onPress={() => setChoice(item)} />)}</View>
      <Input tall placeholder="Note (optional)" multiline value={note} onChangeText={setNote} />
      <Button label="Save Observation" icon="checkmark-circle-outline" onPress={() => void save()} disabled={!choice} />
      </> : null}
    </>}
    <Sheet visible={picking !== null} onClose={() => setPicking(null)} title={picking ? 'After' : 'Before'}>
      {[{ key: 'own', list: own }, { key: 'others', list: others }].filter((g) => g.list.length).map((g) => <View key={g.key}>
        {g.key === 'others' ? <Text style={[ui.label, { marginVertical: 8 }]}>Other plants</Text> : null}
        <View style={s.grid}>{g.list.map((photo) => { const on = pair[picking ?? 0]?.id === photo.id; return <Pressable key={photo.id} accessibilityRole="button" accessibilityLabel={`Photo ${formatDateTime(photo.createdAt)}`} onPress={() => choose(photo)} style={[s.tile, on && s.tileOn]}>
          <PersistedPhoto uri={photo.uri} height={100} cover />
          <Text style={s.tileText} numberOfLines={1}>{g.key === 'others' ? plantName(photo.plantId) : formatDateTime(photo.createdAt)}</Text>
        </Pressable>; })}</View>
      </View>)}
    </Sheet><Notice message={message} onClear={() => setMessage('')} />
    {plant ? <Button label="Share Progress Card" icon="share-social-outline" onPress={() => router.push({ pathname: '/share', params: { plantId } })} outline /> : null}
  </Page>;
}
const s = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  column: { flex: 1, minWidth: 0, backgroundColor: theme.surface, padding: 8, borderRadius: 20, ...shadow },
  caption: { paddingHorizontal: 4, paddingTop: 10, gap: 6 },
  date: { color: theme.muted, fontFamily: font.regular, fontSize: type.caption },
  choices: { gap: 8, marginBottom: 14, alignItems: 'flex-start' },
  placeholder: { height: 170, borderRadius: 14, backgroundColor: theme.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  capRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile: { width: '31%', backgroundColor: theme.surface, borderRadius: 12, padding: 4, borderWidth: 2, borderColor: 'transparent' },
  tileOn: { borderColor: theme.primary },
  tileText: { fontFamily: font.regular, fontSize: type.caption, color: theme.muted, marginTop: 3, paddingHorizontal: 2 },
  emptyRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  emptyText: { flex: 1, color: theme.text, fontFamily: font.regular, fontSize: type.body, lineHeight: lineHeight(type.body) },
});
