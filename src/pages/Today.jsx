import { Link, useNavigate, useParams } from 'react-router-dom';
import { useData, useDayLog } from '../context/DataContext';
import Empty from '../components/Empty';
import useKeyNav from '../lib/useKeyNav';
import { CheckIcon, ChevronLeft, ChevronRight } from '../components/Icons';
import { addDays, dateKey, formatLong, parseKey, today } from '../lib/dates';

function Ring({ done, total }) {
  const r = 30;
  const c = 2 * Math.PI * r;
  const pct = total ? done / total : 0;
  return (
    <svg className="ring" width="76" height="76" viewBox="0 0 76 76" aria-label={`${done} of ${total} done`}>
      <circle cx="38" cy="38" r={r} fill="none" stroke="var(--border)" strokeWidth="7" />
      <circle
        cx="38" cy="38" r={r} fill="none" stroke="var(--accent)" strokeWidth="7" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - pct)} transform="rotate(-90 38 38)"
      />
      <text x="38" y="43" textAnchor="middle" fontSize="16" fontWeight="700" fill="var(--text)">
        {total ? Math.round(pct * 100) : 0}%
      </text>
    </svg>
  );
}

export default function Today() {
  const { date: param } = useParams();
  const navigate = useNavigate();
  const { activityById, dayTemplates, weekTemplates, planFor, setDayFor, setActivityDone } = useData();

  const now = today();
  const date = param ? parseKey(param) : now;
  const key = dateKey(date);
  const isToday = key === dateKey(now);
  const log = useDayLog(key);
  const plan = planFor(date);
  const t = plan.dayTemplate;
  const items = (t?.activities || []).filter((id) => activityById[id]).map((id) => ({ id, ...activityById[id] }));
  const doneCount = log ? items.filter((a) => log[a.id]).length : 0;

  const go = (d) => navigate(dateKey(d) === dateKey(now) ? '/' : `/day/${dateKey(d)}`);
  useKeyNav(() => go(addDays(date, -1)), () => go(addDays(date, 1)));

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{isToday ? 'Today' : formatLong(date)}</h1>
          <p>{isToday ? formatLong(date) : <Link to="/">Back to today</Link>}</p>
        </div>
        <div className="date-nav">
          <button className="btn icon" onClick={() => go(addDays(date, -1))} aria-label="Previous day" title="Previous day (←)"><ChevronLeft /></button>
          <button className="btn icon" onClick={() => go(addDays(date, 1))} aria-label="Next day" title="Next day (→)"><ChevronRight /></button>
        </div>
      </div>

      {dayTemplates.length > 0 && (
        <div className="card today-hero">
          <Ring done={doneCount} total={items.length} />
          <div className="stack" style={{ gap: 6, flex: 1, minWidth: 0 }}>
            <div className="row">
              {t ? <span className="day-tag" style={{ background: t.color }}>{t.name}</span> : <span className="chip">No day set</span>}
              {plan.isOverride && <span className="faint small">changed for this date</span>}
            </div>
            <div className="muted small">
              {items.length ? `${doneCount} of ${items.length} done` : 'Nothing planned'}
              {plan.weekTemplate && <> · week: {plan.weekTemplate.name}</>}
            </div>
          </div>
          <select
            className="select"
            style={{ width: 'auto', maxWidth: 170 }}
            value={plan.dayTemplateId || ''}
            onChange={(e) => setDayFor(date, e.target.value)}
            aria-label="Change day template for this date"
          >
            <option value="">No day</option>
            {dayTemplates.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
      )}

      {dayTemplates.length === 0 ? (
        <Empty title="Let’s set up your routine" action={<Link className="btn primary" to="/activities">Start with activities</Link>}>
          1. Add activities · 2. Group them into day templates · 3. Lay days out in a week template.
        </Empty>
      ) : !t ? (
        <Empty
          title="No day planned"
          action={weekTemplates.length ? <Link className="btn" to="/week">Plan this week</Link> : <Link className="btn primary" to="/week-templates">Create a week template</Link>}
        >
          Pick a day template above, or set up your week so every day fills in automatically.
        </Empty>
      ) : items.length === 0 ? (
        <Empty title={`“${t.name}” has no activities`} action={<Link className="btn" to="/days">Edit day templates</Link>}>
          Add some activities to this day template to get a checklist.
        </Empty>
      ) : (
        <div className="stack" style={{ gap: 8 }}>
          {items.map((a) => {
            const done = Boolean(log?.[a.id]);
            return (
              <button
                key={a.id}
                className={`check-item${done ? ' done' : ''}`}
                onClick={() => setActivityDone(key, a.id, !done)}
                disabled={!log}
                aria-pressed={done}
              >
                <span className="checkbox"><CheckIcon width={16} height={16} strokeWidth={3} /></span>
                <span className="emoji-badge" style={{ background: `${a.color}22` }}>{a.emoji}</span>
                <span className="check-name">{a.name}</span>
              </button>
            );
          })}
          {items.length > 0 && doneCount === items.length && (
            <p className="muted" style={{ textAlign: 'center', marginTop: 12 }}>All done — nice work. 🎉</p>
          )}
        </div>
      )}
    </>
  );
}
