import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ApiError } from '../src/services/api/client';
import { adaptAdvanced, adaptQuick, quickPath } from '../src/services/api/guidance';
import { parseLocalData } from '../src/services/storage/parse';
import { togglePlanTask } from '../src/services/storage/planUpdates';
import { emptyData } from '../src/types/models';

test('raw model label is encoded as one path segment', () => {
  assert.equal(quickPath('Tomato/Early blight #1'), '/treatments/Tomato%2FEarly%20blight%20%231');
});
const tomatoBlight = {
  crop: 'Tomato', disease: 'Early blight', description: 'A fungal disease.',
  quick_fixes: ['Remove infected lower leaves.', 'Water at the base.'],
  prevention: ['Rotate crops.'],
};
test('quick adapter maps the backend treatment record to Markdown and tasks', () => {
  const quick = adaptQuick({ label: 'Tomato___Early_blight', treatment: tomatoBlight });
  assert.equal(quick.markdown, 'A fungal disease.\n\n## Quick fixes\n- Remove infected lower leaves.\n- Water at the base.\n\n## Prevention\n- Rotate crops.');
  assert.deepEqual(quick.tasks, ['Remove infected lower leaves.', 'Water at the base.']);
  assert.throws(() => adaptQuick({ label: 'x' }), (error) => error instanceof ApiError && error.code === 'format');
  assert.throws(() => adaptQuick({ treatment: { quick_fixes: [7] } }), ApiError);
  assert.throws(() => adaptQuick({ treatment: { description: 'only text', quick_fixes: [], prevention: [] } }), ApiError);
});
test('advanced adapter reads ai_solution and sends a readable disease name', async () => {
  assert.equal(adaptAdvanced({ success: true, disease_analyzed: 'Tomato Early blight', ai_solution: '## Step 1\nPrune.' }), '## Step 1\nPrune.');
  assert.equal(adaptAdvanced({ ai_solution: '### 1\uFE0F\u20E3 Prune 🌱 now' }), '### 1 Prune now');
  assert.throws(() => adaptAdvanced({ markdown: 'old shape' }), ApiError);
  assert.throws(() => adaptAdvanced({ ai_solution: '  ' }), ApiError);
  const { diseaseName } = await import('../src/services/api/guidance');
  assert.equal(diseaseName('Tomato___Early_blight'), 'Tomato Early blight');
  assert.equal(diseaseName('Pepper,_bell___Bacterial_spot'), 'Bell pepper Bacterial spot');
});
test('backend error details and statuses map to distinct error codes', async () => {
  const { errorDetail, errorForStatus } = await import('../src/services/api/client');
  assert.equal(errorDetail('{"detail":"Image must be 10 MB or smaller."}'), 'Image must be 10 MB or smaller.');
  assert.equal(errorDetail('<html>'), undefined);
  assert.equal(errorForStatus(404).code, 'missing');
  assert.equal(errorForStatus(422, 'Not enough leaf').message, 'Not enough leaf');
  assert.equal(errorForStatus(415).code, 'image');
  assert.equal(errorForStatus(503).code, 'unavailable');
  assert.equal(errorForStatus(500).code, 'server');
});
test('diagnose response becomes a stored diagnosis with its quick guidance', async () => {
  const { adaptDiagnosis, toDiagnosis, statusFor, mimeFor } = await import('../src/services/api/diagnose');
  const result = adaptDiagnosis({ success: true, label: 'Tomato___Early_blight', confidence: 0.82, model_version: 'v1', treatment: tomatoBlight, treatment_available: true, message: 'Diagnosis completed.' });
  const { diagnosis, guidance } = toDiagnosis(result, 'scan-1', 'file:///leaf.jpg', '2026-11-18T00:00:00Z');
  assert.deepEqual([diagnosis.crop, diagnosis.condition, diagnosis.status, diagnosis.isMock, diagnosis.photoUri], ['Tomato', 'Early blight', 'Unhealthy', false, 'file:///leaf.jpg']);
  assert.equal(guidance?.id, 'scan-1-quick');
  assert.equal(guidance?.mode, 'quick');
  const none = toDiagnosis(adaptDiagnosis({ label: 'Rice___Leaf_smut', confidence: 0.9, treatment: null, treatment_available: false }), 'scan-2', 'file:///b.png');
  assert.equal(none.guidance, undefined);
  assert.equal(statusFor('Tomato___healthy', 0.85), 'Healthy');
  assert.equal(statusFor('Tomato___healthy', 0.4), 'Uncertain');
  assert.throws(() => adaptDiagnosis({ label: 'Tomato___healthy', confidence: 87 }), ApiError);
  assert.throws(() => adaptDiagnosis({ confidence: 0.5 }), ApiError);
  assert.equal(mimeFor('file:///a/b.PNG'), 'image/png');
});
test('correction labels match the backend treatments.json keys', async () => {
  const { backendLabels, cropLabels, parseLabel } = await import('../src/data/labels');
  assert.equal(backendLabels.length, 29);
  const all = Object.values(cropLabels).flat().map((option) => option.label).sort();
  assert.deepEqual(all, [...backendLabels].sort());
  assert.deepEqual(Object.keys(cropLabels).sort(), ['Bell pepper', 'Chilli', 'Potato', 'Rice', 'Tomato']);
  assert.ok(!(all as string[]).includes('Rice___Leaf_smut'));
  assert.deepEqual(parseLabel('Tomato___Spider_mites Two-spotted_spider_mite'), { crop: 'Tomato', condition: 'Spider mites' });
  assert.deepEqual(parseLabel('Pepper,_bell___healthy'), { crop: 'Bell pepper', condition: 'healthy' });
  assert.equal(cropLabels.Rice[0].condition, 'healthy');
});
test('corrupt or incompatible local data is rejected instead of becoming empty history', () => {
  assert.deepEqual(parseLocalData(JSON.stringify(emptyData())), emptyData());
  assert.throws(() => parseLocalData('{broken'));
  assert.throws(() => parseLocalData(JSON.stringify({ schemaVersion: 2, plants: [] })));
  assert.throws(() => parseLocalData(JSON.stringify({ schemaVersion: 1, plants: [] })));
});

