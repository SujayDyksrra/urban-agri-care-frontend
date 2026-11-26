import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';
import PersistedPhoto from './PersistedPhoto';
import { Icon, LeafArt } from './Ui';
import { font, theme, type } from '../theme';
import { formatDate } from '../utils/dates';

type Shot = { uri: string; createdAt: string };

/** Simple slider without extra packages: tap or drag along the track. */
function OpacitySlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const width = useRef(1);
  const set = (e: GestureResponderEvent) => onChange(Math.max(0, Math.min(1, e.nativeEvent.locationX / width.current)));
  return <View style={s.sliderRow}>
    <Icon name="eye-off-outline" size={16} color={theme.muted} />
    <View style={s.track} onLayout={(e) => { width.current = e.nativeEvent.layout.width || 1; }} onStartShouldSetResponder={() => true} onMoveShouldSetResponder={() => true} onResponderGrant={set} onResponderMove={set}
      accessible accessibilityRole="adjustable" accessibilityLabel="Before photo opacity" accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }}
      onAccessibilityAction={(e) => onChange(Math.max(0, Math.min(1, value + (e.nativeEvent.actionName === 'increment' ? 0.1 : -0.1))))} accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}>
      <View pointerEvents="none" style={[s.fill, { width: `${value * 100}%` }]} />
      <View pointerEvents="none" style={[s.thumb, { left: `${value * 100}%` }]} />
    </View>
    <Text style={s.sliderValue}>{Math.round(value * 100)}%</Text>
  </View>;
}

export default function BeforeAfter({ before, now, height = 240 }: { before?: Shot; now?: Shot; height?: number }) {
  const [mode, setMode] = useState<'overlay' | 'side'>('overlay');
  const [showBefore, setShowBefore] = useState(false);
  const [opacity, setOpacity] = useState(1);
  const [anim] = useState(() => new Animated.Value(0));
  const canCompare = !!before && !!now && before.uri !== now.uri;

  // Slowly cover the current photo with the before photo (instant when Reduce Motion is on).
  useEffect(() => {
    let cancelled = false;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (cancelled) return;
      const to = showBefore ? opacity : 0;
      if (reduced) anim.setValue(to);
      else Animated.timing(anim, { toValue: to, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }).start();
    });
    return () => { cancelled = true; };
  // Opacity changes while shown are applied directly below, not re-animated.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showBefore, anim]);
  const changeOpacity = (v: number) => { setOpacity(v); if (showBefore) anim.setValue(v); };

  const date = (shot?: Shot) => shot ? formatDate(shot.createdAt) : '';
  const main = now ?? before;

  return <View style={{ marginTop: 16 }}>
    <View style={s.toolbar}>
      {mode === 'overlay' ? <Pressable accessibilityRole="button" accessibilityState={{ selected: showBefore, disabled: !canCompare }} disabled={!canCompare} onPress={() => setShowBefore((v) => !v)} style={[s.toggle, showBefore && s.toggleOn, !canCompare && { opacity: 0.45 }]}>
        <Icon name="layers-outline" size={16} color={showBefore ? '#fff' : theme.primary} />
        <Text style={[s.toggleText, showBefore && { color: '#fff' }]}>{showBefore ? 'Hide before' : 'Show before'}</Text>
      </Pressable> : <Text style={s.modeHint}>Before and now, side by side</Text>}
      <Pressable accessibilityRole="switch" accessibilityState={{ checked: mode === 'side' }} accessibilityLabel="Side by side view" onPress={() => { setMode((m) => (m === 'overlay' ? 'side' : 'overlay')); setShowBefore(false); }} style={[s.toggle, mode === 'side' && s.toggleOn]}>
        <Icon name="git-compare-outline" size={16} color={mode === 'side' ? '#fff' : theme.primary} />
        <Text style={[s.toggleText, mode === 'side' && { color: '#fff' }]}>Side by side</Text>
      </Pressable>
    </View>

    {mode === 'overlay' ? <>
      <View style={[s.box, { height }]}>
        {main ? <PersistedPhoto uri={main.uri} height={height} cover /> : <LeafArt size={130} />}
        {canCompare ? <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: anim }]}><PersistedPhoto uri={before!.uri} height={height} cover /></Animated.View> : null}
        <View style={s.badges}>
          <View style={s.badge}><Text style={s.badgeText}>{showBefore ? `Before · ${date(before)}` : main ? `Now · ${date(main)}` : 'Add a photo'}</Text></View>
        </View>
      </View>
      {showBefore ? <OpacitySlider value={opacity} onChange={changeOpacity} /> : null}
      {!canCompare && main ? <Text style={s.hint}>Add another journal photo to compare with the first one.</Text> : null}
    </> : <View style={s.side}>
      {[{ label: 'Before', shot: before }, { label: 'Now', shot: now }].map((item) => <View key={item.label} style={s.sideCol}>
        <View style={[s.box, { height: height * 0.68 }]}>{item.shot ? <PersistedPhoto uri={item.shot.uri} height={height * 0.68} cover /> : <LeafArt size={90} />}</View>
        <Text style={s.sideLabel}>{item.label}{item.shot ? '' : ' · add a photo'}</Text>
        {item.shot ? <Text style={s.sideDate}>{date(item.shot)}</Text> : null}
      </View>)}
    </View>}
  </View>;
}

const s = StyleSheet.create({
  toolbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 10 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface },
  toggleOn: { backgroundColor: theme.primary, borderColor: theme.primary },
  toggleText: { color: theme.primary, fontFamily: font.semibold, fontSize: type.small },
  modeHint: { color: theme.muted, fontFamily: font.regular, fontSize: type.small, flex: 1 },
  box: { borderRadius: 20, backgroundColor: theme.primarySoft, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  badges: { position: 'absolute', top: 10, left: 10, right: 10, flexDirection: 'row' },
  badge: { backgroundColor: 'rgba(255,253,247,0.92)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { color: theme.primary, fontFamily: font.bold, fontSize: type.small },
  sliderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  track: { flex: 1, height: 28, justifyContent: 'center' },
  fill: { position: 'absolute', left: 0, height: 6, borderRadius: 3, backgroundColor: theme.primary },
  thumb: { position: 'absolute', width: 22, height: 22, borderRadius: 11, marginLeft: -11, backgroundColor: theme.surface, borderWidth: 2, borderColor: theme.primary },
  sliderValue: { width: 42, textAlign: 'right', color: theme.primary, fontFamily: font.semibold, fontSize: type.small },
  hint: { color: theme.muted, fontFamily: font.regular, fontSize: type.small, marginTop: 8, textAlign: 'center' },
  side: { flexDirection: 'row', gap: 10 },
  sideCol: { flex: 1, minWidth: 0 },
  sideLabel: { fontFamily: font.bold, color: theme.text, marginTop: 8, fontSize: type.small },
  sideDate: { color: theme.muted, fontFamily: font.regular, fontSize: type.caption, marginTop: 1 },
});
