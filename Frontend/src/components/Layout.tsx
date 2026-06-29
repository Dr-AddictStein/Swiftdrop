import { NavLink, Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from './Modal';

const ADMIN_NAV = [
  { to: '/', label: 'Overview', end: true },
  { to: '/parcels', label: 'Parcels' },
  { to: '/users', label: 'Users' },
  { to: '/retry-queue', label: 'Retry Queue' },
  { to: '/reports', label: 'Reports' },
];

const AGENT_NAV = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/parcels', label: 'My Deliveries' },
  { to: '/retry-queue', label: 'Retry Queue' },
  { to: '/profile', label: 'Profile' },
];

export function AppLayout() {
  const { user, logout } = useAuth();
  const nav = user?.role === 'ADMIN' ? ADMIN_NAV : AGENT_NAV;

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar__brand">
          <span className="logo-mark">SD</span>
          <div>
            <strong>Swiftdrop</strong>
            <span>{user.role === 'ADMIN' ? 'Admin Portal' : 'Agent Portal'}</span>
          </div>
        </div>

        <nav className="sidebar__nav">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `sidebar__link ${isActive ? 'active' : ''}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar__footer">
          <div className="sidebar__user">
            <strong>{user.name}</strong>
            <span>{user.email}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={logout}>
            Sign out
          </Button>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
