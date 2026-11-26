import { fixtureMarkdown } from '../../data/fixtures/guidance';
import { parseLabel } from '../../data/labels';
import type { Diagnosis, Guidance, GuidanceMode } from '../../types/models';
import { ApiError, guidanceMode, requestJson } from './client';

const isObject = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const strings = (field: unknown, name: string): string[] => {
  if (field === undefined || field === null) return [];
  if (!Array.isArray(field) || !field.every((item) => typeof item === 'string')) throw new ApiError('format', `Treatment ${name} must be an array of strings.`);
  return field.map((item) => item.trim()).filter(Boolean);
};

export function quickPath(label: string) { return `/treatments/${encodeURIComponent(label)}`; }

/**
 * One record of the backend's treatments.json: { crop, disease, description, quick_fixes[], prevention[] }.
 * Quick fixes double as the plan's task list.
 */
export function treatmentMarkdown(value: unknown): { markdown: string; tasks: string[] } {
  if (!isObject(value)) throw new ApiError('format', 'Treatment record must be an object.');
  const description = typeof value.description === 'string' ? value.description.trim() : '';
  const fixes = strings(value.quick_fixes, 'quick_fixes');
  const prevention = strings(value.prevention, 'prevention');
  if (!fixes.length && !prevention.length) throw new ApiError('format', 'Treatment record has no quick fixes or prevention steps.');
  const list = (items: string[]) => items.map((item) => `- ${item}`).join('\n');
  const markdown = [description, fixes.length ? `## Quick fixes\n${list(fixes)}` : '', prevention.length ? `## Prevention\n${list(prevention)}` : ''].filter(Boolean).join('\n\n');
  return { markdown, tasks: fixes };
}

/** GET /treatments/{label} → { label, treatment: {...} }. */
export function adaptQuick(value: unknown): { markdown: string; tasks: string[] } {
  if (!isObject(value)) throw new ApiError('format', 'Quick response must be an object.');
  return treatmentMarkdown(value.treatment);
}

/** POST /ask-ai → { success, disease_analyzed, ai_solution }. */
export function adaptAdvanced(value: unknown): string {
  const solution = isObject(value) ? value.ai_solution : undefined;
  if (typeof solution !== 'string') throw new ApiError('format', 'Advanced response has no ai_solution text.');
  if (!solution.trim()) throw new ApiError('format', 'Advanced response contained empty text.');
  return stripEmoji(solution).trim();
}

/** The AI likes emoji headings ("1️⃣"); the app shows none. */
export const stripEmoji = (text: string) => text.replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{26FF}\u{2B00}-\u{2BFF}\u{FE0F}\u{20E3}\u{200D}]/gu, '').replace(/(\S) {2,}(?=\S)/g, '$1 ');

/** Readable name for the AI prompt, e.g. "Tomato Early blight" for Tomato___Early_blight. */
export function diseaseName(label: string) {
  const { crop, condition } = parseLabel(label);
  return crop === 'Unknown' ? condition : `${crop} ${condition}`;
}

export async function getQuickTreatment(label: string, signal?: AbortSignal) { return adaptQuick(await requestJson(quickPath(label), {}, signal)); }

/** The AI call can take far longer than a lookup, so it gets its own timeout. */
const advancedTimeoutMs = Number(process.env.EXPO_PUBLIC_ASK_AI_TIMEOUT_MS) > 0 ? Number(process.env.EXPO_PUBLIC_ASK_AI_TIMEOUT_MS) : 45000;
export async function getAdvancedTreatment(input: { label: string }, signal?: AbortSignal) {
  const field = process.env.EXPO_PUBLIC_ASK_AI_REQUEST_FIELD || 'disease_name';
  return adaptAdvanced(await requestJson('/ask-ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [field]: diseaseName(input.label) }) }, signal, advancedTimeoutMs));
}

export function quickGuidance(diagnosis: Pick<Diagnosis, 'id' | 'label'>, value: { markdown: string; tasks: string[] }): Guidance {
  return { id: `${diagnosis.id}-quick`, diagnosisId: diagnosis.id, label: diagnosis.label, mode: 'quick', markdown: value.markdown, tasks: value.tasks, source: 'Knowledge base', retrievedAt: new Date().toISOString(), isMock: false };
}

export async function loadGuidance(diagnosis: Diagnosis, mode: GuidanceMode, signal?: AbortSignal): Promise<Guidance> {
  if (guidanceMode === 'mock') {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(resolve, mode === 'advanced' ? 900 : 450);
      signal?.addEventListener('abort', () => { clearTimeout(timer); reject(new ApiError('cancelled', 'Request cancelled.')); }, { once: true });
    });
    if (process.env.EXPO_PUBLIC_MOCK_ERROR === mode) throw new ApiError(mode === 'quick' ? 'missing' : 'server', `Demo ${mode} error.`);
    return { id: `${diagnosis.id}-${mode}`, diagnosisId: diagnosis.id, label: diagnosis.label, mode, markdown: fixtureMarkdown[mode], source: mode === 'quick' ? 'Knowledge base (demo)' : 'AI-generated (demo; no API called)', retrievedAt: new Date().toISOString(), isMock: true };
  }
  if (mode === 'quick') return quickGuidance(diagnosis, await getQuickTreatment(diagnosis.label, signal));
  const markdown = await getAdvancedTreatment({ label: diagnosis.label }, signal);
  return { id: `${diagnosis.id}-advanced`, diagnosisId: diagnosis.id, label: diagnosis.label, mode, markdown, source: 'AI-generated', retrievedAt: new Date().toISOString(), isMock: false };
}
