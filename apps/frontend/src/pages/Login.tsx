import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth } from '../lib/api';
import { useAuthStore } from '../stores/auth.store';

export default function Login() {
  const navigate = useNavigate();
  const login = useAuthStore(s => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await auth.login(email, password);
      login(res.data);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <h1>FleetPilot</h1>
          <p>IoT Fleet Management Platform</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {error && <div className="form-error" style={{ marginBottom: 12 }}>{error}</div>}

          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}
            type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div style={{ marginTop: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
          New to FleetPilot?{' '}
          <Link to="/register">Create an account</Link>
        </div>

        <div style={{ marginTop: 24, padding: 16, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)' }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>
            Demo credentials
          </div>
          {[
            { label: 'Platform Admin', email: 'admin@fleetpilot.io', password: 'Admin123!' },
            { label: 'Acme Logistics', email: 'alice@acme.com', password: 'Demo123!' },
            { label: 'SwiftFleet',     email: 'diana@swiftfleet.io', password: 'Demo123!' },
          ].map(d => (
            <div key={d.email} style={{ fontSize: 12, marginBottom: 4 }}>
              <strong style={{ color: 'var(--text-secondary)' }}>{d.label}:</strong>{' '}
              <button
                type="button"
                style={{ background: 'none', border: 'none', color: 'var(--brand)', fontSize: 12, padding: 0 }}
                onClick={() => { setEmail(d.email); setPassword(d.password); }}
              >
                {d.email}
              </button>
              {' / '}{d.password}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
