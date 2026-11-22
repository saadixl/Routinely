import { Link, useNavigate, useParams } from 'react-router-dom';
import { useData } from '../context/DataContext';
import WeekBoard from '../components/WeekBoard';
import Empty from '../components/Empty';
import useKeyNav from '../lib/useKeyNav';
import { ChevronLeft, ChevronRight, LayersIcon } from '../components/Icons';
import { addDays, dateKey, formatShort, parseKey, slotWeekdays, startOfWeek, today } from '../lib/dates';

export default function ThisWeek() {
  const { start } = useParams();
  const navigate = useNavigate();
  const { settings, weekTemplates, weekTemplateById, weeks, setWeekTemplateFor, setDayOverride, setDayFor, planFor } = useData();

  const now = today();
  const weekStart = startOfWeek(start ? parseKey(start) : now, settings.weekStartsOn);
  const weekKey = dateKey(weekStart);
  const thisWeekKey = dateKey(startOfWeek(now, settings.weekStartsOn));
  const offset = Math.round((weekStart - parseKey(thisWeekKey)) / (7 * 86400000));
  const names = slotWeekdays(settings.weekStartsOn, true);
  const explicit = weeks[weekKey]?.templateId;
  const explicitTemplateId = explicit && weekTemplateById[explicit] && explicit !== settings.defaultWeekTemplateId ? explicit : '';
  const defaultTemplate = settings.defaultWeekTemplateId ? weekTemplateById[settings.defaultWeekTemplateId] : null;

  const go = (d) => {
    const k = dateKey(startOfWeek(d, settings.weekStartsOn));
    navigate(k === thisWeekKey ? '/week' : `/week/${k}`);
  };
  useKeyNav(() => go(addDays(weekStart, -7)), () => go(addDays(weekStart, 7)));

  const dates = names.map((_, i) => addDays(weekStart, i));
  const plans = dates.map((d) => planFor(d));
  const hasOverrides = plans.some((p) => p.isOverride);
  const resetAll = () => plans.forEach((p, i) => p.isOverride && setDayOverride(weekKey, i, null));

  const title = offset === 0 ? 'This week' : offset === 1 ? 'Next week' : offset === -1 ? 'Last week' : `Week of ${formatShort(weekStart)}`;

  return (
    <div className="fade-in" key={weekKey}>
      <div className="page-head">
        <div>
          <div className="eyebrow">
            {formatShort(weekStart)} – {formatShort(addDays(weekStart, 6))}
            {offset !== 0 && <> · <Link to="/week">Back to this week</Link></>}
          </div>
          <h1>{title}</h1>
        </div>
        <div className="stepper">
          <button className="btn icon" onClick={() => go(addDays(weekStart, -7))} aria-label="Previous week" title="Previous week (←)"><ChevronLeft width={18} height={18} /></button>
          <button className="btn icon" onClick={() => go(addDays(weekStart, 7))} aria-label="Next week" title="Next week (→)"><ChevronRight width={18} height={18} /></button>
        </div>
      </div>

      {weekTemplates.length === 0 ? (
        <Empty icon={<LayersIcon />} title="No week template yet" action={<Link className="btn primary" to="/setup/weeks">Create one</Link>}>
          Lay out a typical week once — then every week fills itself in.
        </Empty>
      ) : (
        <>
          <div className="week-toolbar">
            <select
              className="select pill"
              value={explicitTemplateId}
              onChange={(e) => setWeekTemplateFor(weekKey, e.target.value)}
              aria-label="Week template"
            >
              <option value="">{defaultTemplate ? defaultTemplate.name : 'No template'}</option>
              {weekTemplates.filter((w) => w.id !== settings.defaultWeekTemplateId).map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
            <span className="spacer" />
            {hasOverrides && <button className="btn ghost sm" onClick={resetAll}>Undo changes</button>}
          </div>

          <WeekBoard
            rows={plans.map((p, i) => ({
              label: names[i],
              sub: formatShort(dates[i]),
              today: dateKey(dates[i]) === dateKey(now),
              dayTemplateId: p.dayTemplateId,
              changed: p.isOverride,
              onReset: p.isOverride ? () => setDayOverride(weekKey, i, null) : null,
            }))}
            onAssign={(slot, dt) => setDayFor(dates[slot], dt)}
          />
          <p className="faint small" style={{ marginTop: 12 }}>Changes apply to this week only.</p>
        </>
      )}
    </div>
  );
}
