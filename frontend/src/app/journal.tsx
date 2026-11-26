// import { useState } from 'react';
// import { Pressable, StyleSheet, Text, View } from 'react-native';
// import { router, useLocalSearchParams } from 'expo-router';
// import { Banner, Button, Card, Chip, Icon, Info, InputAction, LeafArt, Page, Pill, RoundButton, Row, SectionTitle, ui, type IconName, Notice } from '../components/Ui';
// import PersistedPhoto from '../components/PersistedPhoto';
// import { useLocalStore } from '../services/storage/LocalStore';
// import { choosePhoto } from '../services/storage/photos';
// import type { JournalEntry } from '../types/models';
// import { font, shadow, theme, type, lineHeight } from '../theme';
// import { formatWhen, plural } from '../utils/dates';
// import { effective } from '../services/feedback/corrections';

// export default function Journal() {
//   const { plantId: routePlantId } = useLocalSearchParams<{ plantId?: string }>();
//   const { data, update, error: storeError } = useLocalStore();
//   const [chosenId, setChosenId] = useState('');
//   const [note, setNote] = useState('');
//   const [message, setMessage] = useState('');
//   const [renaming, setRenaming] = useState(false);
//   const [newName, setNewName] = useState('');
//   const plantId = routePlantId ?? chosenId;
//   const plant = data.plants.find((item) => item.id === plantId);
//   const entries = data.journal.filter((item) => item.plantId === plantId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
//   const diagnoses = data.diagnoses.map(effective).filter((item) => item.plantId === plantId);
//   const rename = async () => {
//     const name = newName.trim();
//     if (!plant || !name) return;
//     try { await update((old) => ({ ...old, plants: old.plants.map((item) => item.id === plant.id ? { ...item, name } : item) })); setRenaming(false); setMessage('Plant name saved.'); }
//     catch { setMessage('Plant name was not saved.'); }
//   };
//   const saveNote = async () => {
//     if (!plant || !note.trim()) return;
//     const entry: JournalEntry = { id: `note-${Date.now()}`, plantId, kind: 'note', text: note.trim(), createdAt: new Date().toISOString() };
//     try { await update((old) => ({ ...old, journal: [...old.journal, entry] })); setNote(''); setMessage('Note saved.'); }
//     catch { setMessage('Note was not saved.'); }
//   };
//   const addPhoto = async (source: 'camera' | 'library') => {
//     if (!plant) return;
//     try {
//       const uri = await choosePhoto(source);
//       if (!uri) return;
//       const entry: JournalEntry = { id: `photo-${Date.now()}`, plantId, kind: 'photo', text: 'Photo added', photoUri: uri, createdAt: new Date().toISOString() };
//       await update((old) => ({ ...old, journal: [...old.journal, entry] })); setMessage('Photo copied and saved to this plant.');
//     } catch (cause) { setMessage(`Photo was not saved: ${String(cause)}`); }
//   };
//   const timeline = [...diagnoses.map((item) => ({ id: item.id, kind: 'diagnosis' as const, createdAt: item.createdAt, text: `Scan: ${item.condition}`, photoUri: undefined as string | undefined })), ...entries.filter((entry) => entry.kind !== 'task' || data.plans.some((plan) => plan.plantId === plantId && plan.tasks.some((task) => task.id === entry.taskId && task.done)))].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
//   const latestPhoto = entries.find((entry) => entry.photoUri)?.photoUri;
//   const kindIcon = (kind: string): IconName => ({ diagnosis: 'bug-outline', photo: 'camera-outline', task: 'checkmark-done-outline', observation: 'eye-outline', note: 'create-outline' } as Record<string, IconName>)[kind] ?? 'ellipse-outline';
//   if (!plant) return <Page title="Plant Journal" tab="journal">
//     {storeError ? <Banner tone="error" text={storeError} /> : null}<Notice message={message} onClear={() => setMessage('')} />
//     {data.plants.length ? data.plants.map((item) => {
//       const photo = data.journal.filter((entry) => entry.plantId === item.id && entry.photoUri).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]?.photoUri;
//       const count = data.journal.filter((entry) => entry.plantId === item.id).length;
//       return <Row key={item.id} title={item.name} subtitle={item.crop} thumb={photo ? <PersistedPhoto uri={photo} height={68} cover /> : undefined} meta={<Pill label={`${count} ${count === 1 ? 'entry' : 'entries'}`} tone="neutral" />} onPress={() => setChosenId(item.id)} />;
//     }) : <Card tone="soft"><Info>No plants yet.</Info></Card>}
//     <Button label="Photo Gallery" icon="images-outline" onPress={() => router.push('/gallery')} outline />
//   </Page>;
//   return <Page back={!!routePlantId} tab={routePlantId ? undefined : 'journal'} right={!routePlantId ? <RoundButton icon="swap-horizontal" label="Switch plant" onPress={() => setChosenId('')} /> : undefined} hero={<View style={s.hero}>{latestPhoto ? <PersistedPhoto uri={latestPhoto} height={190} cover /> : <LeafArt size={130} />}</View>}>
//     {storeError ? <Banner tone="error" text={storeError} /> : null}
//     <View style={s.sheet}>
//       {renaming ? <InputAction icon="pricetag-outline" placeholder="Plant nickname" value={newName} onChangeText={setNewName} action="Save" onAction={() => void rename()} /> : <View style={s.nameRow}>
//         <Text style={[ui.serifTitle, { flex: 1 }]}>{plant.name}</Text>
//         <Pressable accessibilityRole="button" accessibilityLabel="Rename plant" onPress={() => { setNewName(plant.name); setRenaming(true); }} hitSlop={8} style={s.editBtn}><Icon name="create-outline" size={18} color={theme.muted} /></Pressable>
//       </View>}
//       <Text style={ui.italic}>{plant.crop}</Text>
//       <View style={s.metaRow}><View style={s.metaItem}><Icon name="pulse-outline" size={15} color={theme.muted} /><Text style={s.meta}>{plural(diagnoses.length, 'diagnosis', 'diagnoses')}</Text></View><View style={s.metaItem}><Icon name="book-outline" size={15} color={theme.muted} /><Text style={s.meta}>{plural(entries.length, 'journal entry', 'journal entries')}</Text></View></View>
//       <View style={{ height: 14 }} />
//       <View style={s.chips}>
//         <Chip icon="images-outline" label="Gallery" onPress={() => void addPhoto('library')} />
//         <Chip icon="camera-outline" label="Camera" onPress={() => void addPhoto('camera')} />
//         <Chip icon="git-compare-outline" label="Compare" onPress={() => router.push({ pathname: '/compare', params: { plantId } })} />
//         <Chip icon="share-social-outline" label="Share" onPress={() => router.push({ pathname: '/share', params: { plantId } })} />
//       </View>
//     </View>
//     <Notice message={message} onClear={() => setMessage('')} />
//     <InputAction placeholder="Write a note" value={note} onChangeText={setNote} action="Save" onAction={() => void saveNote()} multiline />
//     <SectionTitle title="Timeline" />
//     {timeline.length ? timeline.map((entry, index) => <View key={entry.id} style={s.tlRow}>
//       <View style={s.tlRail}><View style={s.tlDot}><Icon name={kindIcon(entry.kind)} size={14} color="#fff" /></View>{index < timeline.length - 1 ? <View style={s.tlLine} /> : null}</View>
//       <View style={s.tlCard}><Text style={s.tlDate}>{formatWhen(entry.createdAt)}</Text><Text style={s.text}>{entry.text}</Text>{entry.photoUri ? <View style={{ marginTop: 10 }}><PersistedPhoto uri={entry.photoUri} /></View> : null}</View>
//     </View>) : <Info>No entries yet.</Info>}
//     <Button small label="All photos" icon="images-outline" onPress={() => router.push('/gallery')} outline />
//   </Page>;
// }
// const s = StyleSheet.create({
//   hero: { height: 190, borderRadius: 24, backgroundColor: theme.surfaceAlt, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: -28 },
//   sheet: { backgroundColor: theme.surface, borderRadius: 22, padding: 16, marginBottom: 14, ...shadow },
//   metaRow: { flexDirection: 'row', alignItems: 'center', columnGap: 16, rowGap: 6, flexWrap: 'wrap', marginTop: 10 },
//   nameRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
//   editBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: theme.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
//   metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
//   meta: { color: theme.muted, fontFamily: font.regular, fontSize: type.small },
//   chips: { flexDirection: 'row', justifyContent: 'space-between' },
//   text: { fontFamily: font.regular, fontSize: type.body, color: theme.text, lineHeight: lineHeight(type.body) },
//   tlRow: { flexDirection: 'row', gap: 12 },
//   tlRail: { width: 28, alignItems: 'center' },
//   tlDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center', marginTop: 14 },
//   tlLine: { flex: 1, width: 2, backgroundColor: theme.border, marginTop: 4 },
//   tlCard: { flex: 1, minWidth: 0, backgroundColor: theme.surface, borderRadius: 18, padding: 14, marginBottom: 12, ...shadow },
//   tlDate: { color: theme.muted, fontFamily: font.regular, fontSize: type.small, marginBottom: 4 },
// });

