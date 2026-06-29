import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useRealtimeRefresh } from '../context/RealtimeContext';
import {
  dispatchRetry,
  fetchRetryQueue,
  requeueParcel,
} from '../api/services';
import { ApiRequestError } from '../api';
import {
  Alert,
  Card,
  EmptyState,
  LoadingState,
  PageHeader,
} from '../components/Common';
import { StatusBadge } from '../components/StatusBadge';
import { Button } from '../components/Modal';
import { AgentInfo } from '../components/AgentInfo';
import { useDeliveryAgents } from '../hooks/useDeliveryAgents';
import { resolveAgent } from '../utils/agents';
import type { Parcel } from '../types';

export function RetryQueuePage() {
  const { token, user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const agents = useDeliveryAgents();
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(
    async (silent = false) => {
      if (!token) return;
      if (!silent) setLoading(true);
      try {
        setParcels(await fetchRetryQueue(token));
      } catch (err) {
        setError(err instanceof ApiRequestError ? err.message : 'Failed to load retry queue');
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

  const handleDispatch = async (parcelId: string) => {
    if (!token) return;
    try {
      await dispatchRetry(token, parcelId);
      setSuccess('Retry dispatched successfully.');
      await load();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Dispatch failed');
    }
  };

  const handleRequeue = async (parcelId: string) => {
    if (!token) return;
    try {
      await requeueParcel(token, parcelId);
      setSuccess('Parcel re-queued.');
      await load();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Re-queue failed');
    }
  };

  return (
    <div>
      <PageHeader
        title="Retry Queue"
        subtitle={
          isAdmin
            ? 'Parcels that failed delivery and are waiting to be retried.'
            : 'Your failed deliveries queued for retry.'
        }
        action={
          <Button variant="secondary" onClick={() => void load()}>
            Refresh
          </Button>
        }
      />

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      {success && (
        <Alert type="success" message={success} onClose={() => setSuccess(null)} />
      )}

      <Card>
        {loading ? (
          <LoadingState />
        ) : parcels.length === 0 ? (
          <EmptyState message="No parcels in the retry queue." />
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Tracking #</th>
                <th>Recipient</th>
                {isAdmin && <th>Assigned Agent</th>}
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {parcels.map((p) => (
                <tr key={p.id}>
                  <td>{p.trackingNumber}</td>
                  <td>{p.recipientName}</td>
                  {isAdmin && (
                    <td>
                      <AgentInfo agent={resolveAgent(agents, p.assignedAgentId)} />
                    </td>
                  )}
                  <td>
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="actions-cell">
                    <Link to={`/parcels/${p.id}`}>
                      <Button variant="ghost" size="sm">
                        Details
                      </Button>
                    </Link>
                    {!isAdmin && p.status === 'FAILED_ATTEMPT' && (
                      <Button
                        size="sm"
                        onClick={() => void handleDispatch(p.id)}
                      >
                        Dispatch Retry
                      </Button>
                    )}
                    {isAdmin && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => void handleRequeue(p.id)}
                      >
                        Re-queue
                      </Button>
                    )}
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
