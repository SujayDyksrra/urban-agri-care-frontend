import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { font, theme, type } from '../theme';

export default function PersistedPhoto({ uri, height = 230, cover = false }: { uri: string; height?: number; cover?: boolean }) {
  const [failed, setFailed] = useState(false);
  return failed
    ? <View style={[styles.placeholder, { height }]}><Ionicons name="image-outline" size={26} color={theme.sage} /><Text style={styles.text}>Saved photo unavailable</Text></View>
    : <Image source={{ uri }} resizeMode={cover ? 'cover' : 'contain'} style={[styles.image, { height }]} onError={() => setFailed(true)} />;
}

const styles = StyleSheet.create({
  image: { width: '100%', backgroundColor: theme.primarySoft, borderRadius: 16 },
  placeholder: { width: '100%', backgroundColor: theme.primarySoft, justifyContent: 'center', alignItems: 'center', padding: 8, borderRadius: 16, gap: 6 },
  text: { color: theme.muted, textAlign: 'center', fontFamily: font.regular, fontSize: type.small },
});
