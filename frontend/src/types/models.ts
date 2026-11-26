export type GuidanceMode = 'quick' | 'advanced';
export type Guidance = { id: string; diagnosisId: string; label: string; mode: GuidanceMode; markdown: string; source: string; retrievedAt: string; isMock: boolean; tasks?: string[] };
export type DiagnosisStatus = 'Healthy' | 'Unhealthy' | 'Uncertain';
/** What the user says the leaf really has. `share` = they agreed to send it for model retraining. */
export type Correction = { label: string; condition: string; status: DiagnosisStatus; share: boolean; createdAt: string; sentAt?: string };
export type Diagnosis = { id: string; label: string; crop: string; condition: string; status: DiagnosisStatus; confidence?: number; createdAt: string; isMock: boolean; plantId?: string; photoUri?: string; correction?: Correction };
export type Plant = { id: string; name: string; crop: string; createdAt: string };
export type CareTask = { id: string; text: string; done: boolean; completedAt?: string };
/** Daily routine in minutes since midnight. workDays uses JS day numbers (0 = Sunday). */
export type Routine = { wake: number; leave: number; back: number; sleep: number; workDays: number[] };
export type ScheduleSlot = { id: string; date: string; time: number; task: string; reason: string; kind: 'water' | 'treat' | 'prune' | 'inspect' | 'general'; done?: boolean; doneAt?: string };
export type CareSchedule = { createdAt: string; source: string; slots: ScheduleSlot[]; remind?: boolean; notificationIds?: string[] };
export type CarePlan = { id: string; plantId: string; diagnosisId: string; guidanceId: string; source: string; markdown: string; tasks: CareTask[]; createdAt: string; checkInAt?: string; reminderId?: string; schedule?: CareSchedule };
export type JournalEntry = { id: string; plantId: string; kind: 'note' | 'photo' | 'task' | 'observation'; text: string; createdAt: string; photoUri?: string; diagnosisId?: string; taskId?: string };
/** The user agreed to the Terms (needed before any photo is shared for retraining). */
export type Consent = { version: string; acceptedAt: string };
export type LocalData = { schemaVersion: 1; plants: Plant[]; diagnoses: Diagnosis[]; guidance: Guidance[]; plans: CarePlan[]; journal: JournalEntry[]; routine?: Routine; consent?: Consent };
export const emptyData = (): LocalData => ({ schemaVersion: 1, plants: [], diagnoses: [], guidance: [], plans: [], journal: [] });
