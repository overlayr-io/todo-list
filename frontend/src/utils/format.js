// Color + date helpers shared across components.

/** Convert #rrggbb to an rgba() string with the given alpha. */
export function rgba(hex, alpha) {
  const h = (hex || '#94a3b8').replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

function toDate(value) {
  if (!value) return null;
  // Accept "YYYY-MM-DD" or ISO strings; treat as calendar date.
  const s = typeof value === 'string' ? value.slice(0, 10) : value;
  const dt = new Date(`${s}T00:00:00`);
  return isNaN(dt) ? null : dt;
}

/** "31 déc." */
export function formatDate(value) {
  const dt = toDate(value);
  if (!dt) return '—';
  return `${dt.getDate()} ${MONTHS[dt.getMonth()]}`;
}

/** "31/12" */
export function formatShort(value) {
  const dt = toDate(value);
  if (!dt) return '—';
  const dd = String(dt.getDate()).padStart(2, '0');
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}`;
}

/** { day: "02", month: "Juil." } for the upcoming date badges. */
export function dayBadge(value) {
  const dt = toDate(value);
  if (!dt) return { day: '--', month: '' };
  return {
    day: String(dt.getDate()).padStart(2, '0'),
    month: MONTHS[dt.getMonth()].replace('.', '').replace(/^./, (c) => c.toUpperCase()),
  };
}

/** Relative label like "il y a 2 h", "hier", "il y a 3 j". */
export function relativeTime(value) {
  if (!value) return '';
  const then = new Date(value);
  if (isNaN(then)) return '';
  const diffMs = Date.now() - then.getTime();
  const hours = Math.floor(diffMs / 3_600_000);
  if (hours < 1) return "à l'instant";
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'hier';
  return `il y a ${days} j`;
}

export const RECURRENCE_LABELS = {
  none: 'Aucune',
  weekly: 'Hebdomadaire',
  monthly: 'Mensuel',
  yearly: 'Annuel',
};
