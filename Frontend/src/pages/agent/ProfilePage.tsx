import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { fetchUser, updateAvailability } from '../../api/services';
import { ApiRequestError } from '../../api';
import { Alert, Card, LoadingState, PageHeader } from '../../components/Common';
import { Button } from '../../components/Modal';
import type { User } from '../../types';

export function ProfilePage() {
  const { token, user: authUser } = useAuth();
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !authUser) return;
    void (async () => {
      try {
        setProfile(await fetchUser(token, authUser.id));
      } catch (err) {
        setError(err instanceof ApiRequestError ? err.message : 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    })();
  }, [token, authUser]);

  const toggleAvailability = async () => {
    if (!token || !profile) return;
    try {
      const updated = await updateAvailability(token, profile.id, !profile.isAvailable);
      setProfile(updated);
      setSuccess(`You are now marked as ${updated.isAvailable ? 'available' : 'unavailable'}.`);
    } catch (err) {
      setError(
        err instanceof ApiRequestError ? err.message : 'Failed to update availability',
      );
    }
  };

  if (loading) return <LoadingState />;

  return (
    <div>
      <PageHeader title="My Profile" subtitle="Manage your agent account settings." />
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      {success && (
        <Alert type="success" message={success} onClose={() => setSuccess(null)} />
      )}

      <Card>
        {profile && (
          <dl className="detail-list">
            <div>
              <dt>Name</dt>
              <dd>{profile.name}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{profile.email}</dd>
            </div>
            <div>
              <dt>Role</dt>
              <dd>{profile.role.replace('_', ' ')}</dd>
            </div>
            <div>
              <dt>Availability</dt>
              <dd>
                <span
                  className={`availability ${profile.isAvailable ? 'available' : 'unavailable'}`}
                >
                  {profile.isAvailable ? 'Available for assignments' : 'Unavailable'}
                </span>
              </dd>
            </div>
          </dl>
        )}

        <div className="action-bar">
          <Button onClick={() => void toggleAvailability()}>
            {profile?.isAvailable ? 'Go Unavailable' : 'Go Available'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
