import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth } from '../lib/api';
import { useAuthStore } from '../stores/auth.store';

export default function Register() {
  const navigate = useNavigate();
  const login = useAuthStore(s => s.login);
  const [form, setForm] = useState({
    tenantName: '', subdomain: '', adminEmail: '',
    adminPassword: '', adminName: '', primaryColor: '#3B82F6',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await auth.register(form);
      login(res.data);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: 520 }}>
        <div className="auth-logo">
          <h1>FleetPilot</h1>
          <p>Create your fleet account</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Company name</label>
              <input value={form.tenantName} onChange={set('tenantName')} placeholder="Acme Logistics" required />
            </div>
            <div className="form-group">
              <label className="form-label">Subdomain</label>
              <input value={form.subdomain} onChange={set('subdomain')} placeholder="acme" pattern="^[a-z0-9-]+$" required />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Your name</label>
            <input value={form.adminName} onChange={set('adminName')} placeholder="Jane Smith" required />
          </div>

          <div className="form-group">
            <label className="form-label">Email</label>
            <input type="email" value={form.adminEmail} onChange={set('adminEmail')} placeholder="jane@company.com" required />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Password</label>
              <input type="password" value={form.adminPassword} onChange={set('adminPassword')} placeholder="8+ characters" required minLength={8} />
            </div>
            <div className="form-group">
              <label className="form-label">Brand colour</label>
              <input type="color" value={form.primaryColor} onChange={set('primaryColor')} style={{ height: 40, padding: 4 }} />
            </div>
          </div>

          {error && <div className="form-error" style={{ marginBottom: 12 }}>{error}</div>}

          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}
            type="submit" disabled={loading}>
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <div style={{ marginTop: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
