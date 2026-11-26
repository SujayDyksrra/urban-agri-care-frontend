import { isHealthyLabel, parseLabel } from '../../data/labels';
import type { Diagnosis, DiagnosisStatus, Guidance } from '../../types/models';
import { ApiError, requestJson } from './client';
import { quickGuidance, treatmentMarkdown } from './guidance';

/** Below this confidence the result is shown as Uncertain instead of a firm answer. */
export const UNCERTAIN_BELOW = 0.6;

export type DiagnoseResult = { label: string; confidence: number; modelVersion?: string; treatment?: unknown; treatmentAvailable: boolean };

/** POST /diagnose → { success, label, confidence (0..1), model_version, treatment, treatment_available, message }. */
export function adaptDiagnosis(value: unknown): DiagnoseResult {
  if (!value || typeof value !== 'object') throw new ApiError('format', 'Diagnosis response must be an object.');
  const data = value as Record<string, unknown>;
  if (typeof data.label !== 'string' || !data.label.trim()) throw new ApiError('format', 'Diagnosis response has no label.');
  if (typeof data.confidence !== 'number' || !Number.isFinite(data.confidence) || data.confidence < 0 || data.confidence > 1) throw new ApiError('format', 'Diagnosis confidence must be a number from 0 to 1.');
  return {
    label: data.label.trim(),
    confidence: data.confidence,
    modelVersion: typeof data.model_version === 'string' ? data.model_version : undefined,
    treatment: data.treatment ?? undefined,
    treatmentAvailable: data.treatment_available === true && !!data.treatment,
  };
}

export function statusFor(label: string, confidence: number): DiagnosisStatus {
  if (confidence < UNCERTAIN_BELOW) return 'Uncertain';
  return isHealthyLabel(label) ? 'Healthy' : 'Unhealthy';
}

/** Builds the stored diagnosis, plus the quick guidance when the response already carried the treatment record. */
export function toDiagnosis(result: DiagnoseResult, id: string, photoUri: string, createdAt = new Date().toISOString()): { diagnosis: Diagnosis; guidance?: Guidance } {
  const { crop, condition } = parseLabel(result.label);
  const diagnosis: Diagnosis = { id, label: result.label, crop, condition, status: statusFor(result.label, result.confidence), confidence: result.confidence, createdAt, isMock: false, photoUri };
  let guidance: Guidance | undefined;
  if (result.treatmentAvailable) {
    try { guidance = quickGuidance(diagnosis, treatmentMarkdown(result.treatment)); } catch { guidance = undefined; } // fall back to GET /treatments on the result screen
  }
  return { diagnosis, guidance };
}

const mimeTypes: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', heic: 'image/heic', heif: 'image/heif' };
export const mimeFor = (uri: string) => mimeTypes[uri.split('?')[0].split('.').pop()?.toLowerCase() ?? ''] ?? 'image/jpeg';

/** Uploads the photo as multipart field `file`. React Native's FormData takes a { uri, name, type } file part. */
export async function diagnosePhoto(uri: string, signal?: AbortSignal): Promise<DiagnoseResult> {
  const form = new FormData();
  if (typeof document !== 'undefined') {
    // Web: the browser's FormData needs a real Blob (the photo is a data or blob URL).
    const blob = await (await fetch(uri)).blob();
    const type = blob.type || 'image/jpeg';
    form.append('file', blob, `leaf.${type.split('/')[1] === 'jpeg' ? 'jpg' : type.split('/')[1] || 'jpg'}`);
  } else {
    const name = uri.split('/').pop() || 'leaf.jpg';
    form.append('file', { uri, name, type: mimeFor(uri) } as unknown as Blob);
  }
  const timeout = Number(process.env.EXPO_PUBLIC_DIAGNOSE_TIMEOUT_MS) > 0 ? Number(process.env.EXPO_PUBLIC_DIAGNOSE_TIMEOUT_MS) : 30000;
  return adaptDiagnosis(await requestJson('/diagnose', { method: 'POST', body: form }, signal, timeout));
}
