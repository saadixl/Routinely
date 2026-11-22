export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const pad = (n) => String(n).padStart(2, '0');

/** Local-date key, e.g. "2026-11-22". */
export function dateKey(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(d, n) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function today() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** First day of the week containing `d`, given which weekday (0=Sun) starts the week. */
export function startOfWeek(d, weekStartsOn = 1) {
  const diff = (d.getDay() - weekStartsOn + 7) % 7;
  return addDays(new Date(d.getFullYear(), d.getMonth(), d.getDate()), -diff);
}

/** Position (0–6) of `d` inside its week. */
export function slotIndex(d, weekStartsOn = 1) {
  return (d.getDay() - weekStartsOn + 7) % 7;
}

/** Weekday names in slot order for a given week start. */
export function slotWeekdays(weekStartsOn = 1, short = false) {
  const names = short ? WEEKDAYS_SHORT : WEEKDAYS;
  return Array.from({ length: 7 }, (_, i) => names[(weekStartsOn + i) % 7]);
}

export function formatLong(d) {
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}

export function formatShort(d) {
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
