import { createContext, useCallback, type ComponentProps, useContext, useEffect, useRef, useState, type PropsWithChildren, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Easing, Modal, Pressable, ScrollView, StyleSheet, Text, View, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { font, shadow, theme, type, lineHeight } from '../theme';

/**
 * Motion and popups built only on React Native's Animated + Modal, so they run in Expo Go.
 * Everything respects the system "Reduce motion" setting: animations become instant.
 */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => { if (mounted) setReduced(value); });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => { mounted = false; sub.remove(); };
  }, []);
  return reduced;
}

/** Fades and slides its children up when they first appear. */
export function FadeIn({ children, delay = 0, distance = 14, style }: PropsWithChildren<{ delay?: number; distance?: number; style?: StyleProp<ViewStyle> }>) {
  const [value] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const anim = Animated.timing(value, { toValue: 1, duration: 360, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    anim.start();
    return () => anim.stop();
  }, [value, delay]);
  return <Animated.View style={[style, { opacity: value, transform: [{ translateY: value.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) }] }]}>{children}</Animated.View>;
}

/** Springs from small to full size once, for icons and illustrations. */
export function PopIn({ children, delay = 0 }: PropsWithChildren<{ delay?: number }>) {
  const [value] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const anim = Animated.sequence([Animated.delay(delay), Animated.spring(value, { toValue: 1, friction: 5, tension: 90, useNativeDriver: true })]);
    anim.start();
    return () => anim.stop();
  }, [value, delay]);
  return <Animated.View style={{ opacity: value.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 1] }), transform: [{ scale: value.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }] }}>{children}</Animated.View>;
}

/** Pressable that shrinks slightly while held, so taps feel physical. */
export function PressScale({ style, children, scaleTo = 0.96, ...props }: Omit<PressableProps, 'style' | 'children'> & { style?: StyleProp<ViewStyle>; children?: ReactNode; scaleTo?: number }) {
  const [scale] = useState(() => new Animated.Value(1));
  const to = (v: number) => Animated.spring(scale, { toValue: v, friction: 6, tension: 220, useNativeDriver: true }).start();
  return <Pressable {...props} onPressIn={(e) => { to(scaleTo); props.onPressIn?.(e); }} onPressOut={(e) => { to(1); props.onPressOut?.(e); }}>
    <Animated.View style={[style, props.disabled && { opacity: 0.55 }, { transform: [{ scale }] }]}>{children}</Animated.View>
  </Pressable>;
}

/** Keeps a popup mounted while its closing animation runs. */
function usePresence(visible: boolean, reduced: boolean) {
  const [mounted, setMounted] = useState(visible);
  const [value] = useState(() => new Animated.Value(0));
  if (visible && !mounted) setMounted(true);
  useEffect(() => {
    if (!mounted) return;
    const anim = visible
      ? Animated.spring(value, { toValue: 1, friction: 8, tension: 70, useNativeDriver: true })
      : Animated.timing(value, { toValue: 0, duration: reduced ? 0 : 200, easing: Easing.in(Easing.quad), useNativeDriver: true });
    if (reduced && visible) value.setValue(1);
    anim.start(({ finished }) => { if (finished && !visible) setMounted(false); });
    return () => anim.stop();
  }, [visible, mounted, value, reduced]);
  return { mounted, value };
}

/** Bottom sheet popup with a dimmed backdrop. Tap outside or the handle area to close. */
export function Sheet({ visible, onClose, title, children }: PropsWithChildren<{ visible: boolean; onClose: () => void; title?: string }>) {
  const reduced = useReducedMotion();
  const { mounted, value } = usePresence(visible, reduced);
  if (!mounted) return null;
  return <Modal transparent visible animationType="none" onRequestClose={onClose} statusBarTranslucent>
    <Animated.View style={[s.backdrop, { opacity: value }]}><Pressable accessibilityLabel="Close" style={StyleSheet.absoluteFill} onPress={onClose} /></Animated.View>
    <Animated.View style={[s.sheet, { transform: [{ translateY: value.interpolate({ inputRange: [0, 1], outputRange: [500, 0] }) }] }]}>
      <View style={s.handle} />
      {title ? <View style={s.sheetHead}><Text style={s.sheetTitle}>{title}</Text><Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} hitSlop={10} style={s.close}><Ionicons name="close" size={20} color={theme.text} /></Pressable></View> : null}
      <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={{ paddingBottom: 8 }} keyboardShouldPersistTaps="handled">{children}</ScrollView>
    </Animated.View>
  </Modal>;
}

