import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, Bell, Filter } from 'lucide-react';
import { Layout } from '../components/Layout';
import { alerts as alertApi, type Alert, type AlertRule } from '../lib/api';
import { formatDistanceToNow } from 'date-fns';

const SEV_COLOR: Record<string, string> = {
  critical: 'var(--danger)', warning: 'var(--warning)', info: 'var(--info)',
};

function CreateRuleModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: '', type: 'speed', threshold: '', severity: 'warning' });
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () => alertApi.createRule({
      ...form,
      threshold: form.threshold ? Number(form.threshold) : undefined,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['alert-rules'] }); onClose(); },
    onError: (e: any) => setError(e.response?.data?.message ?? 'Failed'),
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">Create alert rule</div>
        <div className="form-group">
          <label className="form-label">Rule name</label>
          <input value={form.name} onChange={set('name')} placeholder="Speed limit 80 km/h" required />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Type</label>
            <select value={form.type} onChange={set('type')}>
              {['speed', 'idle', 'offline', 'fuel_low'].map(t => (
                <option key={t} value={t}>{t.replace('_', ' ')}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Threshold</label>
            <input type="number" value={form.threshold} onChange={set('threshold')} placeholder="80" />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Severity</label>
          <select value={form.severity} onChange={set('severity')}>
            {['info', 'warning', 'critical'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        {error && <div className="form-error" style={{ marginBottom: 12 }}>{error}</div>}
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.name}>
            {mutation.isPending ? 'Creating…' : 'Create rule'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Alerts() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'alerts' | 'rules'>('alerts');
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unacked'>('unacked');

  const { data: alertPage } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => alertApi.list(0, 50).then(r => r.data),
    refetchInterval: 15_000,
  });

  const { data: rules = [] } = useQuery({
    queryKey: ['alert-rules'],
    queryFn: () => alertApi.rules().then(r => r.data),
  });

  const ackMutation = useMutation({
    mutationFn: (id: string) => alertApi.acknowledge(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alerts'] });
      qc.invalidateQueries({ queryKey: ['alert-count'] });
      qc.invalidateQueries({ queryKey: ['alerts-unacked'] });
    },
  });

  const toggleRuleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => alertApi.toggleRule(id, active),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alert-rules'] }),
  });

  const alertList = alertPage?.content ?? [];
  const filtered = filter === 'unacked' ? alertList.filter(a => !a.acknowledged) : alertList;

  return (
    <Layout title="Alerts">
      {showCreate && <CreateRuleModal onClose={() => setShowCreate(false)} />}

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {(['alerts', 'rules'] as const).map(t => (
          <button key={t} className={`btn ${tab === t ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setTab(t)} style={{ textTransform: 'capitalize' }}>
            {t === 'alerts' ? <Bell size={14} /> : <Filter size={14} />}
            {t}
          </button>
        ))}
      </div>

      {tab === 'alerts' && (
        <>
          <div className="page-header">
            <div style={{ display: 'flex', gap: 8 }}>
              <button className={`btn ${filter === 'unacked' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setFilter('unacked')}>Open</button>
              <button className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setFilter('all')}>All</button>
            </div>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr><th>Severity</th><th>Message</th><th>Type</th><th>Time</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {filtered.map((a: Alert) => (
                  <tr key={a.id}>
                    <td><span className={`badge badge-${a.severity}`}>{a.severity}</span></td>
                    <td>{a.message}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{a.type}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                      {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}
                    </td>
                    <td>
                      {a.acknowledged
                        ? <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Acknowledged</span>
                        : <span className="badge badge-warning">Open</span>}
                    </td>
                    <td>
                      {!a.acknowledged && (
                        <button className="btn btn-ghost" style={{ padding: '4px 8px', color: 'var(--success)' }}
                          onClick={() => ackMutation.mutate(a.id)}>
                          <CheckCircle size={14} /> Ack
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && <div className="empty-state">No alerts</div>}
          </div>
        </>
      )}

      {tab === 'rules' && (
        <>
          <div className="page-header">
            <h2>Alert Rules</h2>
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
              + New rule
            </button>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr><th>Name</th><th>Type</th><th>Threshold</th><th>Severity</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {rules.map((r: AlertRule) => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 500 }}>{r.name}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{r.type.replace('_', ' ')}</td>
                    <td>{r.threshold != null ? r.threshold : '—'}</td>
                    <td><span className={`badge badge-${r.severity}`}>{r.severity}</span></td>
                    <td>
                      <button
                        className={`btn ${r.active ? 'btn-secondary' : 'btn-ghost'}`}
                        style={{ padding: '4px 10px', fontSize: 12 }}
                        onClick={() => toggleRuleMutation.mutate({ id: r.id, active: !r.active })}>
                        {r.active ? 'Active' : 'Disabled'}
                      </button>
                    </td>
                    <td>
                      <button className="btn btn-ghost" style={{ padding: '4px 8px', color: 'var(--danger)' }}
                        onClick={() => alertApi.deleteRule(r.id).then(() => qc.invalidateQueries({ queryKey: ['alert-rules'] }))}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rules.length === 0 && <div className="empty-state">No alert rules configured</div>}
          </div>
        </>
      )}
    </Layout>
  );
}
