import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { fetchAgentReports } from '../../api/services';
import { ApiRequestError } from '../../api';
import {
  Alert,
  Card,
  EmptyState,
  LoadingState,
  PageHeader,
} from '../../components/Common';
import type { AgentReport } from '../../types';

export function ReportsPage() {
  const { token } = useAuth();
  const [reports, setReports] = useState<AgentReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    void (async () => {
      try {
        setReports(await fetchAgentReports(token));
      } catch (err) {
        setError(
          err instanceof ApiRequestError ? err.message : 'Failed to load reports',
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  return (
    <div>
      <PageHeader
        title="Agent Reports"
        subtitle="Delivery performance metrics aggregated from the database."
      />
      {error && <Alert type="error" message={error} />}

      <Card>
        {loading ? (
          <LoadingState />
        ) : reports.length === 0 ? (
          <EmptyState message="No report data available yet." />
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Agent</th>
                <th>Email</th>
                <th>Total Deliveries</th>
                <th>Success Rate</th>
                <th>Avg Pickup → Delivery</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.agentId}>
                  <td>{r.agentName}</td>
                  <td>{r.agentEmail}</td>
                  <td>{r.totalDeliveries}</td>
                  <td>{r.successRate}%</td>
                  <td>
                    {r.averagePickupToDeliveryMinutes !== null
                      ? `${r.averagePickupToDeliveryMinutes} min`
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
