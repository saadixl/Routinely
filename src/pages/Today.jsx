import { Link, useNavigate, useParams } from 'react-router-dom';
import { useData, useDay } from '../context/DataContext';
import Empty from '../components/Empty';
import DayPicker from '../components/DayPicker';
import useKeyNav from '../lib/useKeyNav';
import { CheckIcon, ChevronLeft, ChevronRight, SettingsIcon, WeekIcon } from '../components/Icons';
import { addDays, dateKey, formatLong, parseKey } from '../lib/dates';
import { formatMinutes, formatTotal, totalMinutes } from '../lib/duration';
import { groupByPart } from '../lib/parts';

function Ring({ done, total }) {
  const size = 56;
  const r = 24;
  const c = 2 * Math.PI * r;
  const pct = total ? done / total : 0;
  return (
    <svg className="ring" width={size} height={size} viewBox="0 0 56 56" aria-hidden="true">
      <circle cx="28" cy="28" r={r} fill="none" stroke="var(--surface-3)" strokeWidth="5" />
      <circle
        cx="28" cy="28" r={r} fill="none" stroke="var(--accent)" strokeWidth="5" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - pct)} transform="rotate(-90 28 28)"
      />
      {total > 0 && done === total && (
        <path d="M20 28.5l5.5 5.5L36 23.5" fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );
}

function relativeLabel(date, now) {
  const diff = Math.round((date - now) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  return date.toLocaleDateString(undefined, { weekday: 'long' });
}

export default function Today() {
  const { date: param } = useParams();
  const navigate = useNavigate();
  const { dayTemplates, dayTemplateById, weekTemplates, todayKey, setDayFor, resetDays, setActivityDone } = useData();

  const now = parseKey(todayKey);
  const date = param ? parseKey(param) : now;
  const day = useDay(date);
  const { key, log, plan, items } = day;
  const isToday = key === todayKey;
  const t = day.dayTemplate;
  const pickerValue = t?.id && dayTemplateById[t.id] ? t.id : null;
  const doneCount = items.filter((a) => log[a.id]).length;
  const plannedMinutes = totalMinutes(items);
  // Group by part of day; skip the headings when nothing has a part yet (a single "Anytime" group).
  const groups = groupByPart(items);
  const showParts = !(groups.length === 1 && groups[0].part === 'anytime');
  const doneMinutes = totalMinutes(items.filter((a) => log[a.id]));

  const go = (d) => navigate(dateKey(d) === todayKey ? '/' : `/day/${dateKey(d)}`);
  useKeyNav(() => go(addDays(date, -1)), () => go(addDays(date, 1)));

  const setupDone = dayTemplates.length > 0;

  return (
    <div className="fade-in" key={key}>
      <div className="page-head">
        <div>
          <div className="eyebrow">
            {formatLong(date)}
            {!isToday && <> · <Link to="/">Back to today</Link></>}
          </div>
          <h1>{relativeLabel(date, now)}</h1>
        </div>
        <div className="stepper">
          <button className="btn icon" onClick={() => go(addDays(date, -1))} aria-label="Previous day" title="Previous day (←)"><ChevronLeft width={18} height={18} /></button>
          <button className="btn icon" onClick={() => go(addDays(date, 1))} aria-label="Next day" title="Next day (→)"><ChevronRight width={18} height={18} /></button>
        </div>
      </div>

      {!setupDone ? (
        <Empty
          icon={<SettingsIcon />}
          title="Set up your routine"
          action={<Link className="btn primary" to="/setup">Get started</Link>}
        >
          Add a few activities, group them into kinds of days, then lay out your week. Takes about two minutes.
        </Empty>
      ) : (
        <>
          <div className="card progress-card">
            <Ring done={doneCount} total={items.length} />
            <div className="progress-meta">
              <span className="big">{items.length ? `${doneCount} of ${items.length}` : 'Free day'}</span>
              <span className="muted small">
                {items.length ? (doneCount === items.length ? 'All done' : 'done') : 'Nothing planned'}
                {plannedMinutes > 0 && <> · <span className="nowrap">{doneMinutes ? `${formatTotal(doneMinutes)} of ${formatTotal(plannedMinutes)}` : formatTotal(plannedMinutes)} planned</span></>}
              </span>
            </div>
            <DayPicker
              align="right"
              value={pickerValue}
              onChange={(id) => setDayFor(date, id)}
              onReset={plan.isOverride ? () => resetDays([date]) : null}
              placeholder="Pick a day"
            />
          </div>

          {!t ? (
            <Empty
              icon={<WeekIcon />}
              title="Nothing planned"
              action={weekTemplates.length
                ? <Link className="btn" to="/week">Open week</Link>
                : <Link className="btn primary" to="/setup/weeks">Set up a week</Link>}
            >
              Pick a day type above, or set up your week so each day fills in automatically.
            </Empty>
          ) : items.length === 0 ? (
            <Empty title={`${t.name} has no activities`} action={<Link className="btn" to="/setup/days">Add activities</Link>}>
              Add activities to this day to get a checklist.
            </Empty>
          ) : (
            <>
              <div className={`day-parts${showParts ? ' with-labels' : ''}`}>
              {groups.map((g) => {
                const groupDone = g.items.filter((a) => log[a.id]).length;
                const groupMinutes = totalMinutes(g.items);
                return (
                  <section key={g.part} aria-label={showParts ? g.label : undefined}>
                    {showParts && (
                      <div className="part-label">
                        <span className="name">{g.label}</span>
                        <span className="meta">
                          {groupDone}/{g.items.length}{groupMinutes > 0 && <> · {formatTotal(groupMinutes)}</>}
                        </span>
                      </div>
                    )}
                    <div className="group checklist">
                      {g.items.map((a) => {
                        const done = Boolean(log?.[a.id]);
                        return (
                          <button
                            key={a.id}
                            className={`check-row${done ? ' done' : ''}`}
                            onClick={() => setActivityDone(key, a.id, !done, day.snapshotForTick)}
                            disabled={day.loading}
                            aria-pressed={done}
                          >
                            <span className="tick"><CheckIcon width={14} height={14} strokeWidth={3} /></span>
                            <span className="emoji-tile" style={{ '--c': a.color }}>{a.emoji}</span>
                            <span className="name-wrap">
                              <span className="name">{a.name}</span>
                              {a.note && <span className="check-note">{a.note}</span>}
                            </span>
                            {a.minutes > 0 && <span className="meta-time">{formatMinutes(a.minutes)}</span>}
                          </button>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
              </div>
              {doneCount === items.length && <p className="all-done">That’s everything. Nicely done.</p>}
            </>
          )}
        </>
      )}
    </div>
  );
}
