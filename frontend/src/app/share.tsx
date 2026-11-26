import { useState } from 'react';
import { Platform, Share, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import BeforeAfter from '../components/BeforeAfter';
import { Banner, Button, Icon, Page, ui, Notice } from '../components/Ui';
import { useLocalStore } from '../services/storage/LocalStore';
import { font, shadow, theme, type, lineHeight } from '../theme';
import { effective } from '../services/feedback/corrections';

const DAY = 86400000;

export default function ShareCard() {
  const { plantId } = useLocalSearchParams<{ plantId: string }>();
  const { data } = useLocalStore();
  const [message, setMessage] = useState('');
  const [now] = useState(() => Date.now());
  const plant = data.plants.find((item) => item.id === plantId);
  const photos = data.journal.filter((item) => item.plantId === plantId && item.photoUri).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const diagnoses = data.diagnoses.map(effective).filter((item) => item.plantId === plantId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const plans = data.plans.filter((item) => item.plantId === plantId);
  const tasks = plans.flatMap((plan) => plan.tasks);
  const done = tasks.filter((task) => task.done).length;
  const observation = data.journal.filter((item) => item.plantId === plantId && item.kind === 'observation').sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  const start = diagnoses[0]?.createdAt ?? plant?.createdAt;
  const days = start ? Math.max(1, Math.floor((now - new Date(start).getTime()) / DAY) + 1) : 1;
  const condition = diagnoses[0]?.condition;
  const first = photos[0];
  const latest = photos.length > 1 ? photos[photos.length - 1] : undefined;

  if (!plant) return <Page title="Share Progress" back><Banner tone="error" text="Plant not found." /><Button label="Home" icon="home-outline" onPress={() => router.replace('/')} /></Page>;

  const summary = [
    `${plant.name} (${plant.crop}) — Day ${days} of care`,
    condition ? `Started with: ${condition}${diagnoses[0]?.isMock ? ' (sample diagnosis)' : ''}` : null,
    tasks.length ? `Care tasks done: ${done}/${tasks.length}` : null,
    observation ? `My observation: ${observation.text.replace(' (user observation, not a model conclusion)', '')}` : null,
    'Tracked with Urban Agri-Care',
  ].filter(Boolean).join('\n');

  const share = async () => {
    try {
      // Text share works in Expo Go. iOS can also attach the latest photo by file URL.
      const photo = (latest ?? first)?.photoUri;
      const result = await Share.share(Platform.OS === 'ios' && photo ? { message: summary, url: photo } : { message: summary, title: `${plant.name} progress` });
      setMessage(result.action === Share.sharedAction ? 'Progress card shared.' : 'Share cancelled.');
    } catch (cause) { setMessage(`Could not open the share sheet: ${String(cause)}`); }
  };

  return <Page title="Share Progress" back>
    <View style={s.card}>
      <View style={s.cardTop}>
        <Text style={ui.label}>Recovery card</Text>
        <View style={s.dayBadge}><Text style={s.dayNum}>{days}</Text><Text style={s.dayLabel}>{days === 1 ? 'day' : 'days'}</Text></View>
      </View>
      <Text style={s.name}>{plant.name}</Text>
      <Text style={ui.italic}>{plant.crop}{condition ? ` · ${condition}` : ''}</Text>

      <BeforeAfter before={first?.photoUri ? { uri: first.photoUri, createdAt: first.createdAt } : undefined} now={latest?.photoUri ? { uri: latest.photoUri, createdAt: latest.createdAt } : undefined} />

      {observation ? <View style={s.quote}><Icon name="chatbubble-ellipses-outline" size={16} color={theme.muted} /><Text style={s.quoteText}>{observation.text.replace(' (user observation, not a model conclusion)', '')}</Text></View> : null}
      <View style={s.brandRow}><Icon name="leaf" size={14} /><Text style={s.brand}>Urban Agri-Care</Text></View>
    </View>

    <Notice message={message} onClear={() => setMessage('')} />
    <Button label="Share Progress" icon="share-social-outline" onPress={() => void share()} />
    {photos.length < 2 ? <Button label="Add a Journal Photo" icon="camera-outline" outline onPress={() => router.push({ pathname: '/journal', params: { plantId } })} /> : null}
  </Page>;
}
const s = StyleSheet.create({
  card: { backgroundColor: theme.surface, borderRadius: 28, padding: 20, marginBottom: 16, ...shadow },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dayBadge: { backgroundColor: theme.primary, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 6, alignItems: 'center' },
  dayNum: { color: '#fff', fontFamily: font.bold, letterSpacing: -0.3, fontSize: type.title, lineHeight: lineHeight(type.title) },
  dayLabel: { color: '#fff', fontSize: type.caption, fontFamily: font.semibold },
  name: { fontFamily: font.bold, letterSpacing: -0.3, fontSize: type.display, lineHeight: lineHeight(type.display), color: theme.text, marginTop: 4 },
  quote: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginTop: 14, padding: 12, borderRadius: 14, backgroundColor: theme.surfaceAlt },
  quoteText: { flex: 1, color: theme.text, fontFamily: font.regular, fontSize: type.small, lineHeight: lineHeight(type.small) },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', marginTop: 16 },
  brand: { color: theme.primary, fontFamily: font.bold, fontSize: type.small, letterSpacing: 1.5, textTransform: 'uppercase' },
});
