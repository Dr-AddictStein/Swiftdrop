import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useRealtimeRefresh } from '../../context/RealtimeContext';
import { fetchPlatformOverview } from '../../api/services';
import { ApiRequestError } from '../../api';
import { Alert, Card, LoadingState, PageHeader } from '../../components/Common';
import { Button } from '../../components/Modal';
import type { PlatformOverview } from '../../types';

export function PlatformOverviewPage() {
  const { token } = useAuth();
  const [data, setData] = useState<PlatformOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (silent = false) => {
      if (!token) return;
      if (!silent) setLoading(true);
      try {
        setData(await fetchPlatformOverview(token));
      } catch (err) {
        setError(
          err instanceof ApiRequestError ? err.message : 'Failed to load overview',
        );
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [token],
  );

  useEffect(() => {
    void load();
  }, [load]);

  useRealtimeRefresh(() => {
    void load(true);
  }, [load]);

  if (loading) return <LoadingState />;
  if (!data) return <Alert type="error" message={error ?? 'No data'} />;

  const { totals, companies } = data;

  return (
    <div>
      <PageHeader
        title="Platform Overview"
        subtitle="Monitor every delivery company on Swiftdrop."
        action={
          <Link to="/platform/companies">
            <Button>Manage companies</Button>
          </Link>
        }
      />
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      <div className="stats-grid">
        <Card className="stat-card">
          <span className="stat-label">Companies</span>
          <strong className="stat-value">{totals.companies}</strong>
        </Card>
        <Card className="stat-card">
          <span className="stat-label">Admins</span>
          <strong className="stat-value">{totals.admins}</strong>
        </Card>
        <Card className="stat-card">
          <span className="stat-label">Delivery Agents</span>
          <strong className="stat-value">{totals.agents}</strong>
        </Card>
        <Card className="stat-card">
          <span className="stat-label">Total Parcels</span>
          <strong className="stat-value">{totals.parcels}</strong>
        </Card>
      </div>

      <div className="two-col">
        <Card title="Companies">
          {companies.length === 0 ? (
            <p className="muted">No companies yet.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Owner</th>
                  <th>Agents</th>
                  <th>Parcels</th>
                  <th>Delivered</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <strong>{c.name}</strong>
                      <div className="muted">{c.joinCode}</div>
                    </td>
                    <td>{c.ownerName ?? '—'}</td>
                    <td>{c.agentCount}</td>
                    <td>{c.parcelCount}</td>
                    <td>{c.deliveredCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card title="Parcels by Status">
          <table className="data-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Count</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(totals.parcelsByStatus).length === 0 ? (
                <tr>
                  <td colSpan={2} className="muted">
                    No parcels yet.
                  </td>
                </tr>
              ) : (
                Object.entries(totals.parcelsByStatus).map(([status, count]) => (
                  <tr key={status}>
                    <td>{status.replace(/_/g, ' ')}</td>
                    <td>{count}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
