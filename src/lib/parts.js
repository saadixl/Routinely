/** Parts of the day, in the order a real day runs. Entries without a part are "Anytime" and come last. */
export const PARTS = [
  { id: 'morning', label: 'Morning' },
  { id: 'afternoon', label: 'Afternoon' },
  { id: 'evening', label: 'Evening' },
  { id: 'night', label: 'Night' },
];
export const ANYTIME = { id: 'anytime', label: 'Anytime' };
export const PART_ORDER = [...PARTS.map((p) => p.id), ANYTIME.id];
export const partLabel = (id) => (PARTS.find((p) => p.id === id) || ANYTIME).label;

export const partOf = (entry) => (PART_ORDER.includes(entry?.part) ? entry.part : ANYTIME.id);

/** Stable sort by part of day, keeping the order within each part. */
export const sortByPart = (items) =>
  items
    .map((it, i) => [it, i])
    .sort(([a, i], [b, j]) => PART_ORDER.indexOf(partOf(a)) - PART_ORDER.indexOf(partOf(b)) || i - j)
    .map(([it]) => it);

/** Group items into [{ part, label, items }] in day order; empty groups dropped unless `keepEmpty`. */
export function groupByPart(items, { keepEmpty = false } = {}) {
  const groups = PART_ORDER.map((id) => ({ part: id, label: partLabel(id), items: [] }));
  items.forEach((it) => groups[PART_ORDER.indexOf(partOf(it))].items.push(it));
  return groups.filter((g) => keepEmpty ? g.part !== ANYTIME.id || g.items.length : g.items.length);
}

/**
 * Place `entry` into `part` at `index` (within that part) and return the whole list, normalised so
 * parts are contiguous and in day order. Any existing copy of the entry (same id) is removed first.
 */
export function placeEntry(items, entry, part, index) {
  const rest = items.filter((e) => e.id !== entry.id);
  const placed = { ...entry };
  if (part === ANYTIME.id) delete placed.part; else placed.part = part;
  const groups = Object.fromEntries(PART_ORDER.map((id) => [id, []]));
  rest.forEach((e) => groups[partOf(e)].push(e));
  const list = groups[partOf(placed)];
  list.splice(index ?? list.length, 0, placed);
  return PART_ORDER.flatMap((id) => groups[id]);
}
