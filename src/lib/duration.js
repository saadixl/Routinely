export const DURATION_PRESETS = [10, 15, 20, 30, 45, 60, 90, 120];
export const MAX_MINUTES = 24 * 60;

/** "45 min" for a single activity. */
export const formatMinutes = (m) => `${m} min`;

/** "2h 15m" / "45m" for totals. */
export function formatTotal(m) {
  if (!m) return '';
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (!h) return `${r}m`;
  return r ? `${h}h ${r}m` : `${h}h`;
}

export const totalMinutes = (items) => items.reduce((sum, it) => sum + (it.minutes || 0), 0);
