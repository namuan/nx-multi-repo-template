import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Truck, Bell, Settings, LogOut, Shield } from 'lucide-react';
import { useAuthStore } from '../stores/auth.store';
import { useQuery } from '@tanstack/react-query';
import { alerts } from '../lib/api';

interface LayoutProps {
  children: React.ReactNode;
  title: string;
}

function HexLogo({ color }: { color: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 2L21.5 7.5V16.5L12 22L2.5 16.5V7.5L12 2Z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M12 7.5L18 11V17L12 20.5L6 17V11L12 7.5Z" fill={color} opacity="0.2" />
      <circle cx="12" cy="12" r="2.5" fill={color} />
    </svg>
  );
}

export function Layout({ children, title }: LayoutProps) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const { data: alertCount } = useQuery({
    queryKey: ['alert-count'],
    queryFn: () => alerts.count().then((r) => r.data.count),
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
          <HexLogo color={primary} />
          <span>FleetPilot</span>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section">Fleet</div>
          <NavLink
            to="/dashboard"
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <LayoutDashboard size={16} /> Dashboard
          </NavLink>
          <NavLink
            to="/devices"
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <Truck size={16} /> Devices
          </NavLink>
          <NavLink
            to="/alerts"
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <Bell size={16} /> Alerts
            {alertCount && alertCount > 0 ? (
              <span className="badge-count">{alertCount}</span>
            ) : null}
          </NavLink>

          <div className="nav-section" style={{ marginTop: 4 }}>
            Account
          </div>
          <NavLink
            to="/settings"
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <Settings size={16} /> Settings
          </NavLink>
          {user?.isPlatformAdmin && (
            <NavLink
              to="/admin"
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              <Shield size={16} /> Platform Admin
            </NavLink>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="tenant-chip">
            <div className="tenant-avatar" style={{ background: primary }}>
              {initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: 12,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {user?.tenantName}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--text-muted)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {user?.email}
              </div>
            </div>
          </div>
          <button
            className="nav-item"
            onClick={handleLogout}
            style={{ marginTop: 4, width: '100%' }}
          >
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <h1 style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' }}>{title}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="live-indicator">
              <span className="live-dot" />
            </div>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.07em',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
              }}
            >
              Live
            </span>
          </div>
        </header>
        <main className="page-content">{children}</main>
      </div>
    </div>
  );
}
