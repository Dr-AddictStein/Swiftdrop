import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { fetchParcels, fetchRetryQueue } from '../../api/services';
import { ApiRequestError } from '../../api';
import { Alert, Card, LoadingState, PageHeader } from '../../components/Common';
import { StatusBadge } from '../../components/StatusBadge';
import { Button } from '../../components/Modal';
import type { Parcel } from '../../types';

export function AgentOverviewPage() {
  const { token, user } = useAuth();
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [retryCount, setRetryCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    void (async () => {
      try {
        const [all, retry] = await Promise.all([
          fetchParcels(token),
          fetchRetryQueue(token),
        ]);
        setParcels(all);
        setRetryCount(retry.length);
      } catch (err) {
        setError(
          err instanceof ApiRequestError ? err.message : 'Failed to load deliveries',
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  if (loading) return <LoadingState />;

  const active = parcels.filter(
    (p) => p.status !== 'DELIVERED' && p.status !== 'REGISTERED',
  );
  const pending = parcels.filter((p) => p.status === 'REGISTERED');
  const completed = parcels.filter((p) => p.status === 'DELIVERED');

  return (
    <div>
      <PageHeader
        title={`Welcome, ${user?.name ?? 'Agent'}`}
        subtitle="Your assigned deliveries and active tasks."
      />
      {error && <Alert type="error" message={error} />}

      <div className="stats-grid">
        <Card className="stat-card">
          <span className="stat-label">Active Deliveries</span>
          <strong className="stat-value">{active.length}</strong>
        </Card>
        <Card className="stat-card">
          <span className="stat-label">Awaiting Pickup</span>
          <strong className="stat-value">{pending.length}</strong>
        </Card>
        <Card className="stat-card">
          <span className="stat-label">Completed</span>
          <strong className="stat-value">{completed.length}</strong>
        </Card>
        <Card className="stat-card">
          <span className="stat-label">Retry Queue</span>
          <strong className="stat-value">{retryCount}</strong>
        </Card>
      </div>

      <Card title="Active Deliveries">
        {active.length === 0 ? (
          <p className="muted">No active deliveries right now.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Tracking #</th>
                <th>Recipient</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {active.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link to={`/parcels/${p.id}`}>{p.trackingNumber}</Link>
                  </td>
                  <td>{p.recipientName}</td>
                  <td>
                    <StatusBadge status={p.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="card-actions">
          <Link to="/parcels">
            <Button variant="secondary">View all deliveries</Button>
          </Link>
          {retryCount > 0 && (
            <Link to="/retry-queue">
              <Button variant="secondary">Retry queue ({retryCount})</Button>
            </Link>
          )}
        </div>
      </Card>
    </div>
  );
}
