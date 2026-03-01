import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapContainer, TileLayer, Circle, Popup } from 'react-leaflet';
import { Truck, Wifi, WifiOff, AlertTriangle, MapPin } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import { Layout } from '../components/Layout';
import { devices as deviceApi, alerts, geofences } from '../lib/api';
import type { Device, Geofence } from '../lib/api';
import { fleetWs, type TelemetryMessage } from '../lib/ws';
import { formatDistanceToNow } from 'date-fns';

const DEVICE_EMOJI: Record<string, string> = {
  truck: '🚛', van: '🚐', motorcycle: '🏍', car: '🚗', drone: '🚁',
};

function DeviceMarker({ device }: { device: Device }) {
  const { DivIcon, Marker } = require('leaflet');
  const L = require('leaflet');

  if (!device.lastLat || !device.lastLng) return null;

  const color = device.status === 'online' ? '#10B981'
    : device.status === 'maintenance' ? '#F59E0B' : '#64748B';

  const icon = L.divIcon({
    className: '',
    html: `<div style="
      background:${color};border-radius:50%;width:30px;height:30px;
      display:flex;align-items:center;justify-content:center;
      border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.5);
      font-size:14px;cursor:pointer;
    ">${DEVICE_EMOJI[device.type] ?? '📍'}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });

  return (
    <Marker position={[device.lastLat, device.lastLng]} icon={icon}>
      <Popup>
        <div style={{ minWidth: 180, background: '#1E293B', color: '#F1F5F9', padding: 8, borderRadius: 6 }}>
          <strong>{device.name}</strong>
          <div style={{ fontSize: 12, marginTop: 4 }}>
            {device.driverName && <div>Driver: {device.driverName}</div>}
            {device.licensePlate && <div>Plate: {device.licensePlate}</div>}
            <div>Speed: {device.lastSpeed?.toFixed(1) ?? 0} km/h</div>
            <div>Status: <span style={{ color }}>{device.status}</span></div>
          </div>
        </div>
      </Popup>
    </Marker>
  );
}

export default function Dashboard() {
  const { data: deviceList = [], refetch: refetchDevices } = useQuery({
    queryKey: ['devices'],
    queryFn: () => deviceApi.list().then(r => r.data),
    refetchInterval: 60_000,
  });

  const { data: geofenceList = [] } = useQuery({
    queryKey: ['geofences'],
    queryFn: () => geofences.list().then(r => r.data),
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
  const center  = mergedDevices.find(d => d.lastLat)
    ? [mergedDevices.find(d => d.lastLat)!.lastLat!, mergedDevices.find(d => d.lastLat)!.lastLng!] as [number, number]
    : [37.7749, -122.4194] as [number, number];

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

      <div className="dashboard-grid">
        <div className="map-panel">
          <MapContainer center={center} zoom={12} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap contributors'
            />
            {geofenceList.map(gf => (
              <Circle
                key={gf.id}
                center={[gf.centerLat, gf.centerLng]}
                radius={gf.radiusM}
                pathOptions={{ color: gf.color, fillColor: gf.color, fillOpacity: 0.1 }}
              >
                <Popup>{gf.name} ({gf.radiusM}m radius)</Popup>
              </Circle>
            ))}
            {mergedDevices.map(d => <DeviceMarker key={d.id} device={d} />)}
          </MapContainer>
        </div>

        {/* Live alerts sidebar */}
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
