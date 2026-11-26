import type { LocalData } from '../../types/models';

export function togglePlanTask(data: LocalData, planId: string, taskId: string, at: string, eventId: string): LocalData {
  const plan = data.plans.find((item) => item.id === planId);
  const task = plan?.tasks.find((item) => item.id === taskId);
  if (!plan || !task) return data;
  const done = !task.done;
  return {
    ...data,
    plans: data.plans.map((item) => item.id === planId ? {
      ...item,
      tasks: item.tasks.map((entry) => entry.id === taskId ? { ...entry, done, completedAt: done ? at : undefined } : entry),
    } : item),
    journal: done
      ? [...data.journal, { id: eventId, plantId: plan.plantId, kind: 'task', text: `Completed: ${task.text}`, createdAt: at, taskId, diagnosisId: plan.diagnosisId }]
      : data.journal.filter((entry) => entry.taskId !== taskId),
  };
}
