import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import GuidanceMarkdown from '../components/GuidanceMarkdown';
import PlantGrowthLoader from '../components/PlantGrowthLoader';
import { Banner, Button, Card, Choice, Icon, Info, LeafArt, Page, Pill, RoundButton, ui, type IconName } from '../components/Ui';
import { displayCondition, labelsFor, type LabelOption } from '../data/labels';
import { hasConsent } from '../data/terms';
import { applyCorrection, effective } from '../services/feedback/corrections';
import { PopIn, Sheet, useToast } from '../components/Motion';
import { ApiError } from '../services/api/client';
import { loadGuidance } from '../services/api/guidance';
import { useLocalStore } from '../services/storage/LocalStore';
import PlantPicker from '../components/PlantPicker';
import { resolvePlant, uid } from '../services/plants/resolve';
import type { CarePlan, GuidanceMode } from '../types/models';
import { font, shadow, statusColors, statusTone, theme, type, lineHeight } from '../theme';

export default function Result() {
  const { id, view } = useLocalSearchParams<{ id: string; view?: string }>();
  return <ResultBody key={id} id={id} viewOnly={view === '1'} />;
}

/** viewOnly: opened from History, so it is a record. No new guidance; a linked plan opens directly. */
function ResultBody({ id, viewOnly }: { id: string; viewOnly: boolean }) {
  const { data, update } = useLocalStore();
  const stored = data.diagnoses.find((item) => item.id === id);
  const diagnosis = stored ? effective(stored) : undefined;
  const [fixing, setFixing] = useState(false);
  const [pick, setPick] = useState<LabelOption | null>(null);
  const [share, setShare] = useState(false);
  // Turning sharing on first needs the Terms; the switch turns on by itself once the user agrees.
  const [wantShare, setWantShare] = useState(false);
  const consented = hasConsent(data.consent);
  const shareOn = consented && (share || wantShare);
  // A popup sits above every screen, so hide it while Terms is open and bring it back on return.
  const reopenFix = useRef(false);
  const openTerms = () => { reopenFix.current = true; setFixing(false); router.push('/terms'); };
  useFocusEffect(useCallback(() => { if (reopenFix.current) { reopenFix.current = false; setFixing(true); } }, []));
  const toggleShare = (on: boolean) => {
    if (!on) { setShare(false); setWantShare(false); return; }
    if (consented) setShare(true); else { setWantShare(true); openTerms(); }
  };
  const [fixError, setFixError] = useState('');
  const [guideOpen, setGuideOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const linked = data.plants.find((item) => item.id === stored?.plantId);
  const [plantName, setPlantName] = useState(linked?.name ?? '');
  const [plantSel, setPlantSel] = useState(linked?.id ?? '');
  const [plantErr, setPlantErr] = useState('');
  const pickPlant = (value: string, pid: string) => { setPlantName(value); setPlantSel(pid); setPlantErr(''); };
  const toast = useToast();
  const [mode, setMode] = useState<GuidanceMode | null>(null);
  const [pending, setPending] = useState<Record<GuidanceMode, boolean>>({ quick: false, advanced: false });
  const [errors, setErrors] = useState<Partial<Record<GuidanceMode, string>>>({});
  const controllers = useRef<Partial<Record<GuidanceMode, AbortController>>>({});
  const inFlight = useRef<Partial<Record<GuidanceMode, boolean>>>({});
  const fade = useRef(new Animated.Value(1)).current;
  const guidance = data.guidance.find((item) => item.diagnosisId === id && item.mode === mode);
  useEffect(() => () => { Object.values(controllers.current).forEach((controller) => controller?.abort()); }, [id]);
  const choose = async (next: GuidanceMode, retry = false) => {
    setMode(next); setGuideOpen(true); fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 210, useNativeDriver: true }).start();
    if (!diagnosis || inFlight.current[next] || (!retry && data.guidance.some((item) => item.diagnosisId === id && item.mode === next))) return;
    const controller = new AbortController(); controllers.current[next]?.abort(); controllers.current[next] = controller;
    inFlight.current[next] = true;
    setPending((old) => ({ ...old, [next]: true })); setErrors((old) => ({ ...old, [next]: undefined }));
    try {
      const value = await loadGuidance(diagnosis, next, controller.signal);
      if (controller.signal.aborted) return;
      await update((current) => ({ ...current, guidance: [...current.guidance.filter((item) => item.id !== value.id), value] }));
    } catch (cause) {
      if (!controller.signal.aborted) setErrors((old) => ({ ...old, [next]: cause instanceof ApiError ? `${cause.code}: ${cause.message}` : `Could not save guidance: ${String(cause)}` }));
    } finally { inFlight.current[next] = false; if (!controller.signal.aborted) setPending((old) => ({ ...old, [next]: false })); }
  };
  if (!diagnosis) return <Page title="Model Result" back><Banner tone="error" text="Diagnosis not found. Return to Home." /><Button label="Home" icon="home" onPress={() => router.replace('/')} /></Page>;
  const facts: { icon: IconName; label: string; value: string }[] = [
    { icon: 'nutrition-outline', label: 'Crop', value: diagnosis.crop },
    ...(diagnosis.correction ? [{ icon: 'hardware-chip-outline' as IconName, label: 'Model said', value: displayCondition(stored?.condition ?? '') }] : diagnosis.confidence !== undefined ? [{ icon: 'analytics-outline' as IconName, label: diagnosis.isMock ? 'Confidence (mock)' : 'Confidence', value: `${Math.round(diagnosis.confidence * 100)}%` }] : []),
  ];
  const tone = statusColors(diagnosis.status);
  const plans = data.plans.filter((item) => item.diagnosisId === id);
  const startPlan = async () => {
    if (!guidance) return;
    const existing = data.plans.find((item) => item.diagnosisId === id && item.guidanceId === guidance.id);
    if (existing) { setGuideOpen(false); return router.push({ pathname: '/care-plan', params: { id: existing.id } }); }
    const chosen = resolvePlant(data, plantName, plantSel, diagnosis.crop);
    if (!chosen) return setPlantErr('Choose a plant or type a new name.');
    const plan: CarePlan = { id: uid('plan'), plantId: chosen.plant.id, diagnosisId: id, guidanceId: guidance.id, source: guidance.source, markdown: guidance.markdown, tasks: [], createdAt: new Date().toISOString() };
    try {
      await update((old) => ({ ...old, plants: chosen.isNew ? [...old.plants, chosen.plant] : old.plants, diagnoses: old.diagnoses.map((item) => item.id === id ? { ...item, plantId: chosen.plant.id } : item), plans: [...old.plans, plan] }));
      setGuideOpen(false); router.push({ pathname: '/routine', params: { planId: plan.id, fresh: '1' } });
    } catch { setPlantErr('Could not save. Try again.'); }
  };
  const saveToPlant = async () => {
    const chosen = resolvePlant(data, plantName, plantSel, diagnosis.crop);
    if (!chosen) return setPlantErr('Choose a plant or type a new name.');
    try {
      await update((old) => ({ ...old, plants: chosen.isNew ? [...old.plants, chosen.plant] : old.plants, diagnoses: old.diagnoses.map((item) => item.id === id ? { ...item, plantId: chosen.plant.id } : item) }));
      setSaveOpen(false); toast(`Saved to ${chosen.plant.name}`, 'leaf');
    } catch { setPlantErr('Could not save. Try again.'); }
  };
  const openFix = () => { setFixing(true); setPick(null); setFixError(''); setShare(diagnosis.correction?.share ?? false); setWantShare(false); };
  const saveFix = async () => {
    if (!pick) return;
    const condition = displayCondition(pick.condition);
    try {
      await update((old) => applyCorrection(old, id, { label: pick.label, condition, status: condition === 'Healthy' ? 'Healthy' : 'Unhealthy', share: shareOn, createdAt: new Date().toISOString() }));
      setFixing(false); setMode(null); toast('Result corrected');
    } catch (cause) { setFixError(`Could not save: ${String(cause)}`); }
  };
  return <Page back tint={tone.tint} right={viewOnly ? undefined : <RoundButton icon="time-outline" label="History" onPress={() => router.push('/history')} />} hero={<View style={[s.hero, { backgroundColor: tone.soft }]}>
    <PopIn delay={120}><LeafArt size={140} icon={diagnosis.status === 'Healthy' ? 'leaf' : diagnosis.status === 'Unhealthy' ? 'bug-outline' : 'help-circle-outline'} colors={tone} /></PopIn>
    <View style={s.heroPill}><Pill label={diagnosis.status} tone={statusTone(diagnosis.status)} icon={diagnosis.status === 'Healthy' ? 'checkmark-circle-outline' : diagnosis.status === 'Unhealthy' ? 'alert-circle-outline' : 'help-circle-outline'} /></View>
  </View>}>
    <View style={s.sheet}>
      <Text style={ui.serifTitle}>{displayCondition(diagnosis.condition)}</Text>
      <View style={{ height: 14 }} />
      <View style={s.facts}>{facts.map((fact) => <View key={fact.label} style={s.fact}><View style={[s.factIcon, { backgroundColor: tone.soft }]}><Icon name={fact.icon} size={17} color={tone.main} /></View><Text style={[s.factValue, fact.label === 'Status' && { color: tone.main }]} numberOfLines={1}>{fact.value}</Text><Text style={s.factLabel} numberOfLines={2}>{fact.label}</Text></View>)}</View>
      <View style={s.fixRow}>
        {diagnosis.correction ? <Pill label="Corrected by you" tone="neutral" icon="person-outline" /> : <View />}
        <Pressable accessibilityRole="button" onPress={openFix} hitSlop={8} style={s.fixBtn}><Icon name='create-outline' size={15} color={theme.muted} /><Text style={s.fixText}>{diagnosis.correction ? 'Change' : 'Not right?'}</Text></Pressable>
      </View>
    </View>
    <Sheet visible={guideOpen} onClose={() => setGuideOpen(false)} title={mode === 'advanced' ? 'Advanced care' : 'Quick care'}>
      {mode && pending[mode] ? <PlantGrowthLoader compact stepMs={380} label={mode === 'advanced' ? 'Preparing advanced guidance…' : 'Loading quick guidance…'} /> : null}
      {mode && errors[mode] ? <><Banner tone="error" text={errors[mode] ?? ''} /><Button label="Try Again" icon="refresh" onPress={() => void choose(mode, true)} /></> : null}
      {mode && guidance && !pending[mode] && !errors[mode] ? <><GuidanceMarkdown markdown={guidance.markdown} /><View style={{ height: 12 }} /><PlantPicker plants={data.plants} name={plantName} selectedId={plantSel} error={plantErr} onChange={pickPlant} /><Button label="Start Care Plan" icon="clipboard-outline" color={tone.main} onPress={() => void startPlan()} /></> : null}
    </Sheet>
    <Sheet visible={fixing} onClose={() => setFixing(false)} title="What is it?">
      <View style={[ui.rowWrap, { marginTop: 4 }]}>{labelsFor(diagnosis.crop).map((option) => <Choice key={option.label} label={displayCondition(option.condition)} active={pick?.label === option.label} onPress={() => setPick(option)} />)}</View>
      <View style={s.shareRow}><View style={{ flex: 1 }}><Text style={s.shareText}>Share photo to improve the model</Text><Pressable accessibilityRole="link" onPress={openTerms} hitSlop={6}><Text style={s.termsLink}>Terms</Text></Pressable></View><Switch value={shareOn} onValueChange={toggleShare} trackColor={{ true: theme.primary, false: theme.border }} thumbColor={theme.surface} /></View>
      {fixError ? <Banner tone="error" text={fixError} /> : null}
      <Button label="Save" icon="checkmark" disabled={!pick} onPress={() => void saveFix()} />
    </Sheet>
    {viewOnly ? <>
      {plans.length ? plans.map((plan, i) => <Button key={plan.id} label={plans.length > 1 ? `Open plan ${i + 1}` : "Open plan"} icon="clipboard-outline" color={tone.main} onPress={() => router.push({ pathname: '/care-plan', params: { id: plan.id } })} />)
        : linked ? <Button label={linked.name} icon="leaf" outline onPress={() => router.push({ pathname: '/journal', params: { plantId: linked.id } })} /> : null}
    </> : diagnosis.status === 'Unhealthy' ? <>
      {(['quick', 'advanced'] as const).map((option) => <Pressable key={option} accessibilityRole="button" accessibilityState={{ selected: mode === option }} onPress={() => void choose(option)} style={[s.option, mode === option && { borderColor: tone.main }]}>
        <View style={[s.optionIcon, { backgroundColor: mode === option ? tone.main : tone.soft }]}><Icon name={option === 'quick' ? 'flash-outline' : 'sparkles-outline'} size={18} color={mode === option ? '#fff' : tone.main} /></View>
        <Text style={[s.optionTitle, { flex: 1 }]}>{option === 'quick' ? 'Quick care' : 'Advanced care'}</Text>
        <Icon name={mode === option ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={mode === option ? tone.main : theme.border} />
      </Pressable>)}

    </> : <>
      <Card style={{ backgroundColor: tone.soft }}><Info>{diagnosis.status === 'Healthy' ? 'Looks healthy. Keep it up!' : 'Not sure. Try a clearer photo.'}</Info></Card>
      {linked ? <Button label={linked.name} icon="leaf" color={tone.main} onPress={() => router.push({ pathname: '/journal', params: { plantId: linked.id } })} /> : <Button label="Save to plant" icon="leaf-outline" color={tone.main} onPress={() => { setPlantErr(''); setSaveOpen(true); }} />}
    </>}
    {viewOnly ? null : <Button label="Scan again" icon="scan-outline" onPress={() => router.replace('/scan')} outline />}
    <Sheet visible={saveOpen} onClose={() => setSaveOpen(false)} title="Save to plant">
      <PlantPicker plants={data.plants} name={plantName} selectedId={plantSel} error={plantErr} onChange={pickPlant} />
      <Button label="Save" icon="checkmark" color={tone.main} onPress={() => void saveToPlant()} />
    </Sheet>
  </Page>;
}
const s = StyleSheet.create({
  hero: { height: 190, borderRadius: 24, backgroundColor: theme.surfaceAlt, alignItems: 'center', justifyContent: 'center', marginBottom: -28 },
  heroPill: { position: 'absolute', top: 14, left: 14, right: 14, alignItems: 'center' },
  sheet: { backgroundColor: theme.surface, borderRadius: 22, padding: 16, marginBottom: 14, ...shadow },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  divider: { width: 1, height: 16, backgroundColor: theme.border, marginHorizontal: 4 },
  meta: { color: theme.muted, fontFamily: font.regular, fontSize: type.body },
  facts: { flexDirection: 'row', justifyContent: 'space-between' },
  fact: { flex: 1, alignItems: 'center', gap: 4 },
  factIcon: { width: 36, height: 36, borderRadius: 11, backgroundColor: theme.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  factValue: { fontFamily: font.semibold, color: theme.text, fontSize: type.small },
  factLabel: { color: theme.muted, fontFamily: font.regular, fontSize: type.caption, textAlign: 'center' },
  small: { color: theme.muted, fontFamily: font.regular, fontSize: type.small, lineHeight: lineHeight(type.small) },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, backgroundColor: theme.surface, borderColor: theme.surface, borderWidth: 1.5, borderRadius: theme.radius, marginBottom: 9, ...shadow },
  optionIcon: { width: 36, height: 36, borderRadius: 11, backgroundColor: theme.primarySoft, alignItems: 'center', justifyContent: 'center' },
  fixRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18 },
  fixBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  fixText: { color: theme.muted, fontFamily: font.medium, fontSize: type.small },
  shareRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 10, marginBottom: 6, borderTopWidth: 1, borderColor: theme.border },
  termsLink: { color: theme.primary, fontFamily: font.semibold, fontSize: type.small, marginTop: 2, textDecorationLine: 'underline' },
  shareText: { color: theme.text, fontFamily: font.regular, fontSize: type.body },
  optionTitle: { color: theme.text, fontSize: type.body, fontFamily: font.semibold },
});
