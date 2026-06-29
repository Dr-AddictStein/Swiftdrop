import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useRealtimeRefresh } from '../../context/RealtimeContext';
import {
  fetchAgentReports,
  fetchParcels,
  fetchRetryQueue,
} from '../../api/services';
import { ApiRequestError } from '../../api';
import { Alert, Card, LoadingState, PageHeader } from '../../components/Common';
import { StatusBadge } from '../../components/StatusBadge';
import { Button } from '../../components/Modal';
import { AgentInfo } from '../../components/AgentInfo';
import { useDeliveryAgents } from '../../hooks/useDeliveryAgents';
import { resolveAgent } from '../../utils/agents';
import type { AgentReport, Parcel } from '../../types';

export function AdminOverviewPage() {
  const { token } = useAuth();
  const agents = useDeliveryAgents();
  const [reports, setReports] = useState<AgentReport[]>([]);
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [retryCount, setRetryCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (silent = false) => {
      if (!token) return;
      if (!silent) setLoading(true);
      try {
        const [reportData, parcelData, retry] = await Promise.all([
          fetchAgentReports(token),
          fetchParcels(token),
          fetchRetryQueue(token),
        ]);
        setReports(reportData);
        setParcels(parcelData);
        setRetryCount(retry.length);
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

  const totalDeliveries = reports.reduce((sum, r) => sum + r.totalDeliveries, 0);
  const avgSuccess =
    reports.length > 0
      ? reports.reduce((sum, r) => sum + r.successRate, 0) / reports.length
      : 0;

  const recentParcels = [...parcels].slice(-5).reverse();

  return (
    <div>
      <PageHeader
        title="Operations Overview"
        subtitle="Monitor deliveries, agents, and retry queue at a glance."
      />
      {error && <Alert type="error" message={error} />}

      <div className="stats-grid">
        <Card className="stat-card">
          <span className="stat-label">Total Parcels</span>
          <strong className="stat-value">{parcels.length}</strong>
        </Card>
        <Card className="stat-card">
          <span className="stat-label">Completed Deliveries</span>
          <strong className="stat-value">{totalDeliveries}</strong>
        </Card>
        <Card className="stat-card">
          <span className="stat-label">Avg Success Rate</span>
          <strong className="stat-value">{avgSuccess.toFixed(1)}%</strong>
        </Card>
        <Card className="stat-card">
          <span className="stat-label">Retry Queue</span>
          <strong className="stat-value">{retryCount}</strong>
        </Card>
      </div>

      <div className="two-col">
        <Card title="Recent Parcels">
          {recentParcels.length === 0 ? (
            <p className="muted">No parcels yet. Create one from the Parcels page.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tracking</th>
                  <th>Recipient</th>
                  <th>Assigned Agent</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentParcels.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Link to={`/parcels/${p.id}`}>{p.trackingNumber}</Link>
                    </td>
                    <td>{p.recipientName}</td>
                    <td>
                      <AgentInfo agent={resolveAgent(agents, p.assignedAgentId)} />
                    </td>
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
              <Button variant="secondary">View all parcels</Button>
            </Link>
          </div>
        </Card>

        <Card title="Agent Performance">
          {reports.length === 0 ? (
            <p className="muted">No agent reports available yet.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Agent</th>
                  <th>Deliveries</th>
                  <th>Success</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <tr key={r.agentId}>
                    <td>{r.agentName}</td>
                    <td>{r.totalDeliveries}</td>
                    <td>{r.successRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="card-actions">
            <Link to="/reports">
              <Button variant="secondary">Full reports</Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
