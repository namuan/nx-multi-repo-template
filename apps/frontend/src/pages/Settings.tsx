import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, Users, Key, Palette } from 'lucide-react';
import { Layout } from '../components/Layout';
import { tenant as tenantApi } from '../lib/api';
import { useAuthStore } from '../stores/auth.store';
import { formatDistanceToNow } from 'date-fns';

export default function Settings() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const [tab, setTab] = useState<'branding' | 'team' | 'audit'>('branding');

  const { data: profile, isLoading } = useQuery({
    queryKey: ['tenant-me'],
    queryFn: () => tenantApi.me().then((r) => r.data),
  });

  const { data: auditLogs } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => tenantApi.auditLogs().then((r) => r.data),
    enabled: tab === 'audit',
  });

  const [brandForm, setBrandForm] = useState<{
    name: string;
    primaryColor: string;
    logoUrl: string;
  } | null>(null);
  const form = brandForm ?? {
    name: profile?.tenant.name ?? '',
    primaryColor: profile?.tenant.primaryColor ?? '#3B82F6',
    logoUrl: profile?.tenant.logoUrl ?? '',
  };

  const updateMutation = useMutation({
    mutationFn: () => tenantApi.update(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tenant-me'] });
      setBrandForm(null);
    },
  });

  if (isLoading)
    return (
      <Layout title="Settings">
        <div className="spinner" />
      </Layout>
    );

  return (
    <Layout title="Settings">
      <div style={{ maxWidth: 720 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {[
            { id: 'branding', icon: <Palette size={14} />, label: 'Branding' },
            { id: 'team', icon: <Users size={14} />, label: 'Team' },
            { id: 'audit', icon: <Key size={14} />, label: 'Audit log' },
          ].map((t) => (
            <button
              key={t.id}
              className={`btn ${tab === t.id ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setTab(t.id as typeof tab)}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {tab === 'branding' && (
          <div className="card">
            <div style={{ fontWeight: 600, marginBottom: 20 }}>Tenant branding</div>

            <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 24 }}>
              <div
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: 12,
                  background: form.primaryColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                  fontWeight: 800,
                  color: '#fff',
                }}
              >
                {profile?.tenant.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 600 }}>{profile?.tenant.name}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                  {profile?.stats.deviceCount} devices · {profile?.stats.userCount} users ·{' '}
                  {profile?.tenant.plan} plan
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Company name</label>
              <input
                value={form.name}
                onChange={(e) => setBrandForm((f) => ({ ...(f ?? form), name: e.target.value }))}
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Brand colour</label>
                <input
                  type="color"
                  value={form.primaryColor}
                  onChange={(e) =>
                    setBrandForm((f) => ({ ...(f ?? form), primaryColor: e.target.value }))
                  }
                  style={{ height: 40, padding: 4 }}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Logo URL</label>
                <input
                  value={form.logoUrl}
                  onChange={(e) =>
                    setBrandForm((f) => ({ ...(f ?? form), logoUrl: e.target.value }))
                  }
                  placeholder="https://…/logo.png"
                />
              </div>
            </div>

            <button
              className="btn btn-primary"
              onClick={() => updateMutation.mutate()}
              disabled={updateMutation.isPending}
            >
              <Save size={14} /> {updateMutation.isPending ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        )}

        {tab === 'team' && <TeamTab />}

        {tab === 'audit' && (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Actor</th>
                  <th>Resource</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {(auditLogs?.content ?? []).map((log: any) => (
                  <tr key={log.id}>
                    <td>
                      <code style={{ fontSize: 12 }}>{log.action}</code>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      {log.actorEmail ?? '—'}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {log.resourceType} {log.resourceId?.slice(0, 8)}…
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!auditLogs?.content?.length && <div className="empty-state">No audit logs yet</div>}
          </div>
        )}
      </div>
    </Layout>
  );
}

function TeamTab() {
  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => tenantApi.users().then((r) => r.data),
  });

  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Last login</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u: any) => (
            <tr key={u.id}>
              <td style={{ fontWeight: 500 }}>{u.fullName}</td>
              <td style={{ color: 'var(--text-secondary)' }}>{u.email}</td>
              <td>
                <span className="badge badge-info" style={{ textTransform: 'capitalize' }}>
                  {u.role}
                </span>
              </td>
              <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {u.lastLogin
                  ? formatDistanceToNow(new Date(u.lastLogin), { addSuffix: true })
                  : 'Never'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
