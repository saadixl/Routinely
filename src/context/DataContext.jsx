import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { onValue, push, ref, set, update } from 'firebase/database';
import { db } from '../firebase';
import { useAuth } from './AuthContext';
import { toSortedList } from '../lib/palette';
import { dateKey, slotIndex, startOfWeek } from '../lib/dates';

/*
 * Database layout (everything lives under users/{uid}):
 *
 *   activities/{id}     { name, emoji, color, order, createdAt }
 *   dayTemplates/{id}   { name, color, activities: [activityId], order, createdAt }
 *   weekTemplates/{id}  { name, slots: { 0..6: dayTemplateId }, createdAt }
 *   weeks/{YYYY-MM-DD}  { templateId, overrides: { 0..6: dayTemplateId } }   key = first day of the week
 *   logs/{YYYY-MM-DD}   { activityId: true }
 *   settings            { weekStartsOn: 0..6, defaultWeekTemplateId }
 */

const DataContext = createContext(null);

const SECTIONS = ['activities', 'dayTemplates', 'weekTemplates', 'weeks', 'settings'];

export function DataProvider({ children }) {
  const { user } = useAuth();
  const uid = user?.uid;
  const [raw, setRaw] = useState({});
  const [loaded, setLoaded] = useState({});

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

  const activities = useMemo(() => toSortedList(raw.activities), [raw.activities]);
  const dayTemplates = useMemo(() => toSortedList(raw.dayTemplates), [raw.dayTemplates]);
  const weekTemplates = useMemo(() => toSortedList(raw.weekTemplates), [raw.weekTemplates]);
  const weeks = raw.weeks || {};
  const settings = { weekStartsOn: 1, defaultWeekTemplateId: null, ...(raw.settings || {}) };

  const activityById = raw.activities || {};
  const dayTemplateById = raw.dayTemplates || {};
  const weekTemplateById = raw.weekTemplates || {};

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
    return update(ref(db, base), updates);
  };

  // ---------- Day templates ----------
  const addDayTemplate = (data) =>
    push(path('dayTemplates'), { activities: [], ...data, order: dayTemplates.length, createdAt: Date.now() });
  const updateDayTemplate = (id, data) => update(path(`dayTemplates/${id}`), data);
  const deleteDayTemplate = (id) => {
    const updates = { [`dayTemplates/${id}`]: null };
    weekTemplates.forEach((w) => {
      Object.entries(w.slots || {}).forEach(([slot, dt]) => {
        if (dt === id) updates[`weekTemplates/${w.id}/slots/${slot}`] = null;
      });
    });
    Object.entries(weeks).forEach(([wk, w]) => {
      Object.entries(w.overrides || {}).forEach(([slot, dt]) => {
        if (dt === id) updates[`weeks/${wk}/overrides/${slot}`] = null;
      });
    });
    return update(ref(db, base), updates);
  };

  // ---------- Week templates ----------
  const addWeekTemplate = async (data) => {
    const r = await push(path('weekTemplates'), { slots: {}, ...data, order: weekTemplates.length, createdAt: Date.now() });
    if (!settings.defaultWeekTemplateId) await update(path('settings'), { defaultWeekTemplateId: r.key });
    return r;
  };
  const updateWeekTemplate = (id, data) => update(path(`weekTemplates/${id}`), data);
  const setWeekTemplateSlot = (id, slot, dayTemplateId) =>
    set(path(`weekTemplates/${id}/slots/${slot}`), dayTemplateId || null);
  const deleteWeekTemplate = (id) => {
    const updates = { [`weekTemplates/${id}`]: null };
    if (settings.defaultWeekTemplateId === id) updates['settings/defaultWeekTemplateId'] = null;
    Object.entries(weeks).forEach(([wk, w]) => {
      if (w.templateId === id) updates[`weeks/${wk}/templateId`] = null;
    });
    return update(ref(db, base), updates);
  };

  // ---------- Calendar weeks ----------
  const setWeekTemplateFor = (weekKey, templateId) => set(path(`weeks/${weekKey}/templateId`), templateId || null);
  const setDayOverride = (weekKey, slot, dayTemplateId) =>
    set(path(`weeks/${weekKey}/overrides/${slot}`), dayTemplateId || null);

  // ---------- Settings ----------
  const updateSettings = (data) => update(path('settings'), data);

  // ---------- Logs ----------
  const setActivityDone = (dKey, activityId, done) =>
    set(path(`logs/${dKey}/${activityId}`), done ? true : null);

  /**
   * Resolve what a given calendar date looks like:
   * week assignment (or the default week template) → slot → per-day override.
   */
  const planFor = (date) => {
    const weekKey = dateKey(startOfWeek(date, settings.weekStartsOn));
    const slot = slotIndex(date, settings.weekStartsOn);
    const week = weeks[weekKey] || {};
    const weekTemplateId = week.templateId || settings.defaultWeekTemplateId || null;
    const weekTemplate = weekTemplateId ? weekTemplateById[weekTemplateId] : null;
    const overrideId = week.overrides?.[slot];
    const templateDayId = weekTemplate?.slots?.[slot];
    const dayTemplateId = overrideId || templateDayId || null;
    const dayTemplate = dayTemplateId ? dayTemplateById[dayTemplateId] : null;
    return {
      weekKey,
      slot,
      weekTemplateId: weekTemplate ? weekTemplateId : null,
      weekTemplate,
      weekIsExplicit: Boolean(week.templateId),
      dayTemplateId: dayTemplate ? dayTemplateId : null,
      dayTemplate: dayTemplate ? { id: dayTemplateId, ...dayTemplate } : null,
      isOverride: Boolean(overrideId && dayTemplateById[overrideId]),
      templateDayId: templateDayId || null,
    };
  };

  const value = {
    uid,
    ready: SECTIONS.every((s) => loaded[s]),
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
    setWeekTemplateSlot,
    deleteWeekTemplate,
    setWeekTemplateFor,
    setDayOverride,
    updateSettings,
    setActivityDone,
    planFor,
    reorder: (section, ids) => {
      const updates = {};
      ids.forEach((id, i) => { updates[`${section}/${id}/order`] = i; });
      return update(ref(db, base), updates);
    },
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export const useData = () => useContext(DataContext);

/** Live completion map for one date: { activityId: true }. */
export function useDayLog(dKey) {
  const { uid } = useData();
  const [log, setLog] = useState(null);
  useEffect(() => {
    if (!uid || !dKey) return undefined;
    setLog(null);
    return onValue(ref(db, `users/${uid}/logs/${dKey}`), (snap) => setLog(snap.val() || {}));
  }, [uid, dKey]);
  return log;
}

