import type { IconName } from '../components/Ui';

/** Icon for a crop category; unknown crops fall back to a generic leaf. */
export function cropIcon(crop: string): IconName {
  const name = crop.toLowerCase();
  if (name.includes('tomato')) return 'nutrition-outline';
  if (name.includes('chilli') || name.includes('chili')) return 'flame-outline';
  if (name.includes('pepper')) return 'bonfire-outline';
  if (name.includes('potato')) return 'egg-outline';
  if (name.includes('rice') || name.includes('paddy')) return 'water-outline';
  return 'leaf-outline';
}
