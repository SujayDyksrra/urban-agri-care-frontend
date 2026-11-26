import type { ComponentProps, PropsWithChildren, ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { FadeIn, PressScale, useToastMessage } from './Motion';
import { font, shadow, statusColors, theme, type, lineHeight } from '../theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];
export function Icon({ name, size = 20, color = theme.primary }: { name: IconName; size?: number; color?: string }) {
  return <Ionicons name={name} size={size} color={color} />;
}

export type TabKey = 'home' | 'scan' | 'schedule' | 'journal' | 'history';
const tabs: { key: TabKey; label: string; icon: IconName; activeIcon: IconName; path: '/' | '/scan' | '/schedule' | '/journal' | '/history' }[] = [
  { key: 'home', label: 'Home', icon: 'home-outline', activeIcon: 'home', path: '/' },
  { key: 'schedule', label: 'Schedule', icon: 'calendar-outline', activeIcon: 'calendar', path: '/schedule' },
  { key: 'scan', label: 'Scan', icon: 'scan-outline', activeIcon: 'scan', path: '/scan' },
  { key: 'journal', label: 'Journal', icon: 'leaf-outline', activeIcon: 'leaf', path: '/journal' },
  { key: 'history', label: 'History', icon: 'time-outline', activeIcon: 'time', path: '/history' },
];

export function goBack() { if (router.canGoBack()) router.back(); else router.replace('/'); }

/**
 * Screen shell. `tab` shows the bottom navigation; `back` shows a round back button.
 * `title` is rendered as a bold heading unless `hero` replaces the header content.
 */
export function Page({ title, subtitle, back = false, tab, right, hero, tint, children }: PropsWithChildren<{ title?: string; subtitle?: string; back?: boolean; tab?: TabKey; right?: ReactNode; hero?: ReactNode; tint?: string }>) {
  return <SafeAreaView style={[s.safe, tint ? { backgroundColor: tint } : null]} edges={['top', 'left', 'right']}>
    <ScrollView contentContainerStyle={[s.content, tab && { paddingBottom: 120 }]} keyboardShouldPersistTaps="handled">
      {back || right ? <View style={s.topBar}>
        {back ? <RoundButton icon="chevron-back" label="Back" onPress={goBack} /> : <View />}
        {back && title ? <Text style={s.topTitle} numberOfLines={1}>{title}</Text> : null}
        <View style={s.topRight}>{right}{back ? <RoundButton icon="home-outline" label="Home" onPress={() => router.dismissTo('/')} /> : null}{!right && !back ? <View style={{ width: 36 }} /> : null}</View>
      </View> : null}
      {hero}
      {!back && title ? <Text style={s.title}>{title}</Text> : null}
      {subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}
      <FadeIn>{children}</FadeIn>
    </ScrollView>
    {tab ? <TabBar active={tab} /> : null}
  </SafeAreaView>;
}

export function TabBar({ active }: { active: TabKey }) {
  return <SafeAreaView edges={['bottom']} style={s.tabWrap}>
    <View style={s.tabBar}>
      {tabs.map((tab) => {
        const on = tab.key === active;
        // Scan is the main action: a raised round button in the middle of the bar.
        if (tab.key === 'scan') return <View key={tab.key} style={s.tab}><Pressable accessibilityRole="button" accessibilityLabel="Scan a leaf" onPress={() => router.push('/scan')} style={({ pressed }) => [s.scanFab, pressed && { transform: [{ scale: 0.94 }] }]}><Icon name="scan" size={26} color="#fff" /></Pressable></View>;
        return <Pressable key={tab.key} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={tab.label} onPress={() => { if (!on) router.navigate(tab.path); }} style={s.tab}>
          <View style={[s.tabIcon, on && s.tabIconOn]}><Icon name={on ? tab.activeIcon : tab.icon} size={19} color={on ? '#fff' : theme.muted} /></View>
          <Text style={[s.tabLabel, on && s.tabLabelOn]}>{tab.label}</Text>
        </Pressable>;
      })}
    </View>
  </SafeAreaView>;
}

export function RoundButton({ icon, label, onPress, filled = false }: { icon: IconName; label: string; onPress: () => void; filled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={6} style={({ pressed }) => [s.round, filled && { backgroundColor: theme.primary }, pressed && { opacity: 0.6 }]}>
    <Icon name={icon} size={18} color={filled ? '#fff' : theme.text} />
  </Pressable>;
}

export function Button({ label, onPress, outline = false, disabled = false, icon, small = false, color }: { label: string; onPress: () => void; outline?: boolean; disabled?: boolean; icon?: IconName; small?: boolean; color?: string }) {
  return <PressScale accessibilityRole="button" disabled={disabled} onPress={onPress} style={[s.button, color ? { backgroundColor: color } : null, small && s.buttonSmall, outline && s.outline]}>
    {icon ? <Icon name={icon} size={small ? 15 : 17} color={outline ? theme.primary : '#fff'} /> : null}
    <Text style={[s.buttonText, small && { fontFamily: font.regular, fontSize: type.small }, outline && s.outlineText]}>{label}</Text>
  </PressScale>;
}

export function Card({ children, style, tone = 'surface' }: PropsWithChildren<{ style?: StyleProp<ViewStyle>; tone?: 'surface' | 'soft' | 'demo' }>) {
  return <View style={[s.card, tone === 'soft' && { backgroundColor: theme.primarySoft }, tone === 'demo' && { backgroundColor: theme.demoBackground }, style]}>{children}</View>;
}
export function Info({ children }: PropsWithChildren) { return <Text style={s.info}>{children}</Text>; }

export function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return <View style={s.section}>
    <Text style={s.sectionTitle}>{title}</Text>
    {action && onAction ? <Pressable accessibilityRole="button" onPress={onAction} hitSlop={8} style={s.sectionAction}><Text style={s.sectionActionText}>{action}</Text><Icon name="arrow-forward" size={14} color={theme.muted} /></Pressable> : null}
  </View>;
}

/** Square icon chip with a caption, like the category row in the reference design. */
export function Chip({ icon, label, active = false, onPress }: { icon: IconName; label: string; active?: boolean; onPress: () => void }) {
  return <PressScale accessibilityRole="button" accessibilityState={{ selected: active }} onPress={onPress} scaleTo={0.9} style={s.chip}>
    <View style={[s.chipBox, active && s.chipBoxOn]}><Icon name={icon} size={24} color={active ? '#fff' : theme.primary} /></View>
    <Text style={[s.chipLabel, active && { color: theme.text, fontFamily: font.semibold }]} numberOfLines={2}>{label}</Text>
  </PressScale>;
}

/** Horizontal selectable pill (for choosing a plant or an option). */
export function Choice({ label, active, onPress, icon }: { label: string; active: boolean; onPress: () => void; icon?: IconName }) {
  return <Pressable accessibilityRole="radio" accessibilityState={{ selected: active }} onPress={onPress} style={[s.choice, active && s.choiceOn]}>
    <Icon name={active ? 'checkmark-circle' : (icon ?? 'ellipse-outline')} size={18} color={active ? '#fff' : theme.sage} />
    <Text style={[s.choiceText, active && { color: '#fff' }]}>{label}</Text>
  </Pressable>;
}

export function Pill({ label, tone = 'green', icon }: { label: string; tone?: 'green' | 'warn' | 'danger' | 'neutral'; icon?: IconName }) {
  const colors = { green: [statusColors('Healthy').soft, statusColors('Healthy').main], warn: [statusColors('Uncertain').soft, statusColors('Uncertain').main], danger: [statusColors('Unhealthy').soft, statusColors('Unhealthy').main], neutral: [theme.surfaceAlt, theme.muted] }[tone];
  return <View style={[s.pill, { backgroundColor: colors[0] }]}>{icon ? <Icon name={icon} size={13} color={colors[1]} /> : null}<Text style={[s.pillText, { color: colors[1] }]}>{label}</Text></View>;
}

/** Cart-style list row: soft thumbnail, title, subtitle and trailing content. */
/** `accent` = a status colour set: outlines the row and tints its thumbnail. */
export function Row({ icon = 'leaf', title, subtitle, meta, right, onPress, onLongPress, thumb, accent }: { icon?: IconName; title: string; subtitle?: string; meta?: ReactNode; right?: ReactNode; onPress?: () => void; onLongPress?: () => void; thumb?: ReactNode; accent?: { main: string; soft: string } }) {
  const body = <>
    <View style={[s.rowThumb, accent && { backgroundColor: accent.soft }]}>{thumb ?? <Icon name={icon} size={26} color={accent?.main ?? theme.primary} />}</View>
    <View style={s.rowBody}>
      <Text style={s.rowTitle} numberOfLines={2}>{title}</Text>
      {subtitle ? <Text style={s.rowSubtitle} numberOfLines={2}>{subtitle}</Text> : null}
      {meta}
    </View>
    {right ?? (onPress ? <Icon name="chevron-forward" size={18} color={theme.muted} /> : null)}
  </>;
  return onPress
    ? <PressScale accessibilityRole="button" onPress={onPress} onLongPress={onLongPress} delayLongPress={400} scaleTo={0.98} style={[s.row, accent && { borderWidth: 1.5, borderColor: accent.main }]}>{body}</PressScale>
    : <View style={[s.row, accent && { borderWidth: 1.5, borderColor: accent.main }]}>{body}</View>;
}

/** Organic blob with a leaf, used as the illustration in hero areas. */
/** Pass `colors` (from statusColors) to tint the art for a diagnosis status. */
export function LeafArt({ size = 150, icon = 'leaf', colors }: { size?: number; icon?: IconName; colors?: { main: string; tint: string } }) {
  return <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={[s.blob, colors && { backgroundColor: colors.tint }, { width: size, height: size * 0.92, borderTopLeftRadius: size * 0.6, borderTopRightRadius: size * 0.45, borderBottomLeftRadius: size * 0.42, borderBottomRightRadius: size * 0.58 }]} />
    <View style={[s.pot, colors && { backgroundColor: colors.main, opacity: 0.55 }, { width: size * 0.42, height: size * 0.3, bottom: size * 0.06 }]} />
    <View style={{ position: 'absolute', top: size * 0.08 }}><Icon name={icon} size={size * 0.52} color={colors?.main ?? theme.primary} /></View>
  </View>;
}

export function Input(props: TextInputProps & { tall?: boolean }) {
  const { tall, style, ...rest } = props;
  return <TextInput placeholderTextColor={theme.muted} {...rest} style={[s.input, tall && { minHeight: 96, textAlignVertical: 'top' }, style]} />;
}

/** Text input with an inline action button, styled like the reference "Promo Code / Apply" row. */
export function InputAction({ value, onChangeText, placeholder, action, onAction, icon = 'create-outline', multiline = false }: { value: string; onChangeText: (v: string) => void; placeholder: string; action: string; onAction: () => void; icon?: IconName; multiline?: boolean }) {
  return <View style={s.inputAction}>
    <View style={s.inputActionField}><Icon name={icon} size={18} color={theme.muted} /><TextInput style={s.inputActionText} placeholder={placeholder} placeholderTextColor={theme.muted} value={value} onChangeText={onChangeText} multiline={multiline} /></View>
    <Pressable accessibilityRole="button" disabled={!value.trim()} onPress={onAction} style={({ pressed }) => [s.inputActionBtn, (!value.trim() || pressed) && { opacity: 0.5 }]}><Text style={s.inputActionBtnText}>{action}</Text></Pressable>
  </View>;
}

export function Banner({ text, tone = 'demo' }: { text: string; tone?: 'demo' | 'error' | 'ok' }) {
  const bg = tone === 'error' ? theme.dangerSoft : tone === 'ok' ? theme.primarySoft : theme.demoBackground;
  const fg = tone === 'error' ? theme.danger : tone === 'ok' ? theme.primary : theme.demoText;
  const icon: IconName = tone === 'error' ? 'alert-circle-outline' : tone === 'ok' ? 'checkmark-circle-outline' : 'flask-outline';
  return <FadeIn distance={8} style={[s.banner, { backgroundColor: bg }]}><Icon name={icon} size={17} color={fg} /><Text style={[s.bannerText, { color: fg }]}>{text}</Text></FadeIn>;
}

/** Picks a banner tone for a status message: green for confirmed saves, amber for everything else. */
export function noticeTone(message: string): 'ok' | 'demo' { return /(saved|scheduled|removed|copied)/i.test(message) && !/\b(not|failed|could)\b/i.test(message) ? 'ok' : 'demo'; }

/** Status line for a screen: successes pop up as a toast, problems stay inline as a banner. */
export function Notice({ message, onClear }: { message: string; onClear: () => void }) {
  const ok = !!message && noticeTone(message) === 'ok';
  useToastMessage(message, ok, onClear);
  if (!message || ok) return null;
  return <Banner tone={noticeTone(message)} text={message} />;
}

export function Progress({ value }: { value: number }) {
  return <View style={s.track}><View style={[s.fill, { width: `${Math.max(0, Math.min(1, value)) * 100}%` }]} /></View>;
}

export const ui = StyleSheet.create({
  serifTitle: { fontFamily: font.bold, letterSpacing: -0.3, fontSize: type.display, lineHeight: lineHeight(type.display), color: theme.text },
  serifMedium: { fontFamily: font.bold, letterSpacing: -0.3, fontSize: type.title, lineHeight: lineHeight(type.title), color: theme.text },
  italic: { color: theme.muted, fontFamily: font.regular, fontSize: type.body },
  label: { color: theme.muted, fontFamily: font.semibold, letterSpacing: 1, fontSize: type.caption, textTransform: 'uppercase' },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chipRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
});

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.background },
  content: { width: '100%', maxWidth: 540, alignSelf: 'center', paddingHorizontal: 18, paddingTop: 8, paddingBottom: 48 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, gap: 12 },
  topRight: { flexDirection: 'row', gap: 8 },
  topTitle: { flex: 1, textAlign: 'center', fontFamily: font.semibold, fontSize: type.body, color: theme.text },
  brand: { color: theme.sage, fontSize: type.small, fontFamily: font.semibold, letterSpacing: 2.2, marginBottom: 6, marginTop: 6 },
  title: { fontFamily: font.bold, letterSpacing: -0.3, fontSize: type.display, lineHeight: lineHeight(type.display), color: theme.text, marginBottom: 8 },
  subtitle: { color: theme.muted, fontFamily: font.regular, fontSize: type.body, lineHeight: lineHeight(type.body), marginBottom: 12 },
  round: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center', ...shadow },
  button: { minHeight: 44, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 14, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7, marginVertical: 4 },
  buttonSmall: { minHeight: 34, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, marginVertical: 0 },
  buttonText: { color: '#fff', fontSize: type.body, fontFamily: font.semibold, textAlign: 'center' },
  outline: { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border },
  outlineText: { color: theme.primary },
  card: { padding: 14, borderRadius: theme.radius, backgroundColor: theme.surface, marginBottom: 12, ...shadow },
  info: { color: theme.muted, fontFamily: font.regular, fontSize: type.body, lineHeight: lineHeight(type.body), marginBottom: 10 },
  section: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6, marginBottom: 8 },
  sectionTitle: { fontFamily: font.semibold, fontSize: type.body, color: theme.text },
  sectionAction: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sectionActionText: { color: theme.muted, fontSize: type.small, fontFamily: font.medium },
  chip: { alignItems: 'center', width: 64 },
  chipBox: { width: 48, height: 48, borderRadius: 15, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, alignItems: 'center', justifyContent: 'center', marginBottom: 5 },
  chipBoxOn: { backgroundColor: theme.primary, borderColor: theme.primary },
  chipLabel: { fontFamily: font.regular, fontSize: type.caption, color: theme.muted, textAlign: 'center' },
  choice: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 11, borderRadius: 999, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border },
  choiceOn: { backgroundColor: theme.primary, borderColor: theme.primary },
  choiceText: { color: theme.text, fontSize: type.small, fontFamily: font.medium },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 999 },
  pillText: { fontSize: type.caption, fontFamily: font.semibold },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 9, borderRadius: theme.radius, backgroundColor: theme.surface, marginBottom: 9, ...shadow },
  rowThumb: { width: 50, height: 50, borderRadius: 13, backgroundColor: theme.primarySoft, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  rowBody: { flex: 1, minWidth: 0, gap: 3 },
  rowTitle: { fontSize: type.body, fontFamily: font.semibold, color: theme.text },
  rowSubtitle: { fontFamily: font.regular, fontSize: type.small, color: theme.muted },
  blob: { position: 'absolute', backgroundColor: theme.sageLight },
  pot: { position: 'absolute', backgroundColor: theme.sage, borderBottomLeftRadius: 18, borderBottomRightRadius: 18, borderTopLeftRadius: 6, borderTopRightRadius: 6 },
  input: { borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, fontFamily: font.regular, fontSize: type.body, marginBottom: 10, color: theme.text },
  inputAction: { flexDirection: 'row', gap: 10, alignItems: 'stretch', marginBottom: 14 },
  inputActionField: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, borderRadius: 14, paddingHorizontal: 12, minHeight: 44 },
  inputActionText: { flex: 1, fontFamily: font.regular, fontSize: type.body, color: theme.text, paddingVertical: 10 },
  inputActionBtn: { backgroundColor: theme.primary, borderRadius: 14, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  inputActionBtnText: { color: '#fff', fontFamily: font.semibold, fontSize: type.body },
  banner: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', padding: 10, borderRadius: 14, marginBottom: 14 },
  bannerText: { flex: 1, fontSize: type.small, lineHeight: lineHeight(type.small), fontFamily: font.medium },
  track: { height: 8, backgroundColor: theme.surfaceAlt, borderRadius: 8, overflow: 'hidden', marginBottom: 16 },
  fill: { height: '100%', backgroundColor: theme.primary, borderRadius: 8 },
  tabWrap: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: theme.surface, borderTopLeftRadius: 26, borderTopRightRadius: 26, ...shadow, shadowOffset: { width: 0, height: -4 }, elevation: 10 },
  tabBar: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', paddingTop: 8, paddingBottom: 6, maxWidth: 540, width: '100%', alignSelf: 'center' },
  tab: { alignItems: 'center', flex: 1, gap: 4 },
  tabIcon: { width: 38, height: 30, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  tabIconOn: { backgroundColor: theme.primary },
  scanFab: { width: 62, height: 62, borderRadius: 31, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center', marginTop: -22, marginBottom: 2, borderWidth: 5, borderColor: theme.surface, ...shadow, shadowOpacity: 0.25, elevation: 8 },
  tabLabel: { fontSize: type.caption, color: theme.muted, fontFamily: font.medium },
  tabLabelOn: { color: theme.primary, fontFamily: font.bold },
});
