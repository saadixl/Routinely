import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { endAt, get, onValue, orderByKey, push, query, ref, set, startAt, update } from 'firebase/database';
import { db } from '../firebase';
import { useAuth } from './AuthContext';
import { toSortedList } from '../lib/palette';
import { addDays, dateKey, parseKey, startOfWeek } from '../lib/dates';
import useTodayKey from '../lib/useToday';
import { ANYTIME, partOf, placeEntry, sortByPart } from '../lib/parts';

/*
 * Database layout (everything lives under users/{uid}), schema 2:
 *
 *   activities/{id}       { name, emoji, color, order, createdAt }
 *   dayTemplates/{id}     { name, color, items: [{ id, activityId, minutes?, part?, note? }], order, createdAt }
 *                         part: morning | afternoon | evening | night (absent = anytime); items are kept
 *                         grouped in that order
 *                         an ordered list of entries; the same activity may appear more than once,
 *                         each entry with its own duration. Ticks are keyed by entry id.
 *   weekTemplates/{id}    { name, days: { 0..6: dayTemplateId }, order, createdAt }   0 = Sunday … 6 = Saturday
 *   weeks/{YYYY-MM-DD}    { templateId }          key = first day of that week (per settings.weekStartsOn)
 *   dayOverrides/{date}   dayTemplateId | "none"  a one-off change for that date
 *   logs/{date}           { entryId: true }
 *   snapshots/{date}      { dayTemplateId, name, color, items: [{ id, activityId, name, emoji, color, minutes?, part?, note? }] } | { rest: true }
 *                         (snapshots from before schema 3 have no activityId; their id is the activity id)
 *                         the checklist as it was on that day, so later template edits don't rewrite history.
 *                         Past days are closed out automatically (see closeOutPastDays), ticked or not.
 *   settings              { weekStartsOn: 0..6, defaultWeekTemplateId, schema, closedThrough: date }
 */

export const NONE_DAY = 'none';
const SCHEMA = 3;