export type DialogAction = { label: string; onPress: () => void; kind?: 'primary' | 'plain' | 'danger' };
/** Centered popup for confirmations and celebrations. */
export function Dialog({ visible, onClose, icon, color = theme.primary, title, message, actions }: { visible: boolean; onClose: () => void; icon?: ComponentProps<typeof Ionicons>['name']; color?: string; title: string; message?: string; actions: DialogAction[] }) {
  const reduced = useReducedMotion();
  const { mounted, value } = usePresence(visible, reduced);
  if (!mounted) return null;
  return <Modal transparent visible animationType="none" onRequestClose={onClose} statusBarTranslucent>
    <Animated.View style={[s.backdrop, { opacity: value }]}><Pressable accessibilityLabel="Close" style={StyleSheet.absoluteFill} onPress={onClose} /></Animated.View>
    <View style={s.center} pointerEvents="box-none">
      <Animated.View accessibilityViewIsModal style={[s.dialog, { opacity: value, transform: [{ scale: value.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }] }]}>
        {icon ? <View style={[s.dialogIcon, { backgroundColor: color }]}><Ionicons name={icon} size={30} color="#fff" /></View> : null}
        <Text style={s.dialogTitle}>{title}</Text>
        {message ? <Text style={s.dialogText}>{message}</Text> : null}
        <View style={s.dialogActions}>{actions.map((action) => <PressScale key={action.label} accessibilityRole="button" onPress={action.onPress} style={[s.dialogBtn, action.kind === 'plain' ? s.dialogBtnPlain : { backgroundColor: action.kind === 'danger' ? theme.danger : color }]}>
          <Text style={[s.dialogBtnText, action.kind === 'plain' && { color: theme.text }]}>{action.label}</Text>
        </PressScale>)}</View>
      </Animated.View>
    </View>
  </Modal>;
}

type Toast = { id: number; text: string; icon: ComponentProps<typeof Ionicons>['name'] };
const ToastContext = createContext<(text: string, icon?: Toast['icon']) => void>(() => {});
export const useToast = () => useContext(ToastContext);

/** Small confirmation that drops in from the top and leaves by itself. */
export function ToastProvider({ children }: PropsWithChildren) {
  const [toast, setToast] = useState<Toast | null>(null);
  const [value] = useState(() => new Animated.Value(0));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = useCallback((text: string, icon: Toast['icon'] = 'checkmark-circle') => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ id: Date.now(), text, icon });
    value.setValue(0);
    Animated.spring(value, { toValue: 1, friction: 7, tension: 80, useNativeDriver: true }).start();
    timer.current = setTimeout(() => Animated.timing(value, { toValue: 0, duration: 220, useNativeDriver: true }).start(({ finished }) => { if (finished) setToast(null); }), 2200);
  }, [value]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  return <ToastContext.Provider value={show}>
    {children}
    {toast ? <View pointerEvents="none" style={s.toastWrap}>
      <Animated.View accessibilityLiveRegion="polite" style={[s.toast, { opacity: value, transform: [{ translateY: value.interpolate({ inputRange: [0, 1], outputRange: [-40, 0] }) }, { scale: value.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }] }]}>
        <Ionicons name={toast.icon} size={18} color="#fff" /><Text style={s.toastText} numberOfLines={2}>{toast.text}</Text>
      </Animated.View>
    </View> : null}
  </ToastContext.Provider>;
}

/** Shows a success message once as a toast, then calls `clear` so the screen drops it. */
export function useToastMessage(message: string, isOk: boolean, clear: () => void) {
  const toast = useToast();
  const last = useRef('');
  const clearRef = useRef(clear);
  useEffect(() => { clearRef.current = clear; });
  useEffect(() => {
    if (!message) { last.current = ''; return; }
    if (!isOk || last.current === message) return;
    last.current = message;
    toast(message);
    setTimeout(() => clearRef.current(), 0);
  }, [message, isOk, toast]);
}

const s = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(20,28,20,0.45)' },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '88%', backgroundColor: theme.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingBottom: 28, ...shadow, elevation: 20 },
  handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: theme.border, marginTop: 10, marginBottom: 6 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  sheetTitle: { fontFamily: font.bold, fontSize: type.title, color: theme.text, letterSpacing: -0.3 },
  close: { width: 34, height: 34, borderRadius: 17, backgroundColor: theme.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  dialog: { width: '100%', maxWidth: 360, backgroundColor: theme.surface, borderRadius: 28, padding: 24, alignItems: 'center', ...shadow, elevation: 20 },
  dialogIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  dialogTitle: { fontFamily: font.bold, fontSize: type.title, color: theme.text, textAlign: 'center', letterSpacing: -0.3 },
  dialogText: { fontFamily: font.regular, fontSize: type.body, lineHeight: lineHeight(type.body), color: theme.muted, textAlign: 'center', marginTop: 8 },
  dialogActions: { alignSelf: 'stretch', gap: 10, marginTop: 20 },
  dialogBtn: { minHeight: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  dialogBtnPlain: { backgroundColor: theme.surfaceAlt },
  dialogBtnText: { fontFamily: font.semibold, fontSize: type.body, color: '#fff' },
  toastWrap: { position: 'absolute', top: 54, left: 0, right: 0, alignItems: 'center', paddingHorizontal: 20 },
  toast: { flexDirection: 'row', alignItems: 'center', gap: 8, maxWidth: 420, backgroundColor: theme.primaryDark, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 999, ...shadow, shadowOpacity: 0.25, elevation: 12 },
  toastText: { flexShrink: 1, color: '#fff', fontFamily: font.medium, fontSize: type.small },
});
