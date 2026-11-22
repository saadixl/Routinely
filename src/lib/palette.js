export const COLORS = [
  '#0f766e', '#2563eb', '#7c3aed', '#db2777', '#dc2626',
  '#ea580c', '#ca8a04', '#16a34a', '#0891b2', '#475569',
];

export const randomColor = () => COLORS[Math.floor(Math.random() * COLORS.length)];

/** Map of `{id: item}` → array sorted by `order` then `createdAt`. */
export function toSortedList(map) {
  return Object.entries(map || {})
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || (a.createdAt ?? 0) - (b.createdAt ?? 0));
}
