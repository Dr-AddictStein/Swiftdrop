import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRealtimeRefresh } from '../../context/RealtimeContext';
import { fetchPlatformParcels } from '../../api/services';
import { ApiRequestError } from '../../api';
import {
  Alert,
  Card,
  EmptyState,
  LoadingState,
  PageHeader,
} from '../../components/Common';
import { StatusBadge } from '../../components/StatusBadge';
import type { PlatformParcel } from '../../types';

export function PlatformParcelsPage() {
  const { token } = useAuth();
  const [parcels, setParcels] = useState<PlatformParcel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [companyFilter, setCompanyFilter] = useState('');

  const load = useCallback(
    async (silent = false) => {
      if (!token) return;
      if (!silent) setLoading(true);
      try {
        setParcels(await fetchPlatformParcels(token));
      } catch (err) {
        setError(
          err instanceof ApiRequestError ? err.message : 'Failed to load parcels',
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

  const companyNames = useMemo(
    () =>
      Array.from(
        new Set(parcels.map((p) => p.companyName).filter((n): n is string => !!n)),
      ).sort(),
    [parcels],
  );

  const filtered = companyFilter
    ? parcels.filter((p) => p.companyName === companyFilter)
    : parcels;

  return (
    <div>
      <PageHeader
        title="All Parcels"
        subtitle="Live view of every parcel across all companies."
      />
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

      <Card>
        <div className="filters">
          <label>
            Company
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
            >
              <option value="">All companies</option>
              {companyNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
        </div>

        {loading ? (
          <LoadingState />
        ) : filtered.length === 0 ? (
          <EmptyState message="No parcels found." />
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Tracking #</th>
                <th>Company</th>
                <th>Recipient</th>
                <th>Assigned Agent</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td>{p.trackingNumber}</td>
                  <td>{p.companyName ?? '—'}</td>
                  <td>{p.recipientName}</td>
                  <td>{p.assignedAgentName ?? <span className="muted">Unassigned</span>}</td>
                  <td>
                    <StatusBadge status={p.status} />
                    {p.retryQueued && <span className="retry-flag">Retry queued</span>}
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
