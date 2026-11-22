import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CheckIcon, DayIcon, LayersIcon, ListIcon, LogoutIcon, TodayIcon, WeekIcon } from './Icons';

const NAV = [
  { to: '/', label: 'Today', Icon: TodayIcon, end: true },
  { to: '/week', label: 'This week', short: 'Week', Icon: WeekIcon },
  { to: '/week-templates', label: 'Week templates', short: 'Weeks', Icon: LayersIcon },
  { to: '/days', label: 'Day templates', short: 'Days', Icon: DayIcon },
  { to: '/activities', label: 'Activities', Icon: ListIcon },
];

export function Brand() {
  return (
    <div className="brand">
      <span className="brand-mark"><CheckIcon width={18} height={18} strokeWidth={3} /></span>
      Routinely
    </div>
  );
}

export default function Layout() {
  const { user, signOut } = useAuth();

  return (
    <div className="shell">
      <aside className="sidebar">
        <Brand />
        {NAV.map(({ to, label, Icon, end }) => (
          <NavLink key={to} to={to} end={end} className="nav-link">
            <Icon /> {label}
          </NavLink>
        ))}
        <div className="sidebar-footer">
          {user.photoURL ? <img className="avatar" src={user.photoURL} alt="" referrerPolicy="no-referrer" /> : <span className="avatar" />}
          <div className="who">
            <div>{user.displayName || 'You'}</div>
            <div className="muted">{user.email}</div>
          </div>
          <button className="btn ghost icon" onClick={signOut} title="Sign out" aria-label="Sign out"><LogoutIcon width={18} height={18} /></button>
        </div>
      </aside>

      <div>
        <header className="mobile-top">
          <Brand />
          <button className="btn ghost sm" onClick={signOut}>Sign out</button>
        </header>
        <main className="main">
          <Outlet />
        </main>
      </div>

      <nav className="bottom-nav">
        {NAV.map(({ to, label, short, Icon, end }) => (
          <NavLink key={to} to={to} end={end} className="nav-link">
            <Icon /> {short || label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
