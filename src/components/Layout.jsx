import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Menu from './Menu';
import { CheckIcon, LogoutIcon, SettingsIcon, TodayIcon, WeekIcon } from './Icons';

const NAV = [
  { to: '/', label: 'Today', Icon: TodayIcon, match: (p) => p === '/' || p.startsWith('/day') },
  { to: '/week', label: 'Week', Icon: WeekIcon, match: (p) => p.startsWith('/week') },
  { to: '/setup', label: 'Setup', Icon: SettingsIcon, match: (p) => p.startsWith('/setup') },
];

export function Brand() {
  return (
    <span className="brand">
      <span className="brand-mark"><CheckIcon width={15} height={15} strokeWidth={3} /></span>
      Routinely
    </span>
  );
}

function Avatar({ user }) {
  if (user.photoURL) return <img className="avatar" src={user.photoURL} alt="" referrerPolicy="no-referrer" />;
  return <span className="avatar">{(user.displayName || user.email || '?')[0].toUpperCase()}</span>;
}

export default function Layout() {
  const { user, signOut } = useAuth();
  const { pathname } = useLocation();
  const links = (cls) =>
    NAV.map(({ to, label, Icon, match }) => (
      <NavLink key={to} to={to} className={() => (match(pathname) ? 'active' : '')}>
        {cls === 'tab' && <Icon width={22} height={22} strokeWidth={match(pathname) ? 2.2 : 1.8} />}
        {label}
      </NavLink>
    ));

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <NavLink to="/" style={{ textDecoration: 'none' }}><Brand /></NavLink>
          <nav className="segmented" aria-label="Main">{links('seg')}</nav>
          <div className="topbar-end">
            <Menu trigger={({ toggle }) => (
              <button className="avatar-btn" onClick={toggle} aria-label="Account"><Avatar user={user} /></button>
            )}>
              {() => (
                <>
                  <div className="menu-head">
                    <div style={{ fontWeight: 600 }}>{user.displayName || 'You'}</div>
                    <div className="faint small">{user.email}</div>
                  </div>
                  <button className="menu-item" onClick={signOut}><LogoutIcon width={16} height={16} /> Sign out</button>
                </>
              )}
            </Menu>
          </div>
        </div>
      </header>
      <main className="main">
        <Outlet />
      </main>
      <nav className="tabbar" aria-label="Main">{links('tab')}</nav>
    </>
  );
}
