import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MapContainer, TileLayer, Circle, Popup, useMapEvents } from 'react-leaflet';
import { Plus, Trash2 } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import { Layout } from '../components/Layout';
import { geofences as geofenceApi, type Geofence } from '../lib/api';

function MapClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onClick(e.latlng.lat, e.latlng.lng) });
  return null;
}

function CreateGeofenceModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: '', centerLat: 0, centerLng: 0, radiusM: 500, color: '#EF4444' });
  const [error, setError] = useState('');
  const [picking, setPicking] = useState(false);

  const mutation = useMutation({
    mutationFn: () => geofenceApi.create(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['geofences'] }); onClose(); },
    onError: (e: any) => setError(e.response?.data?.message ?? 'Failed'),
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: k === 'name' || k === 'color' ? e.target.value : Number(e.target.value) }));

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 520 }}>
        <div className="modal-title">Create geofence</div>
        <div className="form-group">
          <label className="form-label">Name</label>
          <input value={form.name} onChange={set('name')} placeholder="Restricted Zone A" required />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Latitude</label>
            <input type="number" step="0.0001" value={form.centerLat} onChange={set('centerLat')} />
          </div>
          <div className="form-group">
            <label className="form-label">Longitude</label>
            <input type="number" step="0.0001" value={form.centerLng} onChange={set('centerLng')} />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Radius (m)</label>
            <input type="number" value={form.radiusM} onChange={set('radiusM')} min={50} max={50000} />
          </div>
          <div className="form-group">
            <label className="form-label">Colour</label>
            <input type="color" value={form.color} onChange={set('color')} style={{ height: 40, padding: 4 }} />
          </div>
        </div>
        {error && <div className="form-error" style={{ marginBottom: 12 }}>{error}</div>}
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.name}>
            {mutation.isPending ? 'Creating…' : 'Create geofence'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Geofences() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);

  const { data: geofenceList = [] } = useQuery({
    queryKey: ['geofences'],
    queryFn: () => geofenceApi.list().then(r => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => geofenceApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['geofences'] }),
  });

  const centerLat = geofenceList[0]?.centerLat ?? 37.7749;
  const centerLng = geofenceList[0]?.centerLng ?? -122.4194;

  return (
    <Layout title="Geofences">
      {showCreate && <CreateGeofenceModal onClose={() => setShowCreate(false)} />}

      <div className="page-header">
        <h2>Geofences <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: 14 }}>({geofenceList.length})</span></h2>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={15} /> New geofence
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16 }}>
        <div className="map-panel" style={{ height: 520 }}>
          <MapContainer center={[centerLat, centerLng]} zoom={12} style={{ height: '100%' }}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap contributors'
            />
            {geofenceList.map(gf => (
              <Circle
                key={gf.id}
                center={[gf.centerLat, gf.centerLng]}
                radius={gf.radiusM}
                pathOptions={{ color: gf.color, fillColor: gf.color, fillOpacity: 0.15, weight: 2 }}
              >
                <Popup>{gf.name} — {gf.radiusM}m radius</Popup>
              </Circle>
            ))}
          </MapContainer>
        </div>

        <div className="table-wrapper" style={{ overflow: 'auto' }}>
          <table>
            <thead>
              <tr><th>Name</th><th>Radius</th><th></th></tr>
            </thead>
            <tbody>
              {geofenceList.map((gf: Geofence) => (
                <tr key={gf.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 12, height: 12, borderRadius: '50%', background: gf.color, flexShrink: 0 }} />
                      <span style={{ fontWeight: 500 }}>{gf.name}</span>
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{gf.radiusM}m</td>
                  <td>
                    <button className="btn btn-ghost" style={{ padding: '4px 6px', color: 'var(--danger)' }}
                      onClick={() => { if (confirm(`Delete ${gf.name}?`)) deleteMutation.mutate(gf.id); }}>
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {geofenceList.length === 0 && <div className="empty-state" style={{ padding: '24px 0' }}>No geofences</div>}
        </div>
      </div>
    </Layout>
  );
}