test('rapid task toggles use the latest saved state and keep plant events isolated', () => {
  const initial = emptyData();
  initial.plans = [
    { id: 'plan-a', plantId: 'plant-a', diagnosisId: 'diagnosis-a', guidanceId: 'guide-a', source: 'fixture', markdown: 'care', createdAt: '2026-11-02T00:00:00Z', tasks: [{ id: 'task-a', text: 'Inspect leaf', done: false }] },
    { id: 'plan-b', plantId: 'plant-b', diagnosisId: 'diagnosis-b', guidanceId: 'guide-b', source: 'fixture', markdown: 'care', createdAt: '2026-11-02T00:00:00Z', tasks: [{ id: 'task-b', text: 'Water', done: false }] },
  ];
  const once = togglePlanTask(initial, 'plan-a', 'task-a', '2026-11-02T01:00:00Z', 'event-a');
  assert.equal(once.plans[0].tasks[0].done, true);
  assert.deepEqual(once.journal.map((entry) => [entry.plantId, entry.diagnosisId]), [['plant-a', 'diagnosis-a']]);
  const twice = togglePlanTask(once, 'plan-a', 'task-a', '2026-11-02T01:01:00Z', 'event-b');
  assert.equal(twice.plans[0].tasks[0].done, false);
  assert.equal(twice.plans[1].tasks[0].done, false);
  assert.equal(twice.journal.length, 0);
});

