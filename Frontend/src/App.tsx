import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { RealtimeProvider } from './context/RealtimeContext';
import { NotificationsProvider } from './context/NotificationsContext';
import { AppLayout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { AdminOverviewPage } from './pages/admin/AdminOverviewPage';
import { UsersPage } from './pages/admin/UsersPage';
import { ReportsPage } from './pages/admin/ReportsPage';
import { NotificationsPage } from './pages/admin/NotificationsPage';
import { AgentOverviewPage } from './pages/agent/AgentOverviewPage';
import { ProfilePage } from './pages/agent/ProfilePage';
import { ParcelsPage } from './pages/ParcelsPage';
import { ParcelDetailPage } from './pages/ParcelDetailPage';
import { RetryQueuePage } from './pages/RetryQueuePage';
import { PlatformOverviewPage } from './pages/platform/PlatformOverviewPage';
import { PlatformCompaniesPage } from './pages/platform/PlatformCompaniesPage';
import { PlatformUsersPage } from './pages/platform/PlatformUsersPage';
import { PlatformParcelsPage } from './pages/platform/PlatformParcelsPage';
import type { UserRole } from './types';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

function RoleRoute({
  roles,
  children,
}: {
  roles: UserRole[];
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  if (!user || !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function HomePage() {
  const { user } = useAuth();
  if (user?.role === 'SUPER_ADMIN') return <PlatformOverviewPage />;
  if (user?.role === 'ADMIN') return <AdminOverviewPage />;
  return <AgentOverviewPage />;
}

function AppRoutes() {
  const { token } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={token ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route
        path="/register"
        element={token ? <Navigate to="/" replace /> : <RegisterPage />}
      />
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<HomePage />} />

        {/* Tenant (admin + agent) routes */}
        <Route
          path="parcels"
          element={
            <RoleRoute roles={['ADMIN', 'DELIVERY_AGENT']}>
              <ParcelsPage />
            </RoleRoute>
          }
        />
        <Route
          path="parcels/:id"
          element={
            <RoleRoute roles={['ADMIN', 'DELIVERY_AGENT']}>
              <ParcelDetailPage />
            </RoleRoute>
          }
        />
        <Route
          path="retry-queue"
          element={
            <RoleRoute roles={['ADMIN', 'DELIVERY_AGENT']}>
              <RetryQueuePage />
            </RoleRoute>
          }
        />
        <Route
          path="users"
          element={
            <RoleRoute roles={['ADMIN']}>
              <UsersPage />
            </RoleRoute>
          }
        />
        <Route
          path="reports"
          element={
            <RoleRoute roles={['ADMIN']}>
              <ReportsPage />
            </RoleRoute>
          }
        />
        <Route
          path="notifications"
          element={
            <RoleRoute roles={['ADMIN']}>
              <NotificationsPage />
            </RoleRoute>
          }
        />
        <Route
          path="profile"
          element={
            <RoleRoute roles={['DELIVERY_AGENT']}>
              <ProfilePage />
            </RoleRoute>
          }
        />

        {/* Super admin routes */}
        <Route
          path="platform/companies"
          element={
            <RoleRoute roles={['SUPER_ADMIN']}>
              <PlatformCompaniesPage />
            </RoleRoute>
          }
        />
        <Route
          path="platform/users"
          element={
            <RoleRoute roles={['SUPER_ADMIN']}>
              <PlatformUsersPage />
            </RoleRoute>
          }
        />
        <Route
          path="platform/parcels"
          element={
            <RoleRoute roles={['SUPER_ADMIN']}>
              <PlatformParcelsPage />
            </RoleRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <RealtimeProvider>
        <NotificationsProvider>
          <AppRoutes />
        </NotificationsProvider>
      </RealtimeProvider>
    </AuthProvider>
  );
}
