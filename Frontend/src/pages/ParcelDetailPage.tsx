import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useRealtimeRefresh } from '../context/RealtimeContext';
import {
  dispatchRetry,
  fetchParcel,
  fetchParcelHistory,
  requeueParcel,
  updateParcelStatus,
} from '../api/services';
import { ApiRequestError } from '../api';
import {
  Alert,
  Card,
  LoadingState,
  PageHeader,
} from '../components/Common';
import { StatusBadge } from '../components/StatusBadge';
import { Button } from '../components/Modal';
import { AgentInfo } from '../components/AgentInfo';
import { useDeliveryAgents } from '../hooks/useDeliveryAgents';
import { getAgentActivityLabel, resolveAgent } from '../utils/agents';
import type { DeliveryEvent, Parcel } from '../types';
import { formatDate, getNextStatuses, STATUS_LABELS } from '../utils/status';

export function ParcelDetailPage() {
  const { id = '' } = useParams();
  const { token, user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const isAgent = user?.role === 'DELIVERY_AGENT';
  const agents = useDeliveryAgents();

  const [parcel, setParcel] = useState<Parcel | null>(null);
  const [history, setHistory] = useState<DeliveryEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [remarks, setRemarks] = useState('');

  const load = useCallback(
    async (silent = false) => {
      if (!token || !id) return;
      if (!silent) setLoading(true);
      setError(null);
      try {
        const [p, h] = await Promise.all([
          fetchParcel(token, id),
          fetchParcelHistory(token, id),
        ]);
        setParcel(p);
        setHistory(h);
      } catch (err) {
        setError(err instanceof ApiRequestError ? err.message : 'Failed to load parcel');
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [token, id],
  );

  useEffect(() => {
    void load();
  }, [load]);

  useRealtimeRefresh((event) => {
    if (event.type === 'parcel.updated' && event.parcel.id === id) {
      void load(true);
    }
  }, [load, id]);

  const handleStatusUpdate = async (status: Parcel['status']) => {
    if (!token || !id) return;
    try {
      await updateParcelStatus(token, id, status, remarks || undefined);
      setRemarks('');
      setSuccess(`Status updated to ${STATUS_LABELS[status]}.`);
      await load();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Status update failed');
    }
  };

  const handleRequeue = async () => {
    if (!token || !id) return;
    try {
      await requeueParcel(token, id);
      setSuccess('Parcel added to retry queue.');
      await load();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Re-queue failed');
    }
  };

  const handleDispatchRetry = async () => {
    if (!token || !id) return;
    try {
      await dispatchRetry(token, id, remarks || 'Retry dispatched');
      setRemarks('');
      setSuccess('Retry dispatched — parcel is out for delivery again.');
      await load();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Dispatch failed');
    }
  };

  if (loading) return <LoadingState />;
  if (!parcel) return <Alert type="error" message={error ?? 'Parcel not found'} />;

  const assignedAgent = resolveAgent(agents, parcel.assignedAgentId);
  const nextStatuses = isAgent ? getNextStatuses(parcel.status) : [];

  return (
    <div>
      <PageHeader
        title={parcel.trackingNumber}
        subtitle={`Registered ${formatDate(parcel.createdAt)}`}
      />

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      {success && (
        <Alert type="success" message={success} onClose={() => setSuccess(null)} />
      )}

      <div className="two-col">
        <Card title="Parcel Details">
          <dl className="detail-list">
            <div>
              <dt>Status</dt>
              <dd>
                <StatusBadge status={parcel.status} />
                {parcel.retryQueued && (
                  <span className="retry-flag">Queued for retry</span>
                )}
              </dd>
            </div>
            <div>
              <dt>Sender</dt>
              <dd>
                {parcel.senderName}
                <br />
                <span className="muted">{parcel.senderAddress}</span>
              </dd>
            </div>
            <div>
              <dt>Recipient</dt>
              <dd>
                {parcel.recipientName}
                <br />
                <span className="muted">{parcel.recipientAddress}</span>
              </dd>
            </div>
          </dl>

          {isAdmin && (
            <div className="assigned-agent-banner">
              <span className="assigned-agent-banner__label">Delivery Agent</span>
              <AgentInfo agent={assignedAgent} fallback="Not assigned yet" />
              {assignedAgent && (
                <p className="assigned-agent-banner__activity muted">
                  {getAgentActivityLabel(parcel.status)}
                </p>
              )}
            </div>
          )}

          {isAdmin && parcel.status === 'FAILED_ATTEMPT' && !parcel.retryQueued && (
            <div className="action-bar">
              <Button variant="secondary" onClick={() => void handleRequeue()}>
                Add to Retry Queue
              </Button>
            </div>
          )}

          {isAgent && parcel.retryQueued && parcel.status === 'FAILED_ATTEMPT' && (
            <div className="action-bar">
              <label>
                Notes (optional)
                <input
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Retry notes"
                />
              </label>
              <Button onClick={() => void handleDispatchRetry()}>
                Dispatch Retry
              </Button>
            </div>
          )}

          {isAgent && nextStatuses.length > 0 && !parcel.retryQueued && (
            <div className="action-bar">
              <p className="muted">Update delivery status:</p>
              <label>
                Notes (optional)
                <input
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Delivery notes"
                />
              </label>
              <div className="button-group">
                {nextStatuses.map((s) => (
                  <Button
                    key={s}
                    variant={s === 'FAILED_ATTEMPT' ? 'danger' : 'primary'}
                    onClick={() => void handleStatusUpdate(s)}
                  >
                    Mark as {STATUS_LABELS[s]}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </Card>

        <Card title="Delivery Timeline">
          {history.length === 0 ? (
            <p className="muted">No delivery events recorded yet.</p>
          ) : (
            <ul className="timeline">
              {history.map((event) => {
                const eventAgent = resolveAgent(agents, event.createdBy);
                return (
                  <li key={event.id}>
                    <div className="timeline__dot" />
                    <div>
                      <strong>{STATUS_LABELS[event.status]}</strong>
                      <span className="muted">{formatDate(event.createdAt)}</span>
                      {isAdmin && (
                        <span className="timeline-agent muted">
                          by {eventAgent?.name ?? 'Unknown agent'}
                          {eventAgent?.email ? ` (${eventAgent.email})` : ''}
                        </span>
                      )}
                      {event.remarks && <p>{event.remarks}</p>}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
