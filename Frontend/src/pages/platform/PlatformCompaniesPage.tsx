import { type FormEvent, useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  createPlatformCompany,
  fetchPlatformCompanies,
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
import type { PlatformCompany } from '../../types';

const EMPTY_FORM = {
  companyName: '',
  adminName: '',
  adminEmail: '',
  adminPassword: '',
};

export function PlatformCompaniesPage() {
  const { token } = useAuth();
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
      setCompanies(await fetchPlatformCompanies(token));
    } catch (err) {
      setError(
        err instanceof ApiRequestError ? err.message : 'Failed to load companies',
      );
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
      const result = await createPlatformCompany(token, form);
      setShowCreate(false);
      setForm(EMPTY_FORM);
      setSuccess(
        `Company "${result.company.name}" created with join code ${result.company.joinCode}.`,
      );
      await load();
    } catch (err) {
      setError(
        err instanceof ApiRequestError ? err.message : 'Failed to create company',
      );
    }
  };

  return (
    <div>
      <PageHeader
        title="Companies"
        subtitle="Every delivery company (tenant) on the platform."
        action={<Button onClick={() => setShowCreate(true)}>Create Company</Button>}
      />
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      {success && (
        <Alert type="success" message={success} onClose={() => setSuccess(null)} />
      )}

      <Card>
        {loading ? (
          <LoadingState />
        ) : companies.length === 0 ? (
          <EmptyState message="No companies yet. Create the first one." />
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Company</th>
                <th>Join Code</th>
                <th>Owner Admin</th>
                <th>Agents</th>
                <th>Parcels</th>
                <th>Delivered</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>
                    <span className="role-chip">{c.joinCode}</span>
                  </td>
                  <td>
                    {c.ownerName ? (
                      <div className="agent-info">
                        <strong>{c.ownerName}</strong>
                        <span className="muted">{c.ownerEmail}</span>
                      </div>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td>{c.agentCount}</td>
                  <td>{c.parcelCount}</td>
                  <td>{c.deliveredCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Modal
        open={showCreate}
        title="Create Company"
        onClose={() => setShowCreate(false)}
      >
        <form className="form-stack" onSubmit={handleCreate}>
          <label>
            Company name
            <input
              required
              value={form.companyName}
              onChange={(e) => setForm({ ...form, companyName: e.target.value })}
              placeholder="Acme Delivery"
            />
          </label>
          <label>
            Owner admin name
            <input
              required
              value={form.adminName}
              onChange={(e) => setForm({ ...form, adminName: e.target.value })}
              placeholder="Alice Admin"
            />
          </label>
          <label>
            Owner admin email
            <input
              type="email"
              required
              value={form.adminEmail}
              onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
            />
          </label>
          <label>
            Owner admin password
            <input
              type="password"
              required
              minLength={6}
              value={form.adminPassword}
              onChange={(e) =>
                setForm({ ...form, adminPassword: e.target.value })
              }
              placeholder="Minimum 6 characters"
              autoComplete="new-password"
            />
          </label>
          <div className="form-actions">
            <Button type="submit">Create Company</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
