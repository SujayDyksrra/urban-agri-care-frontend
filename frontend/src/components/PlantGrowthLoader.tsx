import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, AppState, Easing, StyleSheet, View, type ViewStyle } from 'react-native';
import { theme } from '../theme';

/**
 * Minimal line-art loader. Each time it mounts it picks one of the app's crops at random
 * and loops its life cycle:
 * seed → sprout → young plant → mature plant → fruiting → fruit grows → fruit drops → new seed.
 * Below it, a row of dots floats up and down; the label is spoken by screen readers only. Plain Views only, so it runs in Expo Go.
 */
export const growthStages = ['Seed', 'Sprout', 'Young plant', 'Mature plant', 'Fruiting', 'Fruit grows', 'Fruit drops', 'New seed'] as const;
const LAST = growthStages.length - 1;

type Fruit = { w: number; h: number; radius: number; color: string; rotate?: string };
type Spot = { left: number; bottom: number };
type Crop = { name: string; blades: boolean; fruit: Fruit; fruitA: Spot; fruitB: Spot; extraGrains?: Spot[] };
const W = 160;
const C = W / 2;
const crops: Crop[] = [
  { name: 'Tomato', blades: false, fruit: { w: 18, h: 17, radius: 9, color: '#C8573E' }, fruitA: { left: C - 34, bottom: 58 }, fruitB: { left: C + 18, bottom: 70 } },
  { name: 'Chilli', blades: false, fruit: { w: 8, h: 24, radius: 5, color: '#B8432F', rotate: '12deg' }, fruitA: { left: C - 26, bottom: 54 }, fruitB: { left: C + 16, bottom: 66 } },
  { name: 'Bell pepper', blades: false, fruit: { w: 19, h: 20, radius: 7, color: '#C9852C' }, fruitA: { left: C - 34, bottom: 56 }, fruitB: { left: C + 16, bottom: 68 } },
  { name: 'Potato', blades: false, fruit: { w: 13, h: 13, radius: 7, color: '#6F8E4E' }, fruitA: { left: C - 26, bottom: 92 }, fruitB: { left: C + 12, bottom: 96 } },
  { name: 'Rice', blades: true, fruit: { w: 7, h: 12, radius: 4, color: '#B08A3A', rotate: '20deg' }, fruitA: { left: C - 10, bottom: 97 }, fruitB: { left: C + 3, bottom: 92 }, extraGrains: [{ left: C - 3, bottom: 104 }, { left: C - 12, bottom: 86 }, { left: C + 5, bottom: 81 }] },
];

// Target values per stage, index = stage.
const targets = {
  plant: [0, 1, 1, 1, 1, 1, 1, 0.3],
  stem: [0.02, 0.22, 0.55, 1, 1, 1, 1, 1],
  leaf1: [0, 0.75, 1, 1, 1, 1, 1, 1],
  leaf2: [0, 0, 0.8, 1, 1, 1, 1, 1],
  leaf3: [0, 0, 0, 1, 1, 1, 1, 1],
  fruitA: [0, 0, 0, 0, 0.5, 1, 1, 1],
  fruitB: [0, 0, 0, 0, 0.5, 1, 1, 0],
  drop: [0, 0, 0, 0, 0, 0, 1, 1],
  seed: [1, 0, 0, 0, 0, 0, 0, 1],
  seedX: [0, 0, 0, 0, 0, 0, 0, 1],
} as const;
type Key = keyof typeof targets;
const keys = Object.keys(targets) as Key[];

const STEM = 100;
const GROUND = 20;
const LINE = theme.primary;
const STROKE = 2;

