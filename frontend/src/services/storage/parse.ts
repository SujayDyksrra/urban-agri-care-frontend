import type { LocalData } from '../../types/models';

export function parseLocalData(raw: string): LocalData {
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== 'object' || (value as LocalData).schemaVersion !== 1) throw new Error('Saved data format is not supported.');
  const data = value as LocalData;
  if (![data.plants, data.diagnoses, data.guidance, data.plans, data.journal].every(Array.isArray)) throw new Error('Saved data is incomplete.');
  return data;
}
