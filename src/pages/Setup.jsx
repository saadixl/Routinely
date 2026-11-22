import { NavLink, Navigate, useParams } from 'react-router-dom';
import { useData } from '../context/DataContext';
import Activities from './Activities';
import DayTemplates from './DayTemplates';
import WeekTemplates from './WeekTemplates';

const TABS = [
  { id: 'activities', label: 'Activities', Panel: Activities, count: (d) => d.activities.length },
  { id: 'days', label: 'Days', Panel: DayTemplates, count: (d) => d.dayTemplates.length },
  { id: 'weeks', label: 'Weeks', Panel: WeekTemplates, count: (d) => d.weekTemplates.length },
];

export default function Setup() {
  const { tab } = useParams();
  const data = useData();
  const current = TABS.find((t) => t.id === tab);

  if (!current) {
    // Land on the first step that still needs something.
    const next = TABS.find((t) => t.count(data) === 0) || TABS[0];
    return <Navigate to={`/setup/${next.id}`} replace />;
  }

  const { Panel } = current;
  return (
    <div className="fade-in">
      <div className="page-head">
        <div>
          <div className="eyebrow">Activities → Days → Weeks</div>
          <h1>Setup</h1>
        </div>
      </div>
      <nav className="segmented setup-tabs" aria-label="Setup sections">
        {TABS.map((t) => (
          <NavLink key={t.id} to={`/setup/${t.id}`}>
            {t.label} <span className="count">{t.count(data) || ''}</span>
          </NavLink>
        ))}
      </nav>
      <Panel key={current.id} />
    </div>
  );
}