function FloatingDots({ count, active, filled }: { count: number; active: boolean; filled: number }) {
  const [values] = useState(() => Array.from({ length: count }, () => new Animated.Value(0)));
  useEffect(() => {
    if (!active) { values.forEach((value) => value.setValue(0)); return; }
    const loops = values.map((value, i) => Animated.loop(Animated.sequence([
      Animated.delay(i * 90),
      Animated.timing(value, { toValue: 1, duration: 360, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(value, { toValue: 0, duration: 360, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      Animated.delay((count - 1 - i) * 90),
    ])));
    loops.forEach((loop) => loop.start());
    return () => loops.forEach((loop) => loop.stop());
  }, [active, values, count]);
  return <View style={s.dots}>{values.map((value, i) => <Animated.View key={i} style={[s.dot, i <= filled && s.dotOn, { transform: [{ translateY: value.interpolate({ inputRange: [0, 1], outputRange: [0, -8] }) }] }]} />)}</View>;
}

export default function PlantGrowthLoader({ active = true, label = 'Analyzing leaf…', stepMs = 650, compact = false }: { active?: boolean; label?: string; stepMs?: number; compact?: boolean }) {
  const [crop] = useState(() => crops[Math.floor(Math.random() * crops.length)]);
  const [cycle, setCycle] = useState(0);
  const [reduced, setReduced] = useState(false);
  const [values] = useState(() => Object.fromEntries(keys.map((key) => [key, new Animated.Value(targets[key][0])])) as Record<Key, Animated.Value>);

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => { if (mounted) setReduced(value); });
    const access = AccessibilityInfo.addEventListener('reduceMotionChanged', (value) => setReduced(value));
    return () => { mounted = false; access.remove(); };
  }, []);

  useEffect(() => {
    if (!active || reduced) return;
    const timer = setInterval(() => { if (AppState.currentState === 'active') setCycle((old) => (old >= LAST ? 0 : old + 1)); }, stepMs);
    return () => clearInterval(timer);
  }, [active, reduced, stepMs]);

  // Paused or reduced motion: show a calm mature plant instead of cycling.
  const moving = active && !reduced;
  const stage = moving ? cycle : 3;
  useEffect(() => {
    const duration = Math.min(520, stepMs * 0.8);
    Animated.parallel(keys.map((key) => Animated.timing(values[key], {
      toValue: targets[key][stage],
      duration: key === 'drop' ? duration * 0.9 : duration,
      easing: key === 'drop' ? Easing.in(Easing.quad) : Easing.out(Easing.back(1.3)),
      useNativeDriver: true,
    }))).start();
  }, [stage, stepMs, values]);

  const fruitStyle = (spot: Spot): ViewStyle => ({ position: 'absolute', left: spot.left, bottom: spot.bottom, width: crop.fruit.w, height: crop.fruit.h, borderRadius: crop.fruit.radius, borderWidth: STROKE, borderColor: crop.fruit.color, backgroundColor: theme.surface });
  const leaf = (key: Key, bottom: number, side: 'left' | 'right', size: number) => {
    const dir = side === 'left' ? -1 : 1;
    if (crop.blades) {
      // Rice: long thin blades fanning out from the base.
      const w = size * 0.22;
      return <Animated.View key={`${key}-${side}`} style={[s.leaf, { width: w, height: size * 2.3, bottom: 0, borderRadius: w, [side === 'left' ? 'right' : 'left']: -w / 2, transformOrigin: 'bottom', transform: [{ rotate: `${dir * (bottom / 3 + 6)}deg` }, { scale: values[key] }] }]} />;
    }
    return <Animated.View key={`${key}-${side}`} style={[
      s.leaf,
      side === 'left' ? s.leafLeft : s.leafRight,
      { width: size, height: size * 0.5, bottom, [side === 'left' ? 'right' : 'left']: 0, transformOrigin: side === 'left' ? 'right center' : 'left center', transform: [{ rotate: `${-dir * 28}deg` }, { scale: values[key] }] },
    ]}><View style={[s.vein, side === 'left' ? { right: 2 } : { left: 2 }]} /></Animated.View>;
  };
  const rotate = crop.fruit.rotate ?? '0deg';

  return <View style={[s.box, compact && s.boxCompact]} accessibilityRole="progressbar" accessibilityLabel={`${label} ${crop.name}: ${growthStages[stage]}`}>
    <View style={[s.stageArea, compact && { transform: [{ scale: 0.8 }], marginVertical: -12 }]}>
      <Animated.View style={[s.plant, { opacity: values.plant }]}>
        <Animated.View style={[s.stem, { transform: [{ scaleY: values.stem }] }]} />
        <View style={s.leafSideLeft}>{leaf('leaf1', 14, 'left', 32)}{leaf('leaf2', 44, 'left', 36)}{leaf('leaf3', 74, 'left', 28)}</View>
        <View style={s.leafSideRight}>{leaf('leaf1', 26, 'right', 34)}{leaf('leaf2', 58, 'right', 34)}{leaf('leaf3', 86, 'right', 26)}</View>
        <Animated.View style={[fruitStyle(crop.fruitA), { transform: [{ rotate }, { scale: values.fruitA }] }]} />
        {crop.extraGrains?.map((grain, i) => <Animated.View key={i} style={[fruitStyle(grain), { transform: [{ rotate: i % 2 ? '-20deg' : rotate }, { scale: values.fruitA }] }]} />)}
      </Animated.View>
      {/* Fruit B ripens, falls to the soil line and becomes the next seed. */}
      <Animated.View style={[fruitStyle({ left: crop.fruitB.left, bottom: crop.fruitB.bottom + GROUND }), { opacity: values.fruitB, transform: [{ translateY: values.drop.interpolate({ inputRange: [0, 1], outputRange: [0, crop.fruitB.bottom] }) }, { rotate }, { scale: values.fruitB }] }]} />
      <Animated.View style={[s.seed, { opacity: values.seed, transform: [{ translateX: values.seedX.interpolate({ inputRange: [0, 1], outputRange: [0, crop.fruitB.left - (C - 7)] }) }, { scale: values.seed.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }] }]} />
      <View style={s.soil} />
    </View>
    <FloatingDots count={growthStages.length} active={moving} filled={stage} />
  </View>;
}

const s = StyleSheet.create({
  box: { borderRadius: 28, backgroundColor: theme.surface, alignItems: 'center', paddingTop: 20, paddingBottom: 18, paddingHorizontal: 24, marginBottom: 18 },
  boxCompact: { paddingTop: 10, paddingBottom: 12, marginBottom: 12 },
  stageArea: { width: W, height: 150 },
  plant: { position: 'absolute', left: 0, right: 0, bottom: GROUND, height: STEM + 20 },
  stem: { position: 'absolute', bottom: 0, left: C - STROKE / 2, width: STROKE, height: STEM, borderRadius: 1, backgroundColor: LINE, transformOrigin: 'bottom' },
  leafSideLeft: { position: 'absolute', right: C + 1, bottom: 0, width: 46, height: STEM },
  leafSideRight: { position: 'absolute', left: C + 1, bottom: 0, width: 46, height: STEM },
  leaf: { position: 'absolute', borderWidth: STROKE, borderColor: LINE, backgroundColor: theme.surface, justifyContent: 'center' },
  leafLeft: { borderTopLeftRadius: 40, borderBottomRightRadius: 40, borderTopRightRadius: 3, borderBottomLeftRadius: 3 },
  leafRight: { borderTopRightRadius: 40, borderBottomLeftRadius: 40, borderTopLeftRadius: 3, borderBottomRightRadius: 3 },
  vein: { position: 'absolute', width: '60%', height: 1.5, backgroundColor: LINE, opacity: 0.6 },
  seed: { position: 'absolute', bottom: GROUND - 1, left: C - 7, width: 14, height: 9, borderRadius: 7, borderWidth: STROKE, borderColor: '#8A6A44', backgroundColor: theme.surface },
  soil: { position: 'absolute', bottom: GROUND - 2, left: 14, right: 14, height: STROKE, borderRadius: 1, backgroundColor: LINE, opacity: 0.55 },
  dots: { flexDirection: 'row', gap: 7, height: 22, alignItems: 'flex-end', marginTop: 4 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: theme.border },
  dotOn: { backgroundColor: theme.primary },
});
