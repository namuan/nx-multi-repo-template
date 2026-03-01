import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { ArrowLeft, MapPin, Gauge, Fuel, Thermometer } from 'lucide-react';
import { Layout } from '../components/Layout';
import { devices as deviceApi } from '../lib/api';
import { format } from 'date-fns';

export default function DeviceDetail() {
  const { id } = useParams<{ id: string }>();

  const { data: device, isLoading: loadingDevice } = useQuery({
    queryKey: ['device', id],
    queryFn: () => deviceApi.get(id!).then(r => r.data),
    enabled: !!id,
  });

  const { data: telemetry = [], isLoading: loadingTelemetry } = useQuery({
    queryKey: ['telemetry', id],
    queryFn: () => deviceApi.telemetry(id!).then(r => r.data),
    enabled: !!id,
    refetchInterval: 15_000,
  });

  const chartData = [...telemetry].reverse().map(t => ({
    time: format(new Date(t.recordedAt), 'HH:mm:ss'),
    speed: t.speed,
    fuel: t.fuelLevel,
    temp: t.engineTemp,
  }));

  if (loadingDevice) return <Layout title="Device"><div className="spinner" /></Layout>;
  if (!device) return <Layout title="Device"><div className="empty-state">Device not found</div></Layout>;

  return (
    <Layout title={device.name}>
      <div style={{ marginBottom: 20 }}>
        <Link to="/devices" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', fontSize: 13 }}>
          <ArrowLeft size={14} /> Back to devices
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { icon: <Gauge size={18} color="var(--brand)" />, label: 'Speed', value: `${device.lastSpeed?.toFixed(1) ?? 0} km/h`, bg: 'rgba(59,130,246,0.1)' },
          { icon: <MapPin size={18} color="var(--success)" />, label: 'Status', value: device.status, bg: 'rgba(16,185,129,0.1)' },
          { icon: <Fuel size={18} color="var(--warning)" />, label: 'Location', value: device.lastLat ? `${device.lastLat.toFixed(4)}, ${device.lastLng?.toFixed(4)}` : 'Unknown', bg: 'rgba(245,158,11,0.1)' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-icon" style={{ background: s.bg }}>{s.icon}</div>
            <div>
              <div className="stat-value" style={{ fontSize: 16 }}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16 }}>
        <div className="card">
          <div style={{ fontWeight: 600, marginBottom: 16 }}>Telemetry History (last 100 events)</div>
          {loadingTelemetry ? <div className="spinner" /> : chartData.length === 0 ? (
            <div className="empty-state">No telemetry data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#64748B' }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: '#64748B' }} />
                <Tooltip
                  contentStyle={{ background: '#1E293B', border: '1px solid #334155', borderRadius: 8 }}
                  labelStyle={{ color: '#F1F5F9' }}
                />
                <Legend />
                <Line type="monotone" dataKey="speed" stroke="#3B82F6" name="Speed (km/h)" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="fuel" stroke="#F59E0B" name="Fuel (%)" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="temp" stroke="#EF4444" name="Engine temp (°C)" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card">
          <div style={{ fontWeight: 600, marginBottom: 16 }}>Device info</div>
          {[
            { label: 'ID', value: device.id },
            { label: 'Type', value: device.type },
            { label: 'Driver', value: device.driverName ?? '—' },
            { label: 'Licence plate', value: device.licensePlate ?? '—' },
            { label: 'VIN', value: device.vin ?? '—' },
            { label: 'Status', value: <span className={`badge badge-${device.status}`}>{device.status}</span> },
          ].map(row => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
              <span style={{ color: 'var(--text-muted)' }}>{row.label}</span>
              <span style={{ color: 'var(--text-secondary)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'right' }}>
                {row.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
