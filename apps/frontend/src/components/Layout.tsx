import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Truck, Bell, MapPin, Settings,
  LogOut, Shield, ChevronRight, Activity
} from 'lucide-react';
import { useAuthStore } from '../stores/auth.store';
import { useQuery } from '@tanstack/react-query';
import { alerts } from '../lib/api';

interface LayoutProps { children: React.ReactNode; title: string; }

export function Layout({ children, title }: LayoutProps) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const { data: alertCount } = useQuery({
    queryKey: ['alert-count'],
    queryFn: () => alerts.count().then(r => r.data.count),
    refetchInterval: 30_000,
  });

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const primary = user?.primaryColor ?? '#3B82F6';
  const initials = user?.tenantName?.slice(0, 2).toUpperCase() ?? 'FL';

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="dot" style={{ background: primary }} />
          <span>FleetPilot</span>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section">Fleet</div>
          <NavLink to="/dashboard" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            <LayoutDashboard size={16} /> Dashboard
          </NavLink>
          <NavLink to="/devices" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            <Truck size={16} /> Devices
          </NavLink>
          <NavLink to="/alerts" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            <Bell size={16} /> Alerts
            {alertCount && alertCount > 0
              ? <span className="badge-count">{alertCount}</span>
              : null}
          </NavLink>
          <NavLink to="/geofences" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            <MapPin size={16} /> Geofences
          </NavLink>

          <div className="nav-section" style={{ marginTop: 8 }}>Account</div>
          <NavLink to="/settings" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            <Settings size={16} /> Settings
          </NavLink>
          {user?.isPlatformAdmin && (
            <NavLink to="/admin" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <Shield size={16} /> Platform Admin
            </NavLink>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="tenant-chip">
            <div className="tenant-avatar" style={{ background: primary }}>{initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.tenantName}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.email}
              </div>
            </div>
          </div>
          <button
            className="nav-item"
            onClick={handleLogout}
            style={{ marginTop: 4, color: 'var(--danger)', width: '100%' }}
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <h1 style={{ fontSize: 16, fontWeight: 600 }}>{title}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Activity size={16} style={{ color: 'var(--success)' }} />
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Live</span>
          </div>
        </header>
        <main className="page-content">{children}</main>
      </div>
    </div>
  );
}
