import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { onValue, push, ref, set, update } from 'firebase/database';
import { db } from '../firebase';
import { useAuth } from './AuthContext';
import { toSortedList } from '../lib/palette';
import { addDays, dateKey, parseKey, startOfWeek } from '../lib/dates';
import useTodayKey from '../lib/useToday';

/*
 * Database layout (everything lives under users/{uid}), schema 2:
 *
 *   activities/{id}       { name, emoji, color, order, createdAt }
 *   dayTemplates/{id}     { name, color, activities: [activityId], order, createdAt }
 *   weekTemplates/{id}    { name, days: { 0..6: dayTemplateId }, order, createdAt }   0 = Sunday … 6 = Saturday
 *   weeks/{YYYY-MM-DD}    { templateId }          key = first day of that week (per settings.weekStartsOn)
 *   dayOverrides/{date}   dayTemplateId | "none"  a one-off change for that date
 *   logs/{date}           { activityId: true }
 *   snapshots/{date}      { dayTemplateId, name, color, items: [{ id, name, emoji, color }] }
 *                         the checklist as it was on that day, so later template edits don't rewrite history
 *   settings              { weekStartsOn: 0..6, defaultWeekTemplateId, schema }
 */

export const NONE_DAY = 'none';
const SCHEMA = 2;

const DataContext = createContext(null);

const SECTIONS = ['activities', 'dayTemplates', 'weekTemplates', 'weeks', 'dayOverrides', 'settings'];

/** One-time upgrade from schema 1 (positional week slots, per-week overrides). */
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
    if (!t) return { dayTemplateId: null, name: null, color: null, items: [] };
    return {
      dayTemplateId,
      name: t.name,
      color: t.color,
      items: (t.activities || []).filter((id) => activityById[id]).map((id) => {
        const { name, emoji, color } = activityById[id];
        return { id, name, emoji, color };
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
      const list = t.activities || [];
      if (list.includes(id)) updates[`dayTemplates/${t.id}/activities`] = list.filter((a) => a !== id);
    });
    return multi(updates);
  };

  // ---------- Day templates ----------
  const addDayTemplate = (data) =>
    push(path('dayTemplates'), { activities: [], ...data, order: dayTemplates.length, createdAt: Date.now() });
  const updateDayTemplate = (id, data) => update(path(`dayTemplates/${id}`), data);
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

  const value = {
    uid,
    ready: allLoaded && migrated,
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
  (a?.items || []).map((i) => i.id).join() === (b?.items || []).map((i) => i.id).join();

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
  // A past day keeps the checklist it had, but only once something was ticked on it.
  const frozen = key < todayKey && hasTicks && snapRaw ? snapRaw : null;
  const source = frozen || live;

  // Keep today's snapshot in step with template edits once the day has been worked on.
  const needsSync = !loading && key === todayKey && hasTicks && !sameSnapshot(snapRaw, live);
  useEffect(() => {
    if (needsSync) saveSnapshot(key, live);
  }, [needsSync, key]); // eslint-disable-line react-hooks/exhaustive-deps

  // Prefer current activity details (renames, new emoji); fall back to the recorded copy if it was deleted.
  const items = (source.items || []).map((it) => ({ ...it, ...(activityById[it.id] || {}), id: it.id }));
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
