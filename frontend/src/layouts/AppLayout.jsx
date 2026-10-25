import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import Brand from '../components/Brand';
import Icon from '../components/Icon';
import { useAuth } from '../context/AuthContext';

const navigation = [
  ['Dashboard', '/dashboard', 'grid'],
  ['My Health Records', '/records', 'file'],
  ['Family Health Network', '/family', 'users'],
  ['Share with Doctor', '/share', 'share'],
  ['Family Health Insights', '/insights', 'pulse'],
  ['Health Timeline', '/timeline', 'clock'],
];
const careTools = [
  ['AI Health Summarizer', '/ai-summary', 'spark'],
  ['Emergency Health Card', '/emergency-card', 'shield'],
  ['Community Intelligence', '/community', 'globe'],
];

function NavItems({ items, close }) {
  return items.map(([label, path, icon]) => (
    <NavLink key={path} onClick={close} className="nav-link" to={path}>
      <Icon name={icon} size={19} />
      <span>{label}</span>
    </NavLink>
  ));
}

export default function AppLayout() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();

  const title =
    [...navigation, ...careTools].find(([, path]) => path === location.pathname)?.[0] ||
    'Health Passport';

  const initials = user?.fullName
    ? user.fullName
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'AK';

  const handleSignOut = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="app-shell">
      <button
        className={`sidebar-scrim ${open ? 'show' : ''}`}
        aria-label="Close navigation"
        onClick={() => setOpen(false)}
      />
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <Brand />
        <nav aria-label="Main navigation">
          <p className="nav-label">Overview</p>
          <NavItems items={navigation} close={() => setOpen(false)} />
          <p className="nav-label nav-label-spaced">Care tools</p>
          <NavItems items={careTools} close={() => setOpen(false)} />
        </nav>
        <NavLink
          onClick={() => setOpen(false)}
          className="nav-link settings-link"
          to="/settings"
        >
          <Icon name="settings" size={19} />
          <span>Profile & Settings</span>
        </NavLink>
        {isAuthenticated ? (
          <button
            onClick={handleSignOut}
            className="nav-link"
            style={{
              border: 0,
              background: 'transparent',
              color: 'var(--danger)',
              cursor: 'pointer',
              marginTop: '4px',
              textAlign: 'left',
              width: '100%',
            }}
          >
            <Icon name="close" size={19} />
            <span>Sign out</span>
          </button>
        ) : null}
        <div className="sidebar-help">
          <Icon name="shield" size={17} />
          <div>
            <strong>Private by design</strong>
            <span>Control who sees your information.</span>
          </div>
        </div>
      </aside>
      <div className="app-main">
        <header className="topbar">
          <button
            className="icon-button menu-button"
            aria-label="Open navigation"
            onClick={() => setOpen(true)}
          >
            <Icon name="menu" />
          </button>
          <div className="breadcrumb">
            <span>My Health</span>
            <Icon name="chevron" size={15} />
            <strong>{title}</strong>
          </div>
          <div className="topbar-actions">
            {!isAuthenticated && (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--orange)',
                  background: 'var(--soft)',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  border: '1px solid #fed7aa',
                }}
              >
                Demo Preview Mode
              </span>
            )}
            <button className="icon-button" aria-label="Notifications">
              <Icon name="bell" size={20} />
              <i />
            </button>
            <div
              className="avatar"
              aria-label={user?.fullName ? `${user.fullName}'s profile` : 'Patient profile'}
              title={user?.email || 'Demo profile'}
            >
              {initials}
            </div>
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

