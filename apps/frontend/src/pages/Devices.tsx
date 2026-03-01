import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Eye, Copy, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { devices as deviceApi, type Device } from '../lib/api';
import { formatDistanceToNow } from 'date-fns';

const DEVICE_TYPES = ['truck', 'van', 'motorcycle', 'car', 'drone'];

function CreateDeviceModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: '', type: 'truck', driverName: '', licensePlate: '', vin: '' });
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: () => deviceApi.create(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['devices'] }); onClose(); },
    onError: (e: any) => setError(e.response?.data?.message ?? 'Failed to create device'),
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">Add new device</div>
        <div className="form-group">
          <label className="form-label">Device name</label>
          <input value={form.name} onChange={set('name')} placeholder="Truck Alpha-7" required />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Type</label>
            <select value={form.type} onChange={set('type')}>
              {DEVICE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Licence plate</label>
            <input value={form.licensePlate} onChange={set('licensePlate')} placeholder="CA-XXX-000" />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Driver name</label>
            <input value={form.driverName} onChange={set('driverName')} placeholder="Jane Smith" />
          </div>
          <div className="form-group">
            <label className="form-label">VIN</label>
            <input value={form.vin} onChange={set('vin')} placeholder="1HGCM..." />
          </div>
        </div>
        {error && <div className="form-error" style={{ marginBottom: 12 }}>{error}</div>}
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.name}>
            {mutation.isPending ? 'Creating…' : 'Create device'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ApiKeyCell({ apiKey }: { apiKey: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <code style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-elevated)', padding: '2px 6px', borderRadius: 4 }}>
        {apiKey.slice(0, 12)}…
      </code>
      <button className="btn-ghost" style={{ padding: '2px 4px', border: 'none' }} onClick={copy}>
        {copied ? <Check size={13} color="var(--success)" /> : <Copy size={13} />}
      </button>
    </div>
  );
}

export default function Devices() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);

  const { data: deviceList = [], isLoading } = useQuery({
    queryKey: ['devices'],
    queryFn: () => deviceApi.list().then(r => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deviceApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['devices'] }),
  });

  return (
    <Layout title="Devices">
      {showCreate && <CreateDeviceModal onClose={() => setShowCreate(false)} />}

      <div className="page-header">
        <h2>Fleet Devices <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: 14 }}>({deviceList.length})</span></h2>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={15} /> Add device
        </button>
      </div>

      {isLoading ? <div className="spinner" /> : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Status</th>
                <th>Driver</th>
                <th>Speed</th>
                <th>Last seen</th>
                <th>API Key</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {deviceList.map((d: Device) => (
                <tr key={d.id}>
                  <td>
                    <button className="btn-ghost" style={{ padding: 0, border: 'none', fontWeight: 600 }}
                      onClick={() => navigate(`/devices/${d.id}`)}>
                      {d.name}
                    </button>
                  </td>
                  <td style={{ color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{d.type}</td>
                  <td><span className={`badge badge-${d.status}`}>{d.status}</span></td>
                  <td style={{ color: 'var(--text-secondary)' }}>{d.driverName ?? '—'}</td>
                  <td>{d.lastSpeed != null ? `${d.lastSpeed.toFixed(1)} km/h` : '—'}</td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                    {d.lastSeen ? formatDistanceToNow(new Date(d.lastSeen), { addSuffix: true }) : '—'}
                  </td>
                  <td><ApiKeyCell apiKey={d.apiKey} /></td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-ghost" style={{ padding: '4px 8px' }}
                        onClick={() => navigate(`/devices/${d.id}`)}>
                        <Eye size={14} />
                      </button>
                      <button className="btn btn-ghost" style={{ padding: '4px 8px', color: 'var(--danger)' }}
                        onClick={() => { if (confirm(`Delete ${d.name}?`)) deleteMutation.mutate(d.id); }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {deviceList.length === 0 && (
            <div className="empty-state">
              <p>No devices yet.</p>
              <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setShowCreate(true)}>
                <Plus size={15} /> Add your first device
              </button>
            </div>
          )}
        </div>
      )}
    </Layout>
  );
}
