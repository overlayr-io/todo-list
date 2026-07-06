// Compute the next occurrence date for a recurring task.

export function nextOccurrence(dateStr, recurrence) {
  if (!dateStr || recurrence === 'none' || !recurrence) return null;
  const date = new Date(dateStr + 'T00:00:00Z');
  switch (recurrence) {
    case 'weekly':
      date.setUTCDate(date.getUTCDate() + 7);
      break;
    case 'monthly':
      date.setUTCMonth(date.getUTCMonth() + 1);
      break;
    case 'yearly':
      date.setUTCFullYear(date.getUTCFullYear() + 1);
      break;
    default:
      return null;
  }
  return date.toISOString().slice(0, 10);
}

export const RECURRENCES = ['none', 'weekly', 'monthly', 'yearly'];
