import { type FormEvent, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/Modal';

const DEMO_USERS = [
  { email: 'admin@swiftdrop.com', label: 'Admin', password: 'password123' },
  { email: 'agent@swiftdrop.com', label: 'Agent', password: 'password123' },
];

export function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('admin@swiftdrop.com');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
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
            <h1>Swiftdrop</h1>
            <p>Last-mile delivery management</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <Button type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>

        <div className="demo-users">
          <p>Demo accounts:</p>
          <div className="demo-users__buttons">
            {DEMO_USERS.map((u) => (
              <button
                key={u.email}
                type="button"
                className="demo-chip"
                onClick={() => {
                  setEmail(u.email);
                  setPassword(u.password);
                }}
              >
                {u.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
