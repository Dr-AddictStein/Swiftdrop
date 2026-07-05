import { NavLink, Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../context/RealtimeContext';
import { useNotifications } from '../context/NotificationsContext';
import { Button } from './Modal';
import type { UserRole } from '../types';

const SUPER_ADMIN_NAV = [
  { to: '/', label: 'Overview', end: true },
  { to: '/platform/companies', label: 'Companies' },
  { to: '/platform/users', label: 'Users' },
  { to: '/platform/parcels', label: 'Parcels' },
];

const ADMIN_NAV = [
  { to: '/', label: 'Overview', end: true },
  { to: '/parcels', label: 'Parcels' },
  { to: '/users', label: 'Users' },
  { to: '/retry-queue', label: 'Retry Queue' },
  { to: '/reports', label: 'Reports' },
  { to: '/notifications', label: 'Notifications' },
];

const AGENT_NAV = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/parcels', label: 'My Deliveries' },
  { to: '/retry-queue', label: 'Retry Queue' },
  { to: '/profile', label: 'Profile' },
];

function navForRole(role: UserRole) {
  if (role === 'SUPER_ADMIN') return SUPER_ADMIN_NAV;
  if (role === 'ADMIN') return ADMIN_NAV;
  return AGENT_NAV;
}

function portalName(role: UserRole) {
  if (role === 'SUPER_ADMIN') return 'Platform Console';
  if (role === 'ADMIN') return 'Admin Portal';
  return 'Agent Portal';
}

export function AppLayout() {
  const { user, logout } = useAuth();
  const { connected } = useRealtime();
  const isAdmin = user?.role === 'ADMIN';
  const { unreadCount } = useNotifications();

  if (!user) return <Navigate to="/login" replace />;

  const nav = navForRole(user.role);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar__brand">
          <span className="logo-mark">SD</span>
          <div>
            <strong>Swiftdrop</strong>
            <span>{portalName(user.role)}</span>
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
              {isAdmin &&
                item.to === '/notifications' &&
                unreadCount > 0 && (
                  <span className="nav-badge">{unreadCount}</span>
                )}
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
        {connected && (
          <div className="live-indicator" title="Live updates connected">
            <span className="live-indicator__dot" />
            Live
          </div>
        )}
        <Outlet />
      </main>
    </div>
  );
}
