import { Link, useNavigate, useParams } from 'react-router-dom';
import { useData } from '../context/DataContext';
import WeekBoard from '../components/WeekBoard';
import Empty from '../components/Empty';
import { ChevronLeft, ChevronRight } from '../components/Icons';
import { addDays, dateKey, formatShort, parseKey, slotWeekdays, startOfWeek, today } from '../lib/dates';

export default function ThisWeek() {
  const { start } = useParams();
  const navigate = useNavigate();
  const { settings, weekTemplates, weekTemplateById, weeks, setWeekTemplateFor, setDayOverride, setDayFor, planFor } = useData();

  const now = today();
  const weekStart = startOfWeek(start ? parseKey(start) : now, settings.weekStartsOn);
  const weekKey = dateKey(weekStart);
  const isCurrent = weekKey === dateKey(startOfWeek(now, settings.weekStartsOn));
  const names = slotWeekdays(settings.weekStartsOn, true);
  const explicitTemplateId = weeks[weekKey]?.templateId && weekTemplateById[weeks[weekKey].templateId] ? weeks[weekKey].templateId : '';
  const defaultTemplate = settings.defaultWeekTemplateId ? weekTemplateById[settings.defaultWeekTemplateId] : null;
  const go = (d) => navigate(`/week/${dateKey(d)}`);

  const dates = names.map((_, i) => addDays(weekStart, i));
  const plans = dates.map((d) => planFor(d));
  const hasOverrides = plans.some((p) => p.isOverride);

  const resetAll = () => plans.forEach((p, i) => p.isOverride && setDayOverride(weekKey, i, null));

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{isCurrent ? 'This week' : 'Week of ' + formatShort(weekStart)}</h1>
          <p>{formatShort(weekStart)} – {formatShort(addDays(weekStart, 6))} · pick a week template, then swap individual days as needed.</p>
        </div>
        <div className="date-nav">
          <button className="btn icon" onClick={() => go(addDays(weekStart, -7))} aria-label="Previous week"><ChevronLeft /></button>
          {!isCurrent && <button className="btn" onClick={() => navigate('/week')}>This week</button>}
          <button className="btn icon" onClick={() => go(addDays(weekStart, 7))} aria-label="Next week"><ChevronRight /></button>
        </div>
      </div>

      {weekTemplates.length === 0 ? (
        <Empty title="No week templates yet" action={<Link className="btn primary" to="/week-templates">Create a week template</Link>}>
          Set up a week template first; then you can use it for any calendar week.
        </Empty>
      ) : (
        <div className="card stack">
          <div className="row">
            <div className="field" style={{ minWidth: 220 }}>
              <label htmlFor="wk-tpl">Week template</label>
              <select
                id="wk-tpl"
                className="select"
                value={explicitTemplateId}
                onChange={(e) => setWeekTemplateFor(weekKey, e.target.value)}
              >
                <option value="">{defaultTemplate ? `Default (${defaultTemplate.name})` : 'None'}</option>
                {weekTemplates.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <span className="spacer" />
            {hasOverrides && <button className="btn sm" onClick={resetAll}>Reset all days to template</button>}
          </div>

          <WeekBoard
            slots={plans.map((p, i) => ({
              label: names[i],
              sub: <Link to={`/day/${dateKey(dates[i])}`} style={{ color: 'inherit' }}>{formatShort(dates[i])}</Link>,
              today: dateKey(dates[i]) === dateKey(now),
              dayTemplateId: p.dayTemplateId,
              note: p.isOverride ? 'Changed' : null,
              onReset: p.isOverride ? () => setDayOverride(weekKey, i, null) : null,
            }))}
            onAssign={(slot, dt) => setDayFor(dates[slot], dt)}
          />
          <p className="faint small">Changes here only affect this calendar week — the week template stays the same.</p>
        </div>
      )}
    </>
  );
}
