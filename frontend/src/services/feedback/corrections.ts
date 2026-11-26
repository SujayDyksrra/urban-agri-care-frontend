import { hasConsent } from '../../data/terms';
import type { Correction, Diagnosis, LocalData } from '../../types/models';

/** The result to show: the user's correction wins over the model's answer. */
export function effective(diagnosis: Diagnosis): Diagnosis {
  const c = diagnosis.correction;
  return c ? { ...diagnosis, label: c.label, condition: c.condition, status: c.status } : diagnosis;
}

/** Saves a correction and drops guidance cached for the old answer, so care steps reload for the new one. */
export function applyCorrection(data: LocalData, diagnosisId: string, correction: Correction): LocalData {
  return {
    ...data,
    diagnoses: data.diagnoses.map((item) => (item.id === diagnosisId ? { ...item, correction } : item)),
    guidance: data.guidance.filter((item) => item.diagnosisId !== diagnosisId),
  };
}

export type FeedbackItem = { diagnosisId: string; crop: string; predictedLabel: string; predictedConfidence?: number; correctLabel: string; photoUri?: string; correctedAt: string };

/**
 * Corrections the user agreed to share (and the Terms were accepted) and that have not been sent yet.
 * This is the retraining queue. No backend endpoint exists yet; a future POST /feedback would send these
 * (photo + labels only, no name, location or other personal data) and then set `sentAt`.
 */
export function pendingFeedback(data: LocalData): FeedbackItem[] {
  if (!hasConsent(data.consent)) return []; // nothing leaves the phone without agreeing to the current Terms
  return data.diagnoses
    .filter((item) => item.correction?.share && !item.correction.sentAt && item.correction.label !== item.label)
    .map((item) => ({ diagnosisId: item.id, crop: item.crop, predictedLabel: item.label, predictedConfidence: item.confidence, correctLabel: item.correction!.label, photoUri: item.photoUri, correctedAt: item.correction!.createdAt }));
}
