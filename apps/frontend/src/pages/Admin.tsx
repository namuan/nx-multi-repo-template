import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, Pause } from 'lucide-react';
import { Layout } from '../components/Layout';
import { tenant as tenantApi, type Tenant } from '../lib/api';
import { formatDistanceToNow } from 'date-fns';

const PLAN_BADGE: Record<string, string> = {
  free: 'var(--text-muted)', pro: 'var(--brand)', enterprise: 'var(--success)',
};

export default function Admin() {
  const qc = useQueryClient();

  const { data: tenantsPage, isLoading } = useQuery({
    queryKey: ['admin-tenants'],
    queryFn: () => tenantApi.allTenants().then(r => r.data),
  });

  const suspendMutation = useMutation({
    mutationFn: (id: string) => tenantApi.suspend(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-tenants'] }),
  });

  const tenants = tenantsPage?.content ?? [];

  return (
    <Layout title="Platform Admin">
      <div className="page-header">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Shield size={20} color="var(--info)" /> Platform Admin Portal
        </h2>
      </div>

      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(99,102,241,0.15)' }}>
            <Shield size={22} color="var(--info)" />
          </div>
          <div>
            <div className="stat-value">{tenantsPage?.totalElements ?? 0}</div>
            <div className="stat-label">Total tenants</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.15)' }}>
            <Shield size={22} color="var(--success)" />
          </div>
          <div>
            <div className="stat-value">{tenants.filter(t => t.status === 'active').length}</div>
            <div className="stat-label">Active tenants</div>
          </div>
        </div>
      </div>

      {isLoading ? <div className="spinner" /> : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Tenant</th>
                <th>Subdomain</th>
                <th>Plan</th>
                <th>Status</th>
                <th>Max devices</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((t: Tenant) => (
                <tr key={t.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 6,
                        background: t.primaryColor,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0,
                      }}>
                        {t.name.slice(0, 2).toUpperCase()}
                      </div>
                      <span style={{ fontWeight: 500 }}>{t.name}</span>
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{t.subdomain}</td>
                  <td>
                    <span style={{ color: PLAN_BADGE[t.plan] ?? 'inherit', fontWeight: 600, fontSize: 12 }}>
                      {t.plan.toUpperCase()}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${t.status === 'active' ? 'badge-online' : 'badge-offline'}`}>
                      {t.status}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>{t.maxDevices}</td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                    {formatDistanceToNow(new Date(t.createdAt), { addSuffix: true })}
                  </td>
                  <td>
                    {t.status === 'active' && (
                      <button
                        className="btn btn-ghost"
                        style={{ padding: '4px 8px', color: 'var(--warning)', fontSize: 12 }}
                        onClick={() => { if (confirm(`Suspend ${t.name}?`)) suspendMutation.mutate(t.id); }}>
                        <Pause size={13} /> Suspend
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {tenants.length === 0 && <div className="empty-state">No tenants found</div>}
        </div>
      )}
    </Layout>
  );
}
