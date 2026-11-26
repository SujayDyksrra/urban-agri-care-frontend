import type { LocalData, Plant } from '../../types/models';

const uid = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

/**
 * The plant the user picked or typed. A typed name that matches an existing plant (any case)
 * means that same plant, so its history stays in one place. Returns null when nothing was given.
 */
export function resolvePlant(data: LocalData, name: string, plantId: string, crop: string): { plant: Plant; isNew: boolean } | null {
  const existing = data.plants.find((item) => item.id === plantId) ?? data.plants.find((item) => item.name.trim().toLowerCase() === name.trim().toLowerCase());
  if (existing) return { plant: existing, isNew: false };
  if (!name.trim()) return null;
  return { plant: { id: uid('plant'), name: name.trim(), crop, createdAt: new Date().toISOString() }, isNew: true };
}
export { uid };
