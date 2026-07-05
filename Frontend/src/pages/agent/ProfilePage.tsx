import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  fetchCompanies,
  fetchUser,
  reportMyIncident,
  switchCompany,
  updateAvailability,
} from '../../api/services';
import { ApiRequestError } from '../../api';
import { Alert, Card, LoadingState, PageHeader } from '../../components/Common';
import { Button, Modal } from '../../components/Modal';
import type { Company, User } from '../../types';

export function ProfilePage() {
  const { token, user: authUser, logout } = useAuth();
  const [profile, setProfile] = useState<User | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showSwitch, setShowSwitch] = useState(false);
  const [showIncident, setShowIncident] = useState(false);
  const [targetJoinCode, setTargetJoinCode] = useState('');
  const [incidentReason, setIncidentReason] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token || !authUser) return;
    void (async () => {
      try {
        const [profileData, companyData] = await Promise.all([
          fetchUser(token, authUser.id),
          fetchCompanies(token),
        ]);
        setProfile(profileData);
        setCompanies(companyData);
      } catch (err) {
        setError(
          err instanceof ApiRequestError ? err.message : 'Failed to load profile',
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [token, authUser]);

  const currentCompany = companies.find((c) => c.id === profile?.companyId);
  const otherCompanies = companies.filter((c) => c.id !== profile?.companyId);

  const toggleAvailability = async () => {
    if (!token || !profile) return;
    try {
      const updated = await updateAvailability(
        token,
        profile.id,
        !profile.isAvailable,
      );
      setProfile(updated);
      setSuccess(
        `You are now marked as ${updated.isAvailable ? 'available' : 'unavailable'}.`,
      );
    } catch (err) {
      setError(
        err instanceof ApiRequestError
          ? err.message
          : 'Failed to update availability',
      );
    }
  };

  const handleSwitch = async () => {
    if (!token || !targetJoinCode) return;
    setBusy(true);
    setError(null);
    try {
      const result = await switchCompany(token, targetJoinCode);
      const moved = result.previousCompanyReassignment.reassignments.length;
      const unassigned = result.previousCompanyReassignment.unassigned.length;
      setShowSwitch(false);
      setSuccess(
        `Company switched. ${moved} parcel(s) reassigned, ${unassigned} left for manual handling. Please sign in again to refresh your session.`,
      );
      setTimeout(() => logout(), 2500);
    } catch (err) {
      setError(
        err instanceof ApiRequestError ? err.message : 'Failed to switch company',
      );
    } finally {
      setBusy(false);
    }
  };

  const handleIncident = async () => {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      const result = await reportMyIncident(token, incidentReason || undefined);
      setShowIncident(false);
      setIncidentReason('');
      setSuccess(
        `Incident reported. ${result.reassignments.length} parcel(s) reassigned, ${result.unassigned.length} awaiting manual assignment. You are now unavailable.`,
      );
      if (profile) setProfile({ ...profile, isAvailable: false });
    } catch (err) {
      setError(
        err instanceof ApiRequestError ? err.message : 'Failed to report incident',
      );
    } finally {
      setBusy(false);
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
              <dt>Company</dt>
              <dd>{currentCompany?.name ?? '—'}</dd>
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
                  {profile.isAvailable
                    ? 'Available for assignments'
                    : 'Unavailable'}
                </span>
              </dd>
            </div>
          </dl>
        )}

        <div className="action-bar">
          <Button onClick={() => void toggleAvailability()}>
            {profile?.isAvailable ? 'Go Unavailable' : 'Go Available'}
          </Button>
          <Button variant="secondary" onClick={() => setShowSwitch(true)}>
            Switch company
          </Button>
          <Button variant="danger" onClick={() => setShowIncident(true)}>
            Report incident
          </Button>
        </div>
      </Card>

      <Modal
        open={showSwitch}
        title="Switch delivery company"
        onClose={() => setShowSwitch(false)}
      >
        <div className="form-stack">
          <p className="muted">
            Your active parcels in {currentCompany?.name ?? 'your current company'}{' '}
            will be auto-reassigned to teammates before you move.
          </p>
          <label>
            Target company
            <select
              value={targetJoinCode}
              onChange={(e) => setTargetJoinCode(e.target.value)}
            >
              <option value="">Select a company</option>
              {otherCompanies.map((c) => (
                <option key={c.id} value={c.joinCode}>
                  {c.name} ({c.joinCode})
                </option>
              ))}
            </select>
          </label>
          <div className="form-actions">
            <Button
              onClick={() => void handleSwitch()}
              disabled={!targetJoinCode || busy}
            >
              {busy ? 'Switching…' : 'Confirm switch'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={showIncident}
        title="Report an incident"
        onClose={() => setShowIncident(false)}
      >
        <div className="form-stack">
          <p className="muted">
            This marks you unavailable and auto-reassigns your active parcels to
            the teammate with the smallest queue. Your admin will be notified.
          </p>
          <label>
            Reason (optional)
            <input
              value={incidentReason}
              onChange={(e) => setIncidentReason(e.target.value)}
              placeholder="e.g. Vehicle breakdown"
            />
          </label>
          <div className="form-actions">
            <Button variant="danger" onClick={() => void handleIncident()} disabled={busy}>
              {busy ? 'Reporting…' : 'Report incident'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
