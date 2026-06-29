import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppLayout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { AdminOverviewPage } from './pages/admin/AdminOverviewPage';
import { UsersPage } from './pages/admin/UsersPage';
import { ReportsPage } from './pages/admin/ReportsPage';
import { AgentOverviewPage } from './pages/agent/AgentOverviewPage';
import { ProfilePage } from './pages/agent/ProfilePage';
import { ParcelsPage } from './pages/ParcelsPage';
import { ParcelDetailPage } from './pages/ParcelDetailPage';
import { RetryQueuePage } from './pages/RetryQueuePage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (user?.role !== 'ADMIN') return <Navigate to="/" replace />;
  return children;
}

function HomePage() {
  const { user } = useAuth();
  return user?.role === 'ADMIN' ? <AdminOverviewPage /> : <AgentOverviewPage />;
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
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<HomePage />} />
        <Route path="parcels" element={<ParcelsPage />} />
        <Route path="parcels/:id" element={<ParcelDetailPage />} />
        <Route path="retry-queue" element={<RetryQueuePage />} />
        <Route
          path="users"
          element={
            <AdminRoute>
              <UsersPage />
            </AdminRoute>
          }
        />
        <Route
          path="reports"
          element={
            <AdminRoute>
              <ReportsPage />
            </AdminRoute>
          }
        />
        <Route path="profile" element={<ProfilePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
