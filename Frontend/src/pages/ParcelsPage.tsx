import { type FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  assignParcel,
  createParcel,
  fetchParcels,
  fetchUsers,
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
import { Button, Modal } from '../components/Modal';
import type { Parcel, User } from '../types';
import { PARCEL_STATUSES } from '../types';

export function ParcelsPage() {
  const { token, user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [agents, setAgents] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [senderFilter, setSenderFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [assignTarget, setAssignTarget] = useState<Parcel | null>(null);
  const [selectedAgent, setSelectedAgent] = useState('');

  const [createForm, setCreateForm] = useState({
    senderName: '',
    senderAddress: '',
    recipientName: '',
    recipientAddress: '',
  });

  const load = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchParcels(token, {
        status: statusFilter || undefined,
        sender: senderFilter || undefined,
      });
      setParcels(data);
      if (isAdmin) {
        const users = await fetchUsers(token);
        setAgents(users.filter((u) => u.role === 'DELIVERY_AGENT'));
      }
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to load parcels');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [token, statusFilter, senderFilter]);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    try {
      await createParcel(token, createForm);
      setShowCreate(false);
      setCreateForm({
        senderName: '',
        senderAddress: '',
        recipientName: '',
        recipientAddress: '',
      });
      setSuccess('Parcel registered successfully.');
      await load();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to create parcel');
    }
  };

  const handleAssign = async () => {
    if (!token || !assignTarget || !selectedAgent) return;
    try {
      await assignParcel(token, assignTarget.id, selectedAgent);
      setAssignTarget(null);
      setSelectedAgent('');
      setSuccess(`Parcel ${assignTarget.trackingNumber} assigned.`);
      await load();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to assign parcel');
    }
  };

  return (
    <div>
      <PageHeader
        title={isAdmin ? 'Parcels' : 'My Deliveries'}
        subtitle={
          isAdmin
            ? 'Register, track, and assign parcels to delivery agents.'
            : 'Parcels currently assigned to you.'
        }
        action={
          isAdmin ? (
            <Button onClick={() => setShowCreate(true)}>Register Parcel</Button>
          ) : undefined
        }
      />

      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      {success && (
        <Alert type="success" message={success} onClose={() => setSuccess(null)} />
      )}

      <Card>
        <div className="filters">
          <label>
            Status
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All statuses</option>
              {PARCEL_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </label>
          {isAdmin && (
            <label>
              Sender
              <input
                value={senderFilter}
                onChange={(e) => setSenderFilter(e.target.value)}
                placeholder="Search by sender name"
              />
            </label>
          )}
          <Button variant="secondary" onClick={() => void load()}>
            Refresh
          </Button>
        </div>

        {loading ? (
          <LoadingState />
        ) : parcels.length === 0 ? (
          <EmptyState message="No parcels found." />
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Tracking #</th>
                <th>Sender</th>
                <th>Recipient</th>
                <th>Status</th>
                {isAdmin && <th>Assigned Agent</th>}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {parcels.map((p) => (
                <tr key={p.id}>
                  <td>{p.trackingNumber}</td>
                  <td>{p.senderName}</td>
                  <td>{p.recipientName}</td>
                  <td>
                    <StatusBadge status={p.status} />
                    {p.retryQueued && (
                      <span className="retry-flag">Retry queued</span>
                    )}
                  </td>
                  {isAdmin && (
                    <td>
                      {agents.find((a) => a.id === p.assignedAgentId)?.name ?? '—'}
                    </td>
                  )}
                  <td className="actions-cell">
                    <Link to={`/parcels/${p.id}`}>
                      <Button variant="ghost" size="sm">
                        View
                      </Button>
                    </Link>
                    {isAdmin && p.status === 'REGISTERED' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setAssignTarget(p);
                          setSelectedAgent('');
                        }}
                      >
                        Assign
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Modal open={showCreate} title="Register New Parcel" onClose={() => setShowCreate(false)}>
        <form className="form-stack" onSubmit={handleCreate}>
          <label>
            Sender name
            <input
              required
              value={createForm.senderName}
              onChange={(e) =>
                setCreateForm({ ...createForm, senderName: e.target.value })
              }
            />
          </label>
          <label>
            Sender address
            <input
              required
              value={createForm.senderAddress}
              onChange={(e) =>
                setCreateForm({ ...createForm, senderAddress: e.target.value })
              }
            />
          </label>
          <label>
            Recipient name
            <input
              required
              value={createForm.recipientName}
              onChange={(e) =>
                setCreateForm({ ...createForm, recipientName: e.target.value })
              }
            />
          </label>
          <label>
            Recipient address
            <input
              required
              value={createForm.recipientAddress}
              onChange={(e) =>
                setCreateForm({ ...createForm, recipientAddress: e.target.value })
              }
            />
          </label>
          <div className="form-actions">
            <Button type="submit">Create Parcel</Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!assignTarget}
        title={`Assign ${assignTarget?.trackingNumber ?? 'Parcel'}`}
        onClose={() => setAssignTarget(null)}
      >
        <div className="form-stack">
          <label>
            Delivery agent
            <select
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
            >
              <option value="">Select an agent</option>
              {agents
                .filter((a) => a.isAvailable)
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.email})
                  </option>
                ))}
            </select>
          </label>
          <div className="form-actions">
            <Button onClick={() => void handleAssign()} disabled={!selectedAgent}>
              Assign Parcel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
