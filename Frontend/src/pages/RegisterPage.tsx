import { type FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerCompany } from '../api/services';
import { ApiRequestError } from '../api';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/Modal';

export function RegisterPage() {
  const { applySession } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    companyName: '',
    name: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await registerCompany(form);
      applySession(result.user, result.accessToken);
      navigate('/');
    } catch (err) {
      setError(
        err instanceof ApiRequestError ? err.message : 'Registration failed',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-card__brand">
          <span className="logo-mark">SD</span>
          <div>
            <h1>Start on Swiftdrop</h1>
            <p>Create your delivery company workspace</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <label>
            Company name
            <input
              value={form.companyName}
              onChange={(e) => setForm({ ...form, companyName: e.target.value })}
              required
              placeholder="Acme Delivery"
            />
          </label>
          <label>
            Your name
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              placeholder="Alice Admin"
            />
          </label>
          <label>
            Email
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              autoComplete="email"
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              minLength={6}
              autoComplete="new-password"
              placeholder="Minimum 6 characters"
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <Button type="submit" disabled={loading}>
            {loading ? 'Creating…' : 'Create company & admin'}
          </Button>
        </form>

        <div className="demo-users">
          <p>
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
