import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { FadeIn } from './Motion';
import { Icon } from './Ui';
import type { Plant } from '../types/models';
import { font, statusColors, theme, type } from '../theme';

/**
 * Pick an existing plant or name a new one in a single field.
 * Typing filters the list; when nothing matches exactly, the last row offers "Add new".
 */
export default function PlantPicker({ plants, name, selectedId, error, onChange }: { plants: Plant[]; name: string; selectedId: string; error?: string; onChange: (name: string, plantId: string) => void }) {
  const [open, setOpen] = useState(false);
  const q = name.trim().toLowerCase();
  const selected = plants.find((plant) => plant.id === selectedId);
  const matches = selected ? plants : plants.filter((plant) => !q || plant.name.toLowerCase().includes(q) || plant.crop.toLowerCase().includes(q));
  const exact = plants.some((plant) => plant.name.toLowerCase() === q);
  const red = statusColors('Unhealthy').main;
  const choose = (value: string, id: string) => { onChange(value, id); setOpen(false); };
  return <View style={s.wrap}>
    <View style={[s.field, open && s.fieldOpen, error ? { borderColor: red, borderWidth: 1.5 } : null]}>
      <Icon name={selected ? 'leaf' : 'leaf-outline'} size={18} color={error ? red : theme.sage} />
      <TextInput style={s.input} placeholder="Plant name" placeholderTextColor={theme.muted} value={name}
        onFocus={() => setOpen(true)} onChangeText={(value) => { onChange(value, ''); setOpen(true); }} accessibilityLabel="Plant name" />
      <Pressable accessibilityRole="button" accessibilityLabel={open ? 'Hide plants' : 'Show plants'} onPress={() => setOpen((v) => !v)} hitSlop={10} style={s.arrow}>
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size={18} color={theme.text} />
      </Pressable>
    </View>
    {error ? <View style={s.errorRow}><Icon name="alert-circle" size={14} color={red} /><Text style={[s.error, { color: red }]}>{error}</Text></View> : null}
    {open ? <FadeIn distance={-6} style={s.list}>
      {matches.map((plant) => <Pressable key={plant.id} accessibilityRole="button" onPress={() => choose(plant.name, plant.id)} style={({ pressed }) => [s.item, pressed && { backgroundColor: theme.surfaceAlt }]}>
        <Text style={s.itemName} numberOfLines={1}>{plant.name}</Text><Text style={s.itemCrop}>{plant.crop}</Text>
        {plant.id === selectedId ? <Icon name="checkmark" size={18} color={theme.primary} /> : null}
      </Pressable>)}
      {q && !exact && !selected ? <Pressable accessibilityRole="button" onPress={() => choose(name.trim(), '')} style={({ pressed }) => [s.item, s.addItem, pressed && { backgroundColor: theme.surfaceAlt }]}>
        <Icon name="add-circle" size={18} color={theme.primary} /><Text style={[s.itemName, { color: theme.primary }]} numberOfLines={1}>Add new “{name.trim()}”</Text>
      </Pressable> : null}
      {!matches.length && !q ? <Text style={s.empty}>No plants yet. Type a name.</Text> : null}
    </FadeIn> : null}
  </View>;
}

const s = StyleSheet.create({
  wrap: { marginBottom: 14, zIndex: 2 },
  field: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.surface, borderRadius: 14, paddingLeft: 12, paddingRight: 5, minHeight: 44 },
  fieldOpen: { borderColor: theme.primary },
  input: { flex: 1, fontFamily: font.regular, fontSize: type.body, color: theme.text, paddingVertical: 9, outlineWidth: 0 },
  arrow: { width: 32, height: 32, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.surfaceAlt },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, marginLeft: 4 },
  error: { fontFamily: font.medium, fontSize: type.small },
  list: { marginTop: 6, backgroundColor: theme.surface, borderRadius: 16, borderWidth: 1, borderColor: theme.border, overflow: 'hidden' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderColor: theme.border },
  addItem: { borderBottomWidth: 0 },
  itemName: { flex: 1, fontFamily: font.medium, fontSize: type.body, color: theme.text },
  itemCrop: { fontFamily: font.regular, fontSize: type.small, color: theme.muted },
  empty: { padding: 14, fontFamily: font.regular, fontSize: type.small, color: theme.muted },
});