import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Banner, Button, Card, Chip, Icon, Info, InputAction, LeafArt, Page, Pill, RoundButton, Row, SectionTitle, ui, type IconName, Notice } from '../components/Ui';
import PersistedPhoto from '../components/PersistedPhoto';
import { useLocalStore } from '../services/storage/LocalStore';
import { choosePhoto } from '../services/storage/photos';
import type { JournalEntry } from '../types/models';
import { font, shadow, theme, type, lineHeight } from '../theme';
import { formatWhen, plural } from '../utils/dates';
import { effective } from '../services/feedback/corrections';

export default function Journal() {
  const { plantId: routePlantId } = useLocalSearchParams<{ plantId?: string }>();
  const { data, update, error: storeError } = useLocalStore();
  const [chosenId, setChosenId] = useState('');
  const [note, setNote] = useState('');
  const [message, setMessage] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState('');
  const plantId = routePlantId ?? chosenId;
  const plant = data.plants.find((item) => item.id === plantId);
  const entries = data.journal.filter((item) => item.plantId === plantId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const diagnoses = data.diagnoses.map(effective).filter((item) => item.plantId === plantId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const rename = async () => {
    const name = newName.trim();
    if (!plant || !name) return;
    try { await update((old) => ({ ...old, plants: old.plants.map((item) => item.id === plant.id ? { ...item, name } : item) })); setRenaming(false); setMessage('Plant name saved.'); }
    catch { setMessage('Plant name was not saved.'); }
  };
  const saveNote = async () => {
    if (!plant || !note.trim()) return;
    const entry: JournalEntry = { id: `note-${Date.now()}`, plantId, kind: 'note', text: note.trim(), createdAt: new Date().toISOString() };
    try { await update((old) => ({ ...old, journal: [...old.journal, entry] })); setNote(''); setMessage('Note saved.'); }
    catch { setMessage('Note was not saved.'); }
  };
  const addPhoto = async (source: 'camera' | 'library') => {
    if (!plant) return;
    try {
      const uri = await choosePhoto(source);
      if (!uri) return;
      const entry: JournalEntry = { id: `photo-${Date.now()}`, plantId, kind: 'photo', text: 'Photo added', photoUri: uri, createdAt: new Date().toISOString() };
      await update((old) => ({ ...old, journal: [...old.journal, entry] })); setMessage('Photo copied and saved to this plant.');
    } catch (cause) { setMessage(`Photo was not saved: ${String(cause)}`); }
  };
  const timeline = [
    ...diagnoses.map((item) => ({ id: item.id, kind: 'diagnosis' as const, createdAt: item.createdAt, text: `Scan: ${item.condition}`, photoUri: item.photoUri })),
    ...entries.filter((entry) => entry.kind !== 'task' || data.plans.some((plan) => plan.plantId === plantId && plan.tasks.some((task) => task.id === entry.taskId && task.done))),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const latestPhoto = entries.find((entry) => entry.photoUri)?.photoUri ?? diagnoses.find((item) => item.photoUri)?.photoUri;
  const kindIcon = (kind: string): IconName => ({ diagnosis: 'bug-outline', photo: 'camera-outline', task: 'checkmark-done-outline', observation: 'eye-outline', note: 'create-outline' } as Record<string, IconName>)[kind] ?? 'ellipse-outline';
  if (!plant) return <Page title="Plant Journal" tab="journal">
    {storeError ? <Banner tone="error" text={storeError} /> : null}<Notice message={message} onClear={() => setMessage('')} />
    {data.plants.length ? data.plants.map((item) => {
      const journalPhoto = data.journal.filter((entry) => entry.plantId === item.id && entry.photoUri).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]?.photoUri;
      const scanPhoto = data.diagnoses.map(effective).filter((d) => d.plantId === item.id && d.photoUri).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]?.photoUri;
      const photo = journalPhoto ?? scanPhoto;
      const count = data.journal.filter((entry) => entry.plantId === item.id).length + data.diagnoses.filter((d) => d.plantId === item.id).length;
      return <Row key={item.id} title={item.name} subtitle={item.crop} thumb={photo ? <PersistedPhoto uri={photo} height={68} cover /> : undefined} meta={<Pill label={`${count} ${count === 1 ? 'entry' : 'entries'}`} tone="neutral" />} onPress={() => setChosenId(item.id)} />;
    }) : <Card tone="soft"><Info>No plants yet.</Info></Card>}
    <Button label="Photo Gallery" icon="images-outline" onPress={() => router.push('/gallery')} outline />
  </Page>;
  return <Page back={!!routePlantId} tab={routePlantId ? undefined : 'journal'} right={!routePlantId ? <RoundButton icon="swap-horizontal" label="Switch plant" onPress={() => setChosenId('')} /> : undefined} hero={<View style={s.hero}>{latestPhoto ? <PersistedPhoto uri={latestPhoto} height={190} cover /> : <LeafArt size={130} />}</View>}>
    {storeError ? <Banner tone="error" text={storeError} /> : null}
    <View style={s.sheet}>
      {renaming ? <InputAction icon="pricetag-outline" placeholder="Plant nickname" value={newName} onChangeText={setNewName} action="Save" onAction={() => void rename()} /> : <View style={s.nameRow}>
        <Text style={[ui.serifTitle, { flex: 1 }]}>{plant.name}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Rename plant" onPress={() => { setNewName(plant.name); setRenaming(true); }} hitSlop={8} style={s.editBtn}><Icon name="create-outline" size={18} color={theme.muted} /></Pressable>
      </View>}
      <Text style={ui.italic}>{plant.crop}</Text>
      <View style={s.metaRow}><View style={s.metaItem}><Icon name="pulse-outline" size={15} color={theme.muted} /><Text style={s.meta}>{plural(diagnoses.length, 'diagnosis', 'diagnoses')}</Text></View><View style={s.metaItem}><Icon name="book-outline" size={15} color={theme.muted} /><Text style={s.meta}>{plural(entries.length, 'journal entry', 'journal entries')}</Text></View></View>
      <View style={{ height: 14 }} />
      <View style={s.chips}>
        <Chip icon="images-outline" label="Gallery" onPress={() => void addPhoto('library')} />
        <Chip icon="camera-outline" label="Camera" onPress={() => void addPhoto('camera')} />
        <Chip icon="git-compare-outline" label="Compare" onPress={() => router.push({ pathname: '/compare', params: { plantId } })} />
        <Chip icon="share-social-outline" label="Share" onPress={() => router.push({ pathname: '/share', params: { plantId } })} />
      </View>
    </View>
    <Notice message={message} onClear={() => setMessage('')} />
    <InputAction placeholder="Write a note" value={note} onChangeText={setNote} action="Save" onAction={() => void saveNote()} multiline />
    <SectionTitle title="Timeline" />
    {timeline.length ? timeline.map((entry, index) => <View key={entry.id} style={s.tlRow}>
      <View style={s.tlRail}><View style={s.tlDot}><Icon name={kindIcon(entry.kind)} size={14} color="#fff" /></View>{index < timeline.length - 1 ? <View style={s.tlLine} /> : null}</View>
      <View style={s.tlCard}><Text style={s.tlDate}>{formatWhen(entry.createdAt)}</Text><Text style={s.text}>{entry.text}</Text>{entry.photoUri ? <View style={{ marginTop: 10 }}><PersistedPhoto uri={entry.photoUri} /></View> : null}</View>
    </View>) : <Info>No entries yet.</Info>}
    <Button small label="All photos" icon="images-outline" onPress={() => router.push('/gallery')} outline />
  </Page>;
}
const s = StyleSheet.create({
  hero: { height: 190, borderRadius: 24, backgroundColor: theme.surfaceAlt, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: -28 },
  sheet: { backgroundColor: theme.surface, borderRadius: 22, padding: 16, marginBottom: 14, ...shadow },
  metaRow: { flexDirection: 'row', alignItems: 'center', columnGap: 16, rowGap: 6, flexWrap: 'wrap', marginTop: 10 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  editBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: theme.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  meta: { color: theme.muted, fontFamily: font.regular, fontSize: type.small },
  chips: { flexDirection: 'row', justifyContent: 'space-between' },
  text: { fontFamily: font.regular, fontSize: type.body, color: theme.text, lineHeight: lineHeight(type.body) },
  tlRow: { flexDirection: 'row', gap: 12 },
  tlRail: { width: 28, alignItems: 'center' },
  tlDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center', marginTop: 14 },
  tlLine: { flex: 1, width: 2, backgroundColor: theme.border, marginTop: 4 },
  tlCard: { flex: 1, minWidth: 0, backgroundColor: theme.surface, borderRadius: 18, padding: 14, marginBottom: 12, ...shadow },
  tlDate: { color: theme.muted, fontFamily: font.regular, fontSize: type.small, marginBottom: 4 },
});