test('routine planner places watering before work and heavier steps on a day off', async () => {
  const { generateSchedule, tasksFromMarkdown, classifyTask, formatTime, defaultRoutine } = await import('../src/services/routine/schedule');
  assert.deepEqual(tasksFromMarkdown('## T\n- **Water** at the base\n1. Apply copper fungicide\ntext'), ['Water at the base', 'Apply copper fungicide']);
  assert.equal(classifyTask('Remove affected lower leaves'), 'prune');
  const monday = new Date(2026, 10, 16); // Monday
  const slots = generateSchedule(['Water at the base', 'Apply copper fungicide'], defaultRoutine, monday);
  const water = slots.filter((slot) => slot.kind === 'water');
  assert.equal(water.length, 7);
  assert.equal(formatTime(water[0].time), '06:50'); // wake 06:30 + 20, before leaving at 08:00
  const treat = slots.filter((slot) => slot.kind === 'treat');
  assert.equal(treat.length, 1);
  assert.equal(new Date(`${treat[0].date}T00:00:00`).getDay(), 6); // first day off (Saturday)
  const nightShift = generateSchedule(['Water at the base'], { ...defaultRoutine, wake: 7 * 60, leave: 7 * 60 + 15 }, monday);
  assert.equal(formatTime(nightShift[0].time), '18:30'); // no time before work, so after getting home
});

test('a user correction replaces the shown result and only shared corrections join the retrain queue', async () => {
  const { applyCorrection, effective, pendingFeedback } = await import('../src/services/feedback/corrections');
  const data = emptyData();
  data.diagnoses = [
    { id: 'd1', label: 'Tomato___Early_blight', crop: 'Tomato', condition: 'Early blight', status: 'Unhealthy', confidence: 0.6, createdAt: '2026-11-15T00:00:00Z', isMock: false },
    { id: 'd2', label: 'Tomato___healthy', crop: 'Tomato', condition: 'healthy', status: 'Healthy', createdAt: '2026-11-15T00:00:00Z', isMock: false },
  ];
  data.guidance = [{ id: 'g1', diagnosisId: 'd1', label: 'Tomato___Early_blight', mode: 'quick', markdown: 'x', source: 's', retrievedAt: '2026-11-15T00:00:00Z', isMock: false }];
  let next = applyCorrection(data, 'd1', { label: 'Tomato___Late_blight', condition: 'Late blight', status: 'Unhealthy', share: true, createdAt: '2026-11-15T01:00:00Z' });
  next = applyCorrection(next, 'd2', { label: 'Tomato___Leaf_Mold', condition: 'Leaf Mold', status: 'Unhealthy', share: false, createdAt: '2026-11-15T01:00:00Z' });
  assert.equal(effective(next.diagnoses[0]).condition, 'Late blight');
  assert.equal(next.guidance.length, 0);
  assert.equal(pendingFeedback(next).length, 0, 'no consent, nothing queued');
  const { TERMS_VERSION } = await import('../src/data/terms');
  next = { ...next, consent: { version: TERMS_VERSION, acceptedAt: '2026-11-15T02:00:00Z' } };
  assert.deepEqual(pendingFeedback(next).map((item) => [item.predictedLabel, item.correctLabel]), [['Tomato___Early_blight', 'Tomato___Late_blight']]);
});

test('streak counts finished days in a row and does not break on an unfinished today', async () => {
  const { currentStreak, scheduleDays } = await import('../src/services/routine/streak');
  const slot = (date: string, done: boolean) => ({ id: `${date}-${done}-${Math.random()}`, date, time: 480, task: 't', reason: 'r', kind: 'water' as const, done });
  const slots = [slot('2026-11-13', true), slot('2026-11-14', false), slot('2026-11-15', true), slot('2026-11-15', true), slot('2026-11-16', true), slot('2026-11-17', false), slot('2026-11-18', false)];
  const days = scheduleDays(slots, '2026-11-17');
  assert.deepEqual(days.map((d) => d.state), ['done', 'missed', 'done', 'done', 'today', 'future']);
  assert.equal(currentStreak(days, '2026-11-17'), 2);
});
