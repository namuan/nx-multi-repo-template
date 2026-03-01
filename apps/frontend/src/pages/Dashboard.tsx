import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Truck, Wifi, WifiOff, AlertTriangle } from 'lucide-react';
import { Layout } from '../components/Layout';
import { devices as deviceApi, alerts } from '../lib/api';
import { fleetWs, type TelemetryMessage } from '../lib/ws';
import { formatDistanceToNow } from 'date-fns';

export default function Dashboard() {
  const { data: deviceList = [] } = useQuery({
    queryKey: ['devices'],
    queryFn: () => deviceApi.list().then(r => r.data),
    refetchInterval: 60_000,
  });

  const { data: unackedAlerts = [] } = useQuery({
    queryKey: ['alerts-unacked'],
    queryFn: () => alerts.unacknowledged().then(r => r.data),
    refetchInterval: 30_000,
  });

  // Live device positions from WebSocket
  const [livePositions, setLivePositions] = useState<Record<string, TelemetryMessage>>({});

  useEffect(() => {
    const unsub = fleetWs.subscribe((msg) => {
      if (msg.type === 'telemetry') {
        setLivePositions(prev => ({ ...prev, [msg.device_id]: msg }));
      }
    });
    return unsub;
  }, []);

  // Merge live positions into device list
  const mergedDevices = deviceList.map(d => {
    const live = livePositions[d.id];
    if (live) {
      return { ...d, lastLat: live.lat, lastLng: live.lng, lastSpeed: live.speed, status: 'online' as const };
    }
    return d;
  });

  const online  = mergedDevices.filter(d => d.status === 'online').length;
  const offline = mergedDevices.filter(d => d.status === 'offline').length;

  return (
    <Layout title="Dashboard">
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(59,130,246,0.15)' }}>
            <Truck size={22} color="var(--brand)" />
          </div>
          <div>
            <div className="stat-value">{mergedDevices.length}</div>
            <div className="stat-label">Total devices</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.15)' }}>
            <Wifi size={22} color="var(--success)" />
          </div>
          <div>
            <div className="stat-value" style={{ color: 'var(--success)' }}>{online}</div>
            <div className="stat-label">Online</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(100,116,139,0.15)' }}>
            <WifiOff size={22} color="var(--text-muted)" />
          </div>
          <div>
            <div className="stat-value" style={{ color: 'var(--text-muted)' }}>{offline}</div>
            <div className="stat-label">Offline</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(239,68,68,0.15)' }}>
            <AlertTriangle size={22} color="var(--danger)" />
          </div>
          <div>
            <div className="stat-value" style={{ color: 'var(--danger)' }}>{unackedAlerts.length}</div>
            <div className="stat-label">Open alerts</div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <div className="card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={16} color="var(--danger)" />
            Open Alerts
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {unackedAlerts.length === 0 && (
              <div className="empty-state" style={{ padding: '24px 0' }}>No open alerts</div>
            )}
            {unackedAlerts.slice(0, 10).map(a => (
              <div key={a.id} className="alert-item">
                <div className="alert-dot" style={{
                  background: a.severity === 'critical' ? 'var(--danger)'
                    : a.severity === 'warning' ? 'var(--warning)' : 'var(--info)'
                }} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>{a.message}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
