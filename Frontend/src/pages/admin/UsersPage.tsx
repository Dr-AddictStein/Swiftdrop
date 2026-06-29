import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { fetchUsers, updateAvailability } from '../../api/services';
import { ApiRequestError } from '../../api';
import {
  Alert,
  Card,
  EmptyState,
  LoadingState,
  PageHeader,
} from '../../components/Common';
import { Button } from '../../components/Modal';
import type { User } from '../../types';

export function UsersPage() {
  const { token } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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

  return (
    <div>
      <PageHeader
        title="Users"
        subtitle="Manage admin and delivery agent accounts."
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
                  <td>
                    {u.role === 'DELIVERY_AGENT' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => void toggleAvailability(u)}
                      >
                        Toggle availability
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
