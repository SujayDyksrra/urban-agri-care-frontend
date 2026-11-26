/**
 * Conditions the user can pick when correcting a result, per crop.
 * The labels are exactly the keys of the backend's treatments.json (Crop___Condition),
 * so a picked or predicted label can be sent to GET /treatments/{label} unchanged.
 */
export type LabelOption = { label: string; condition: string };

/** Every key in the backend's treatments.json (29, checked 2026-11-18). */
export const backendLabels = [
  'Chilli___Anthracnose', 'Chilli___Damping_Off', 'Chilli___Leaf_Curl_Virus', 'Chilli___Leaf_Spot', 'Chilli___Veinal_Mottle_Virus', 'Chilli___Whitefly', 'Chilli___Yellowish', 'Chilli___healthy',
  'Pepper,_bell___Bacterial_spot', 'Pepper,_bell___healthy',
  'Potato___Early_blight', 'Potato___Late_blight', 'Potato___healthy',
  'Rice___Bacterial_Leaf_Blight', 'Rice___Brown_Spot', 'Rice___Leaf_Blast', 'Rice___Leaf_scald', 'Rice___Sheath_Blight', 'Rice___healthy',
  'Tomato___Bacterial_spot', 'Tomato___Early_blight', 'Tomato___Late_blight', 'Tomato___Leaf_Mold', 'Tomato___Septoria_leaf_spot', 'Tomato___Spider_mites Two-spotted_spider_mite', 'Tomato___Target_Spot', 'Tomato___Tomato_Yellow_Leaf_Curl_Virus', 'Tomato___Tomato_mosaic_virus', 'Tomato___healthy',
] as const;

/** Label crop prefix → crop name shown in the app. */
const cropNames: Record<string, string> = { 'Pepper,_bell': 'Bell pepper' };
/** Conditions whose raw text reads badly. */
const conditionNames: Record<string, string> = { 'Spider_mites Two-spotted_spider_mite': 'Spider mites' };

/** Splits a model label into the crop and condition the app shows. Unknown labels still split on `___`. */
export function parseLabel(label: string): { crop: string; condition: string } {
  const [rawCrop, ...rest] = label.split('___');
  const rawCondition = rest.join('___');
  if (!rawCondition) return { crop: 'Unknown', condition: label.replace(/_/g, ' ').trim() };
  return { crop: cropNames[rawCrop] ?? rawCrop.replace(/_/g, ' '), condition: conditionNames[rawCondition] ?? rawCondition.replace(/_/g, ' ') };
}

export const cropLabels: Record<string, LabelOption[]> = {};
for (const label of backendLabels) {
  const { crop, condition } = parseLabel(label);
  (cropLabels[crop] ??= []).push({ label, condition });
}
// healthy first, as the most common correction.
for (const options of Object.values(cropLabels)) options.sort((a, b) => Number(b.condition === 'healthy') - Number(a.condition === 'healthy'));

export const isHealthyLabel = (label: string) => /___healthy$/i.test(label);
export const labelsFor = (crop: string): LabelOption[] => cropLabels[crop] ?? [{ label: `${crop}___healthy`, condition: 'healthy' }];
export const displayCondition = (condition: string) => (condition.toLowerCase() === 'healthy' ? 'Healthy' : condition);
