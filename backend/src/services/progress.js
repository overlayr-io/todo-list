// Weighted progress: when a task is in "auto" mode and has subtasks and/or
// checklist items, progress is the share of completed items across both lists.
// Otherwise the manually stored value is used.

export function computeProgress(task, subtasks = [], checklist = []) {
  if (!task.auto_progress) return task.progress ?? 0;

  const total = subtasks.length + checklist.length;
  if (total === 0) return task.progress ?? 0;

  const done =
    subtasks.filter((s) => s.done).length + checklist.filter((c) => c.done).length;
  return Math.round((done / total) * 100);
}