/** Entry id for a new item in a day template. */
const newEntryId = () => `e${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

const DataContext = createContext(null);

const SECTIONS = ['activities', 'dayTemplates', 'weekTemplates', 'weeks', 'dayOverrides', 'settings'];

/**
 * One-time upgrades:
 *  1 → 2: positional week slots and per-week overrides become weekday- and date-keyed.
 *  2 → 3: day templates' activity id lists (+ durations map) become entry lists. Existing entries
 *         reuse the activity id as their entry id, so ticks already saved still match.
 */
function migrationUpdates(raw) {
  const ws = raw.settings?.weekStartsOn ?? 1;
  const updates = { 'settings/schema': SCHEMA };
  Object.entries(raw.weekTemplates || {}).forEach(([id, w]) => {
    if (!w.slots) return;
    Object.entries(w.slots).forEach(([slot, dt]) => {
      updates[`weekTemplates/${id}/days/${(ws + Number(slot)) % 7}`] = dt;
    });
    updates[`weekTemplates/${id}/slots`] = null;
  });
  Object.entries(raw.weeks || {}).forEach(([wk, w]) => {
    if (!w.overrides) return;
    Object.entries(w.overrides).forEach(([slot, dt]) => {
      updates[`dayOverrides/${dateKey(addDays(parseKey(wk), Number(slot)))}`] = dt;
    });
    updates[`weeks/${wk}/overrides`] = null;
  });
  Object.entries(raw.dayTemplates || {}).forEach(([id, t]) => {
    if (!t.activities && !t.durations) return;
    updates[`dayTemplates/${id}/items`] = (t.activities || []).map((a) =>
      t.durations?.[a] ? { id: a, activityId: a, minutes: t.durations[a] } : { id: a, activityId: a });
    updates[`dayTemplates/${id}/activities`] = null;
    updates[`dayTemplates/${id}/durations`] = null;
  });
  return updates;
}

export function DataProvider({ children }) {
  const { user } = useAuth();
  const uid = user?.uid;
  const [raw, setRaw] = useState({});
  const [loaded, setLoaded] = useState({});
  const migrating = useRef(false);
  const todayKey = useTodayKey();

  useEffect(() => {
    if (!uid) return undefined;
    setRaw({});
    setLoaded({});
    const unsubs = SECTIONS.map((section) =>
      onValue(ref(db, `users/${uid}/${section}`), (snap) => {
        setRaw((r) => ({ ...r, [section]: snap.val() }));
        setLoaded((l) => ({ ...l, [section]: true }));
      })
    );
    return () => unsubs.forEach((u) => u());
  }, [uid]);

  const base = `users/${uid}`;
  const path = useCallback((p) => ref(db, `${base}/${p}`), [base]);
  const multi = useCallback((updates) => update(ref(db, base), updates), [base]);

  const allLoaded = SECTIONS.every((s) => loaded[s]);
  const migrated = (raw.settings?.schema ?? 0) >= SCHEMA;

  useEffect(() => {
    if (!allLoaded || migrated || migrating.current) return;
    migrating.current = true;
    multi(migrationUpdates(raw)).finally(() => { migrating.current = false; });
  }, [allLoaded, migrated, raw, multi]);

  const activities = useMemo(() => toSortedList(raw.activities), [raw.activities]);
  const dayTemplates = useMemo(() => toSortedList(raw.dayTemplates), [raw.dayTemplates]);
  const weekTemplates = useMemo(() => toSortedList(raw.weekTemplates), [raw.weekTemplates]);
  const weeks = raw.weeks || {};
  const dayOverrides = raw.dayOverrides || {};
  const settings = { weekStartsOn: 1, defaultWeekTemplateId: null, ...(raw.settings || {}) };

  const activityById = raw.activities || {};
  const dayTemplateById = raw.dayTemplates || {};
  const weekTemplateById = raw.weekTemplates || {};

  /** The checklist a day template gives right now, frozen into a snapshot. */
  const snapshotOf = (dayTemplateId) => {
    const t = dayTemplateId ? dayTemplateById[dayTemplateId] : null;
    // RTDB drops empty objects, so a rest day is stored as an explicit marker.
    if (!t) return { rest: true };
    return {
      dayTemplateId,
      name: t.name,
      color: t.color,
      items: sortByPart((t.items || []).filter((e) => activityById[e.activityId])).map((e) => {
        const { name, emoji, color } = activityById[e.activityId];
        const item = { id: e.id, activityId: e.activityId, name, emoji, color };
        if (e.minutes) item.minutes = e.minutes;
        if (e.part) item.part = e.part;
        if (e.note) item.note = e.note;
        return item;
      }),
    };
  };

  // ---------- Activities ----------
  const addActivity = (data) =>
    push(path('activities'), { ...data, order: activities.length, createdAt: Date.now() });
  const updateActivity = (id, data) => update(path(`activities/${id}`), data);
  const deleteActivity = (id) => {
    const updates = { [`activities/${id}`]: null };
    dayTemplates.forEach((t) => {
      const list = t.items || [];
      if (list.some((e) => e.activityId === id)) updates[`dayTemplates/${t.id}/items`] = list.filter((e) => e.activityId !== id);
    });
    return multi(updates);
  };

  // ---------- Day templates ----------
  const addDayTemplate = (data) =>
    push(path('dayTemplates'), { items: [], ...data, order: dayTemplates.length, createdAt: Date.now() });
  const updateDayTemplate = (id, data) => update(path(`dayTemplates/${id}`), data);

  // ----- Entries inside a day template (ordered; the same activity may repeat) -----
  const entriesOf = (tplId) => dayTemplateById[tplId]?.items || [];
  const setEntries = (tplId, items) => set(path(`dayTemplates/${tplId}/items`), items);
  /** Add an activity to a day, into `part` (morning…night, or anytime) at `index` within it. */
  const addEntry = (tplId, activityId, part = ANYTIME.id, index) => {
    const entry = { id: newEntryId(), activityId };
    setEntries(tplId, placeEntry(entriesOf(tplId), entry, part, index));
    return entry.id;
  };
  const removeEntry = (tplId, entryId) => setEntries(tplId, entriesOf(tplId).filter((e) => e.id !== entryId));
  /**
   * Move an entry (keeping its duration) to `part` at `index` in a day — the same day or another one.
   * A move between days is a single write.
   */
  const moveEntry = (fromTpl, entryId, toTpl, part, index) => {
    const entry = entriesOf(fromTpl).find((e) => e.id === entryId);
    if (!entry) return Promise.resolve();
    if (fromTpl === toTpl) return setEntries(toTpl, placeEntry(entriesOf(toTpl), entry, part, index));
    return multi({
      [`dayTemplates/${fromTpl}/items`]: entriesOf(fromTpl).filter((e) => e.id !== entryId),
      [`dayTemplates/${toTpl}/items`]: placeEntry(entriesOf(toTpl), entry, part, index),
    });
  };
  /**
   * Edit one entry: { part?, minutes?, note? }. Empty minutes/note are removed. Changing the part
   * moves the entry to the end of that part.
   */
  const updateEntry = (tplId, entryId, patch) => {
    const items = entriesOf(tplId);
    const entry = items.find((e) => e.id === entryId);
    if (!entry) return Promise.resolve();
    const next = { ...entry, ...patch };
    if (!(next.minutes > 0)) delete next.minutes; else next.minutes = Math.round(next.minutes);
    next.note = (next.note || '').trim();
    if (!next.note) delete next.note;
    const part = patch.part ?? partOf(entry);
    if (part !== partOf(entry)) return setEntries(tplId, placeEntry(items, next, part));
    if (part === ANYTIME.id) delete next.part;
    return setEntries(tplId, items.map((e) => (e.id === entryId ? next : e)));
  };
  /** Minutes for one entry; null/0 clears it. */
  const setDuration = (tplId, entryId, minutes) => {
    const i = entriesOf(tplId).findIndex((e) => e.id === entryId);
    if (i < 0) return Promise.resolve();
    return set(path(`dayTemplates/${tplId}/items/${i}/minutes`), minutes > 0 ? Math.round(minutes) : null);
  };
  const deleteDayTemplate = (id) => {
    const updates = { [`dayTemplates/${id}`]: null };
    weekTemplates.forEach((w) => {
      Object.entries(w.days || {}).forEach(([wd, dt]) => {
        if (dt === id) updates[`weekTemplates/${w.id}/days/${wd}`] = null;
      });
    });
    Object.entries(dayOverrides).forEach(([d, dt]) => {
      if (dt === id) updates[`dayOverrides/${d}`] = null;
    });
    return multi(updates);
  };

  // ---------- Week templates ----------
  const addWeekTemplate = async (data) => {
    const r = await push(path('weekTemplates'), { days: {}, ...data, order: weekTemplates.length, createdAt: Date.now() });
    if (!settings.defaultWeekTemplateId) await update(path('settings'), { defaultWeekTemplateId: r.key });
    return r;
  };
  const updateWeekTemplate = (id, data) => update(path(`weekTemplates/${id}`), data);
  /** Set several weekdays of a week template in one write: pairs of [weekday 0–6, dayTemplateId | null]. */
  const setWeekTemplateDays = (id, pairs) => {
    const updates = {};
    pairs.forEach(([wd, dt]) => { updates[`weekTemplates/${id}/days/${wd}`] = dt || null; });
    return multi(updates);
  };
  const deleteWeekTemplate = (id) => {
    const updates = { [`weekTemplates/${id}`]: null };
    if (settings.defaultWeekTemplateId === id) updates['settings/defaultWeekTemplateId'] = null;
    Object.entries(weeks).forEach(([wk, w]) => {
      if (w.templateId === id) updates[`weeks/${wk}`] = null;
    });
    return multi(updates);
  };

  // ---------- Calendar weeks & days ----------
  const setWeekTemplateFor = (weekKey, templateId) => set(path(`weeks/${weekKey}/templateId`), templateId || null);

  /**
   * Resolve what a calendar date looks like:
   * week assignment (or the default week template) → that weekday → one-off override for the date.
   */
  const planFor = (date) => {
    const key = dateKey(date);
    const weekKey = dateKey(startOfWeek(date, settings.weekStartsOn));
    const weekTemplateId = weeks[weekKey]?.templateId || settings.defaultWeekTemplateId || null;
    const weekTemplate = weekTemplateId ? weekTemplateById[weekTemplateId] : null;
    const rawTemplateDay = weekTemplate?.days?.[date.getDay()];
    const templateDayId = rawTemplateDay && dayTemplateById[rawTemplateDay] ? rawTemplateDay : null;
    // An override of NONE_DAY means "nothing planned on this date", even if the week template has a day.
    const overrideId = dayOverrides[key];
    const validOverride = overrideId === NONE_DAY || Boolean(overrideId && dayTemplateById[overrideId]);
    const dayTemplateId = validOverride ? (overrideId === NONE_DAY ? null : overrideId) : templateDayId;
    return {
      key,
      weekKey,
      weekTemplateId: weekTemplate ? weekTemplateId : null,
      weekTemplate,
      dayTemplateId,
      dayTemplate: dayTemplateId ? { id: dayTemplateId, ...dayTemplateById[dayTemplateId] } : null,
      isOverride: validOverride,
      templateDayId,
    };
  };

  /**
   * Pick day templates for calendar dates in one write: pairs of [Date, dayTemplateId | null].
   * Stores an override only when it differs from the week template. Days up to today also get
   * their snapshot refreshed, since choosing a day type for a date is an explicit change to it.
   */
  const setDaysFor = (pairs) => {
    const updates = {};
    pairs.forEach(([date, dayTemplateId]) => {
      const p = planFor(date);
      const want = dayTemplateId || null;
      updates[`dayOverrides/${p.key}`] = want === p.templateDayId ? null : want || NONE_DAY;
      if (p.key <= todayKey) updates[`snapshots/${p.key}`] = snapshotOf(want);
    });
    return multi(updates);
  };
  const setDayFor = (date, dayTemplateId) => setDaysFor([[date, dayTemplateId]]);
  const resetDays = (dates) => setDaysFor(dates.map((d) => [d, planFor(d).templateDayId]));

  // ---------- Settings ----------
  const updateSettings = (data) => update(path('settings'), data);

  /** Changing the first weekday moves each explicit week assignment to the new week covering its middle. */
  const setWeekStartsOn = (weekStartsOn) => {
    if (weekStartsOn === settings.weekStartsOn) return Promise.resolve();
    const updates = { 'settings/weekStartsOn': weekStartsOn };
    const moved = {};
    Object.entries(weeks).forEach(([wk, w]) => {
      updates[`weeks/${wk}`] = null;
      if (!w?.templateId) return;
      moved[dateKey(startOfWeek(addDays(parseKey(wk), 3), weekStartsOn))] = { templateId: w.templateId };
    });
    Object.entries(moved).forEach(([wk, w]) => { updates[`weeks/${wk}`] = w; });
    return multi(updates);
  };

  // ---------- Logs ----------
  /** Tick or untick; also records the day's checklist the first time (or keeps today's current). */
  const setActivityDone = (dKey, activityId, done, snapshot) => {
    const updates = { [`logs/${dKey}/${activityId}`]: done ? true : null };
    if (snapshot) updates[`snapshots/${dKey}`] = snapshot;
    return multi(updates);
  };
  const saveSnapshot = (dKey, snapshot) => set(path(`snapshots/${dKey}`), snapshot);

  /*
   * Close out past days: give every day from the last close-out (or the account's start) up to
   * yesterday a snapshot of what was planned, ticked or not. Days that already have one keep it.
   * This keeps old completion rates fixed when templates change later.
   */
  const closing = useRef(null);
  const ready = allLoaded && migrated;
  useEffect(() => {
    if (!ready || !uid || closing.current === todayKey) return;
    const yesterday = dateKey(addDays(parseKey(todayKey), -1));
    const createdDays = [...activities, ...dayTemplates, ...weekTemplates]
      .map((x) => x.createdAt).filter(Boolean).map((t) => dateKey(new Date(t)));
    if (createdDays.length === 0) return; // nothing set up yet
    const earliest = dateKey(addDays(parseKey(todayKey), -90));
    let from = settings.closedThrough
      ? dateKey(addDays(parseKey(settings.closedThrough), 1))
      : createdDays.sort()[0];
    if (from < earliest) from = earliest;
    if (from > yesterday) return;

    closing.current = todayKey;
    const range = query(ref(db, `${base}/snapshots`), orderByKey(), startAt(from), endAt(yesterday));
    get(range).then((snap) => {
      const existing = snap.val() || {};
      const updates = { 'settings/closedThrough': yesterday };
      for (let d = parseKey(from); dateKey(d) <= yesterday; d = addDays(d, 1)) {
        const k = dateKey(d);
        if (!existing[k]) updates[`snapshots/${k}`] = snapshotOf(planFor(d).dayTemplateId);
      }
      return multi(updates);
    }).catch(() => { closing.current = null; });
  }, [ready, uid, todayKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const value = {
    uid,
    ready,
    todayKey,
    activities,
    dayTemplates,
    weekTemplates,
    weeks,
    settings,
    activityById,
    dayTemplateById,
    weekTemplateById,
    addActivity,
    updateActivity,
    deleteActivity,
    addDayTemplate,
    updateDayTemplate,
    addEntry,
    removeEntry,
    moveEntry,
    updateEntry,
    setDuration,
    deleteDayTemplate,
    addWeekTemplate,
    updateWeekTemplate,
    setWeekTemplateDays,
    deleteWeekTemplate,
    setWeekTemplateFor,
    setDayFor,
    setDaysFor,
    resetDays,
    updateSettings,
    setWeekStartsOn,
    setActivityDone,
    saveSnapshot,
    snapshotOf,
    planFor,
    reorder: (section, ids) => {
      const updates = {};
      ids.forEach((id, i) => { updates[`${section}/${id}/order`] = i; });
      return multi(updates);
    },
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export const useData = () => useContext(DataContext);

function useLive(path) {
  const { uid } = useData();
  const [state, setState] = useState({ path: null, value: undefined });
  useEffect(() => {
    if (!uid || !path) return undefined;
    return onValue(ref(db, `users/${uid}/${path}`), (snap) => setState({ path, value: snap.val() }));
  }, [uid, path]);
  return state.path === path ? state.value : undefined; // undefined while loading
}

// An empty snapshot is never stored (RTDB drops it), so null and "no day" compare equal.
const sameSnapshot = (a, b) =>
  (a?.dayTemplateId || null) === (b?.dayTemplateId || null) &&
  (a?.items || []).map((i) => `${i.id}:${i.minutes || ''}:${i.part || ''}:${i.note || ''}`).join() ===
    (b?.items || []).map((i) => `${i.id}:${i.minutes || ''}:${i.part || ''}:${i.note || ''}`).join();

/**
 * Everything the checklist for one date needs.
 * Past days that were worked on show the checklist they had then; other days follow the templates.
 */
export function useDay(date) {
  const { planFor, snapshotOf, activityById, todayKey, saveSnapshot } = useData();
  const key = dateKey(date);
  const logRaw = useLive(`logs/${key}`);
  const snapRaw = useLive(`snapshots/${key}`);
  const loading = logRaw === undefined || snapRaw === undefined;
  const log = logRaw || {};
  const plan = planFor(date);
  const live = snapshotOf(plan.dayTemplateId);
  const hasTicks = Object.keys(log).length > 0;
  // A past day keeps the checklist it had when it was closed out (or when it was ticked/changed).
  const frozen = key < todayKey && snapRaw ? snapRaw : null;
  const source = frozen || live;

  // Keep today's snapshot in step with template edits once the day has been worked on.
  const needsSync = !loading && key === todayKey && hasTicks && !sameSnapshot(snapRaw, live);
  useEffect(() => {
    if (needsSync) saveSnapshot(key, live);
  }, [needsSync, key]); // eslint-disable-line react-hooks/exhaustive-deps

  // Prefer current activity details (renames, new emoji); fall back to the recorded copy if it was deleted.
  const items = sortByPart(source.items || []).map((it) => {
    const activityId = it.activityId || it.id; // pre-schema-3 snapshots stored the activity id as id
    const { name, emoji, color } = activityById[activityId] || {};
    return { ...it, activityId, ...(name ? { name, emoji, color } : {}) };
  });
  const dayTemplate = source.dayTemplateId || source.name ? { id: source.dayTemplateId, name: source.name, color: source.color } : null;

  return {
    key,
    loading,
    log,
    plan,
    items,
    dayTemplate,
    isHistory: Boolean(frozen),
    /** Snapshot to write alongside a tick: the frozen one for past days, else the live one. */
    snapshotForTick: frozen ? null : live,
  };
}
