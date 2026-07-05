import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  createPlatformAgent,
  fetchPlatformCompanies,
  fetchPlatformUsers,
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
import type { PlatformCompany, PlatformUser } from '../../types';

const EMPTY_FORM = {
  companyId: '',
  name: '',
  email: '',
  password: '',
};

export function PlatformUsersPage() {
  const { token } = useAuth();
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [companies, setCompanies] = useState<PlatformCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [userData, companyData] = await Promise.all([
        fetchPlatformUsers(token),
        fetchPlatformCompanies(token),
      ]);
      setUsers(userData);
      setCompanies(companyData);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    try {
      const agent = await createPlatformAgent(token, form);
      setShowCreate(false);
      setForm(EMPTY_FORM);
      setSuccess(`Delivery agent ${agent.name} created.`);
      await load();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Failed to create agent');
    }
  };

  return (
    <div>
      <PageHeader
        title="All Users"
        subtitle="Admins and delivery agents across every company."
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
                <th>Company</th>
                <th>Availability</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>
                    <span className="role-chip">{u.role.replace(/_/g, ' ')}</span>
                  </td>
                  <td>{u.companyName ?? <span className="muted">—</span>}</td>
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
            Company
            <select
              required
              value={form.companyId}
              onChange={(e) => setForm({ ...form, companyId: e.target.value })}
            >
              <option value="">Select a company</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Full name
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Jane Smith"
            />
          </label>
          <label>
            Email
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </label>
          <label>
            Password
            <input
              type="password"
              required
              minLength={6}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Minimum 6 characters"
              autoComplete="new-password"
            />
          </label>
          <div className="form-actions">
            <Button type="submit" disabled={!form.companyId}>
              Create Agent
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
