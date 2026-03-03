import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Truck, Wifi, WifiOff, AlertTriangle } from 'lucide-react';
import { Layout } from '../components/Layout';
import { devices as deviceApi, alerts } from '../lib/api';
import { fleetWs, type TelemetryMessage } from '../lib/ws';
import { formatDistanceToNow } from 'date-fns';

export default function Dashboard() {
  const qc = useQueryClient();
  const { data: deviceList = [], error: devicesError } = useQuery({
    queryKey: ['devices'],
    queryFn: () => deviceApi.list().then((r) => r.data),
    refetchInterval: 60_000,
  });

  const { data: unackedAlerts = [], error: alertsError } = useQuery({
    queryKey: ['alerts-unacked'],
    queryFn: () => alerts.unacknowledged().then((r) => r.data),
    refetchInterval: 30_000,
  });

  // Live device positions from WebSocket
  const [livePositions, setLivePositions] = useState<Record<string, TelemetryMessage>>({});

  useEffect(() => {
    const unsub = fleetWs.subscribe((msg) => {
      if (msg.type === 'telemetry') {
        setLivePositions((prev) => ({ ...prev, [msg.device_id]: msg }));
      }
    });
    return unsub;
  }, []);

  // Merge live positions into device list
  const mergedDevices = useMemo(
    () =>
      deviceList.map((d) => {
        const live = livePositions[d.id];
        if (live) {
          return {
            ...d,
            lastLat: live.lat,
            lastLng: live.lng,
            lastSpeed: live.speed,
            status: 'online' as const,
          };
        }
        return d;
      }),
    [deviceList, livePositions]
  );

  const { online, offline } = useMemo(() => {
    let online = 0,
      offline = 0;
    for (const d of mergedDevices) {
      if (d.status === 'online') online++;
      else if (d.status === 'offline') offline++;
    }
    return { online, offline };
  }, [mergedDevices]);

  const loadError = devicesError ?? alertsError;

  return (
    <Layout title="Dashboard">
      {loadError && (
        <div
          className="card"
          style={{
            marginBottom: 16,
            borderLeft: '4px solid var(--danger)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Unable to load dashboard data</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
              The API may still be starting up. Retrying automatically.
            </div>
          </div>
          <button
            className="btn btn-secondary"
            style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
            onClick={() => {
              qc.invalidateQueries({ queryKey: ['devices'] });
              qc.invalidateQueries({ queryKey: ['alerts-unacked'] });
            }}
          >
            Retry now
          </button>
        </div>
      )}

      <div className="stat-grid">
        <div className="stat-card" style={{ borderTopColor: 'var(--brand)' }}>
          <div className="stat-icon" style={{ background: 'rgba(59,130,246,0.1)' }}>
            <Truck size={17} color="var(--brand)" />
          </div>
          <div className="stat-value">{mergedDevices.length}</div>
          <div className="stat-label">Total devices</div>
        </div>

        <div className="stat-card" style={{ borderTopColor: 'var(--success)' }}>
          <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.1)' }}>
            <Wifi size={17} color="var(--success)" />
          </div>
          <div className="stat-value" style={{ color: 'var(--success)' }}>
            {online}
          </div>
          <div className="stat-label">Online</div>
        </div>

        <div className="stat-card" style={{ borderTopColor: 'var(--border-light)' }}>
          <div className="stat-icon" style={{ background: 'rgba(78,104,130,0.15)' }}>
            <WifiOff size={17} color="var(--text-muted)" />
          </div>
          <div className="stat-value" style={{ color: 'var(--text-muted)' }}>
            {offline}
          </div>
          <div className="stat-label">Offline</div>
        </div>

        <div className="stat-card" style={{ borderTopColor: 'var(--danger)' }}>
          <div className="stat-icon" style={{ background: 'rgba(239,68,68,0.1)' }}>
            <AlertTriangle size={17} color="var(--danger)" />
          </div>
          <div className="stat-value" style={{ color: 'var(--danger)' }}>
            {unackedAlerts.length}
          </div>
          <div className="stat-label">Open alerts</div>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <div
          className="card"
          style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
        >
          <div
            style={{
              fontWeight: 600,
              marginBottom: 14,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 13,
            }}
          >
            <AlertTriangle size={15} color="var(--danger)" />
            Open Alerts
            {unackedAlerts.length > 0 && (
              <span
                style={{
                  marginLeft: 'auto',
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '2px 8px',
                  background: 'rgba(239,68,68,0.1)',
                  color: 'var(--danger)',
                  borderRadius: 4,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                {unackedAlerts.length} open
              </span>
            )}
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {unackedAlerts.length === 0 && (
              <div className="empty-state" style={{ padding: '24px 0' }}>
                No open alerts
              </div>
            )}
            {unackedAlerts.slice(0, 10).map((a) => (
              <div key={a.id} className="alert-item">
                <div
                  className="alert-dot"
                  style={{
                    background:
                      a.severity === 'critical'
                        ? 'var(--danger)'
                        : a.severity === 'warning'
                          ? 'var(--warning)'
                          : 'var(--info)',
                  }}
                />
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
