import { type FormEvent, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  createDeliveryAgent,
  fetchUsers,
  reportAgentIncident,
  updateAvailability,
} from '../../api/services';
import { ApiRequestError } from '../../api';
import {
  Alert,
  Card,
  EmptyState,
  LoadingState,
  PageHeader,
} from '../../components/Common';
import { Button, Modal } from '../../components/Modal';
import type { User } from '../../types';

const EMPTY_FORM = {
  name: '',
  email: '',
  password: '',
  isAvailable: true,
};

export function UsersPage() {
  const { token } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_FORM);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    try {
      setUsers(await fetchUsers(token));
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [token]);

  const toggleAvailability = async (user: User) => {
    if (!token || user.role !== 'DELIVERY_AGENT') return;
    try {
      await updateAvailability(token, user.id, !user.isAvailable);
      setSuccess(`${user.name} is now ${user.isAvailable ? 'unavailable' : 'available'}.`);
      await load();
    } catch (err) {
      setError(
        err instanceof ApiRequestError ? err.message : 'Failed to update availability',
      );
    }
  };

  const handleReportIncident = async (user: User) => {
    if (!token || user.role !== 'DELIVERY_AGENT') return;
    const confirmed = window.confirm(
      `Report an incident for ${user.name}? They will be set unavailable and their active parcels auto-reassigned to the teammate with the smallest queue.`,
    );
    if (!confirmed) return;
    try {
      const result = await reportAgentIncident(token, user.id);
      setSuccess(
        `Incident logged for ${user.name}: ${result.reassignments.length} parcel(s) reassigned, ${result.unassigned.length} awaiting manual assignment.`,
      );
      await load();
    } catch (err) {
      setError(
        err instanceof ApiRequestError ? err.message : 'Failed to report incident',
      );
    }
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    try {
      const agent = await createDeliveryAgent(token, createForm);
      setShowCreate(false);
      setCreateForm(EMPTY_FORM);
      setSuccess(`${agent.name} created. They can sign in with ${agent.email}.`);
      await load();
    } catch (err) {
      setError(
        err instanceof ApiRequestError ? err.message : 'Failed to create delivery agent',
      );
    }
  };

  return (
    <div>
      <PageHeader
        title="Users"
        subtitle="Manage admin and delivery agent accounts."
        action={
          <Button onClick={() => setShowCreate(true)}>Add Delivery Agent</Button>
        }
      />
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      {success && (
        <Alert type="success" message={success} onClose={() => setSuccess(null)} />
      )}

      <Card>
        {loading ? (
          <LoadingState />
        ) : users.length === 0 ? (
          <EmptyState message="No users found." />
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Availability</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>
                    <span className="role-chip">{u.role.replace('_', ' ')}</span>
                  </td>
                  <td>
                    {u.role === 'DELIVERY_AGENT' ? (
                      <span
                        className={`availability ${u.isAvailable ? 'available' : 'unavailable'}`}
                      >
                        {u.isAvailable ? 'Available' : 'Unavailable'}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="actions-cell">
                    {u.role === 'DELIVERY_AGENT' && (
                      <>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => void toggleAvailability(u)}
                        >
                          Toggle availability
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => void handleReportIncident(u)}
                        >
                          Report incident
                        </Button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Modal
        open={showCreate}
        title="Add Delivery Agent"
        onClose={() => setShowCreate(false)}
      >
        <form className="form-stack" onSubmit={handleCreate}>
          <label>
            Full name
            <input
              required
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              placeholder="Jane Smith"
            />
          </label>
          <label>
            Email
            <input
              type="email"
              required
              value={createForm.email}
              onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
              placeholder="agent@swiftdrop.com"
            />
          </label>
          <label>
            Password
            <input
              type="password"
              required
              minLength={6}
              value={createForm.password}
              onChange={(e) =>
                setCreateForm({ ...createForm, password: e.target.value })
              }
              placeholder="Minimum 6 characters"
              autoComplete="new-password"
            />
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={createForm.isAvailable}
              onChange={(e) =>
                setCreateForm({ ...createForm, isAvailable: e.target.checked })
              }
            />
            Available for parcel assignments
          </label>
          <div className="form-actions">
            <Button type="submit">Create Agent</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
