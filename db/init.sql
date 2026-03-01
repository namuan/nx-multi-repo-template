-- Fleet Management Platform - PostgreSQL Schema
-- Multi-tenant: shared DB + tenant_id on every table

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Tenants ────────────────────────────────────────────────────────────────
CREATE TABLE tenants (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(255) NOT NULL,
  subdomain     VARCHAR(100) UNIQUE NOT NULL,
  logo_url      VARCHAR(500),
  primary_color VARCHAR(7)  NOT NULL DEFAULT '#3B82F6',
  plan          VARCHAR(20) NOT NULL DEFAULT 'free'
                  CHECK (plan IN ('free', 'pro', 'enterprise')),
  status        VARCHAR(20) NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'suspended', 'deleted')),
  max_devices   INT NOT NULL DEFAULT 10,
  retention_days INT NOT NULL DEFAULT 30,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Users ──────────────────────────────────────────────────────────────────
CREATE TABLE users (
  id                UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID    NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email             VARCHAR(255) UNIQUE NOT NULL,
  password_hash     VARCHAR(255) NOT NULL,
  full_name         VARCHAR(255) NOT NULL,
  role              VARCHAR(20)  NOT NULL DEFAULT 'viewer'
                      CHECK (role IN ('fleet_admin','dispatcher','driver','viewer')),
  is_platform_admin BOOLEAN NOT NULL DEFAULT false,
  last_login        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email);

-- ─── Devices ────────────────────────────────────────────────────────────────
CREATE TABLE devices (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name          VARCHAR(255) NOT NULL,
  type          VARCHAR(20) NOT NULL DEFAULT 'truck'
                  CHECK (type IN ('truck','van','motorcycle','car','drone')),
  api_key       VARCHAR(64) UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  status        VARCHAR(20) NOT NULL DEFAULT 'offline'
                  CHECK (status IN ('online','offline','maintenance')),
  last_lat      DOUBLE PRECISION,
  last_lng      DOUBLE PRECISION,
  last_speed    DOUBLE PRECISION,
  last_heading  DOUBLE PRECISION,
  last_seen     TIMESTAMPTZ,
  driver_name   VARCHAR(255),
  license_plate VARCHAR(50),
  vin           VARCHAR(50),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_devices_tenant_id ON devices(tenant_id);
CREATE INDEX idx_devices_api_key ON devices(api_key);

-- ─── Telemetry Events ───────────────────────────────────────────────────────
-- Partitioned by recorded_at for efficient retention pruning.
-- PostgreSQL requires the partition key to be part of every unique constraint,
-- so the primary key is (id, recorded_at) rather than id alone.
CREATE TABLE telemetry_events (
  id          UUID             NOT NULL DEFAULT gen_random_uuid(),
  tenant_id   UUID             NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  device_id   UUID             NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  lat         DOUBLE PRECISION NOT NULL,
  lng         DOUBLE PRECISION NOT NULL,
  speed       DOUBLE PRECISION NOT NULL DEFAULT 0,
  heading     DOUBLE PRECISION NOT NULL DEFAULT 0,
  altitude    DOUBLE PRECISION NOT NULL DEFAULT 0,
  fuel_level  DOUBLE PRECISION,
  engine_temp DOUBLE PRECISION,
  odometer    DOUBLE PRECISION,
  metadata    JSONB NOT NULL DEFAULT '{}',
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id, recorded_at)
) PARTITION BY RANGE (recorded_at);

-- Partition by month for efficient retention pruning
CREATE TABLE telemetry_events_2025_01 PARTITION OF telemetry_events
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE telemetry_events_2025_02 PARTITION OF telemetry_events
  FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');
CREATE TABLE telemetry_events_2025_03 PARTITION OF telemetry_events
  FOR VALUES FROM ('2025-03-01') TO ('2025-04-01');
CREATE TABLE telemetry_events_2026_01 PARTITION OF telemetry_events
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE telemetry_events_2026_02 PARTITION OF telemetry_events
  FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
CREATE TABLE telemetry_events_2026_03 PARTITION OF telemetry_events
  FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
CREATE TABLE telemetry_events_2026_04 PARTITION OF telemetry_events
  FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
CREATE TABLE telemetry_events_default  PARTITION OF telemetry_events DEFAULT;

CREATE INDEX idx_telemetry_device_time  ON telemetry_events(device_id, recorded_at DESC);
CREATE INDEX idx_telemetry_tenant_time  ON telemetry_events(tenant_id, recorded_at DESC);

-- ─── Geofences ──────────────────────────────────────────────────────────────
CREATE TABLE geofences (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        VARCHAR(255) NOT NULL,
  center_lat  DOUBLE PRECISION NOT NULL,
  center_lng  DOUBLE PRECISION NOT NULL,
  radius_m    DOUBLE PRECISION NOT NULL,
  color       VARCHAR(7) NOT NULL DEFAULT '#EF4444',
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_geofences_tenant_id ON geofences(tenant_id);

-- ─── Alert Rules ────────────────────────────────────────────────────────────
CREATE TABLE alert_rules (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        VARCHAR(255) NOT NULL,
  type        VARCHAR(20) NOT NULL
                CHECK (type IN ('speed','geofence_enter','geofence_exit','idle','offline','fuel_low')),
  threshold   DOUBLE PRECISION,
  geofence_id UUID REFERENCES geofences(id) ON DELETE SET NULL,
  severity    VARCHAR(20) NOT NULL DEFAULT 'warning'
                CHECK (severity IN ('info','warning','critical')),
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_alert_rules_tenant_id ON alert_rules(tenant_id);

-- ─── Alerts ─────────────────────────────────────────────────────────────────
CREATE TABLE alerts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  device_id         UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  rule_id           UUID REFERENCES alert_rules(id) ON DELETE SET NULL,
  type              VARCHAR(50) NOT NULL,
  message           TEXT NOT NULL,
  severity          VARCHAR(20) NOT NULL,
  acknowledged      BOOLEAN NOT NULL DEFAULT false,
  acknowledged_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  acknowledged_at   TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_alerts_tenant_id  ON alerts(tenant_id);
CREATE INDEX idx_alerts_unacked    ON alerts(tenant_id, acknowledged) WHERE acknowledged = false;

-- ─── Audit Logs ─────────────────────────────────────────────────────────────
CREATE TABLE audit_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  actor_id      UUID REFERENCES users(id) ON DELETE SET NULL,
  actor_email   VARCHAR(255),
  action        VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id   VARCHAR(255),
  details       JSONB NOT NULL DEFAULT '{}',
  ip_address    VARCHAR(45),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_tenant_time ON audit_logs(tenant_id, created_at DESC);

-- ═══════════════════════════════════════════════════════════════════════════
-- SEED DATA — Demo tenants, users, devices, geofences, alert rules, alerts
-- ═══════════════════════════════════════════════════════════════════════════

-- Platform admin tenant (special)
INSERT INTO tenants (id, name, subdomain, primary_color, plan, max_devices, retention_days)
VALUES ('00000000-0000-0000-0000-000000000001', 'Platform Admin', 'admin', '#6366F1', 'enterprise', 9999, 365);

-- Platform admin user  (password: Admin123!)
INSERT INTO users (id, tenant_id, email, password_hash, full_name, role, is_platform_admin)
VALUES (
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000001',
  'admin@fleetpilot.io',
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj2NvFhMvfQS', -- Admin123!
  'Platform Administrator',
  'fleet_admin',
  true
);

-- ─── Tenant 1: Acme Logistics (SF Bay Area) ─────────────────────────────────
INSERT INTO tenants (id, name, subdomain, primary_color, plan, max_devices, retention_days)
VALUES ('10000000-0000-0000-0000-000000000001', 'Acme Logistics', 'acme', '#3B82F6', 'enterprise', 50, 90);

-- Acme users (password for all: Demo123!)
INSERT INTO users (id, tenant_id, email, password_hash, full_name, role)
VALUES
  ('10000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000001',
   'alice@acme.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj2NvFhMvfQS', 'Alice Chen', 'fleet_admin'),
  ('10000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000001',
   'bob@acme.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj2NvFhMvfQS', 'Bob Martinez', 'dispatcher'),
  ('10000000-0000-0000-0000-000000000012', '10000000-0000-0000-0000-000000000001',
   'carol@acme.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj2NvFhMvfQS', 'Carol Williams', 'driver');

-- Acme devices (SF Bay Area)
INSERT INTO devices (id, tenant_id, name, type, api_key, status, last_lat, last_lng, last_speed, last_heading, last_seen, driver_name, license_plate)
VALUES
  ('10000000-0000-0000-0001-000000000001', '10000000-0000-0000-0000-000000000001',
   'Truck Alpha-1', 'truck', 'acme-device-key-alpha-001-secret-x', 'online',
   37.7749, -122.4194, 45.2, 90, now() - interval '30 seconds', 'James Wilson', 'CA-ACM-001'),
  ('10000000-0000-0000-0001-000000000002', '10000000-0000-0000-0000-000000000001',
   'Van Beta-2', 'van', 'acme-device-key-beta-002-secret-xx', 'online',
   37.7849, -122.4094, 32.0, 180, now() - interval '45 seconds', 'Sarah Davis', 'CA-ACM-002'),
  ('10000000-0000-0000-0001-000000000003', '10000000-0000-0000-0000-000000000001',
   'Truck Gamma-3', 'truck', 'acme-device-key-gamma-003-secretx', 'online',
   37.7649, -122.4394, 58.7, 270, now() - interval '20 seconds', 'Mike Johnson', 'CA-ACM-003'),
  ('10000000-0000-0000-0001-000000000004', '10000000-0000-0000-0000-000000000001',
   'Van Delta-4', 'van', 'acme-device-key-delta-004-secretxx', 'offline',
   37.7550, -122.4500, 0, 0, now() - interval '2 hours', 'Tom Brown', 'CA-ACM-004'),
  ('10000000-0000-0000-0001-000000000005', '10000000-0000-0000-0000-000000000001',
   'Drone Echo-5', 'drone', 'acme-device-key-echo-005-secretxx', 'maintenance',
   37.7900, -122.3900, 0, 0, now() - interval '1 day', NULL, 'CA-ACM-005');

-- Acme geofences
INSERT INTO geofences (id, tenant_id, name, center_lat, center_lng, radius_m, color)
VALUES
  ('10000000-0000-0000-0002-000000000001', '10000000-0000-0000-0000-000000000001',
   'HQ Depot', 37.7749, -122.4194, 500, '#3B82F6'),
  ('10000000-0000-0000-0002-000000000002', '10000000-0000-0000-0000-000000000001',
   'Port of Oakland', 37.7955, -122.2783, 800, '#10B981'),
  ('10000000-0000-0000-0002-000000000003', '10000000-0000-0000-0000-000000000001',
   'Restricted Zone A', 37.7300, -122.4700, 300, '#EF4444');

-- Acme alert rules
INSERT INTO alert_rules (id, tenant_id, name, type, threshold, severity)
VALUES
  ('10000000-0000-0000-0003-000000000001', '10000000-0000-0000-0000-000000000001',
   'Speed Limit 80 km/h', 'speed', 80, 'warning'),
  ('10000000-0000-0000-0003-000000000002', '10000000-0000-0000-0000-000000000001',
   'Speed Limit 100 km/h', 'speed', 100, 'critical'),
  ('10000000-0000-0000-0003-000000000003', '10000000-0000-0000-0000-000000000001',
   'Idle > 15 min', 'idle', 15, 'info'),
  ('10000000-0000-0000-0003-000000000004', '10000000-0000-0000-0000-000000000001',
   'Fuel Below 15%', 'fuel_low', 15, 'warning');

INSERT INTO alert_rules (id, tenant_id, name, type, geofence_id, severity)
VALUES
  ('10000000-0000-0000-0003-000000000005', '10000000-0000-0000-0000-000000000001',
   'Entered Restricted Zone A', 'geofence_enter', '10000000-0000-0000-0002-000000000003', 'critical');

-- Acme sample alerts
INSERT INTO alerts (tenant_id, device_id, rule_id, type, message, severity, created_at)
VALUES
  ('10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0001-000000000003',
   '10000000-0000-0000-0003-000000000002', 'speed',
   'Truck Gamma-3 exceeded 100 km/h (recorded: 112 km/h)', 'critical', now() - interval '15 minutes'),
  ('10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0001-000000000004',
   '10000000-0000-0000-0003-000000000001', 'speed',
   'Van Delta-4 exceeded 80 km/h (recorded: 87 km/h)', 'warning', now() - interval '3 hours'),
  ('10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0001-000000000001',
   '10000000-0000-0000-0003-000000000004', 'fuel_low',
   'Truck Alpha-1 fuel level at 12% — refuel required', 'warning', now() - interval '1 hour');

-- ─── Tenant 2: SwiftFleet (Chicago) ─────────────────────────────────────────
INSERT INTO tenants (id, name, subdomain, primary_color, plan, max_devices, retention_days)
VALUES ('20000000-0000-0000-0000-000000000001', 'SwiftFleet', 'swift', '#10B981', 'pro', 25, 60);

INSERT INTO users (id, tenant_id, email, password_hash, full_name, role)
VALUES
  ('20000000-0000-0000-0000-000000000010', '20000000-0000-0000-0000-000000000001',
   'diana@swiftfleet.io', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj2NvFhMvfQS', 'Diana Park', 'fleet_admin'),
  ('20000000-0000-0000-0000-000000000011', '20000000-0000-0000-0000-000000000001',
   'evan@swiftfleet.io', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj2NvFhMvfQS', 'Evan Torres', 'dispatcher');

-- SwiftFleet devices (Chicago)
INSERT INTO devices (id, tenant_id, name, type, api_key, status, last_lat, last_lng, last_speed, last_heading, last_seen, driver_name, license_plate)
VALUES
  ('20000000-0000-0000-0001-000000000001', '20000000-0000-0000-0000-000000000001',
   'Unit SW-101', 'truck', 'swift-device-key-sw101-secret-xxx', 'online',
   41.8781, -87.6298, 62.0, 45, now() - interval '10 seconds', 'Lisa Wong', 'IL-SWF-101'),
  ('20000000-0000-0000-0001-000000000002', '20000000-0000-0000-0000-000000000001',
   'Unit SW-102', 'van', 'swift-device-key-sw102-secret-xxx', 'online',
   41.8850, -87.6400, 28.5, 270, now() - interval '25 seconds', 'Mark Reed', 'IL-SWF-102'),
  ('20000000-0000-0000-0001-000000000003', '20000000-0000-0000-0000-000000000001',
   'Unit SW-103', 'motorcycle', 'swift-device-key-sw103-secret-xx', 'online',
   41.8700, -87.6150, 75.0, 135, now() - interval '5 seconds', 'Nina Patel', 'IL-SWF-103'),
  ('20000000-0000-0000-0001-000000000004', '20000000-0000-0000-0000-000000000001',
   'Unit SW-104', 'car', 'swift-device-key-sw104-secret-xxx', 'offline',
   41.8600, -87.6500, 0, 0, now() - interval '4 hours', 'Paul Kim', 'IL-SWF-104');

-- SwiftFleet geofences
INSERT INTO geofences (id, tenant_id, name, center_lat, center_lng, radius_m, color)
VALUES
  ('20000000-0000-0000-0002-000000000001', '20000000-0000-0000-0000-000000000001',
   'Chicago Depot', 41.8781, -87.6298, 400, '#10B981'),
  ('20000000-0000-0000-0002-000000000002', '20000000-0000-0000-0000-000000000001',
   'O''Hare Distribution', 41.9742, -87.9073, 600, '#F59E0B');

-- SwiftFleet alert rules
INSERT INTO alert_rules (id, tenant_id, name, type, threshold, severity)
VALUES
  ('20000000-0000-0000-0003-000000000001', '20000000-0000-0000-0000-000000000001',
   'Speed Limit 90 km/h', 'speed', 90, 'warning'),
  ('20000000-0000-0000-0003-000000000002', '20000000-0000-0000-0000-000000000001',
   'Offline > 30 min', 'offline', 30, 'critical');

-- SwiftFleet alerts
INSERT INTO alerts (tenant_id, device_id, rule_id, type, message, severity, acknowledged, acknowledged_at, created_at)
VALUES
  ('20000000-0000-0000-0000-000000000001', '20000000-0000-0000-0001-000000000003',
   '20000000-0000-0000-0003-000000000001', 'speed',
   'Unit SW-103 exceeded 90 km/h (recorded: 98 km/h)', 'warning',
   true, now() - interval '20 minutes', now() - interval '45 minutes');

-- ─── Tenant 3: Urban Delivery Co (NYC) ──────────────────────────────────────
INSERT INTO tenants (id, name, subdomain, primary_color, plan, max_devices, retention_days)
VALUES ('30000000-0000-0000-0000-000000000001', 'Urban Delivery Co', 'urban', '#F59E0B', 'free', 10, 30);

INSERT INTO users (id, tenant_id, email, password_hash, full_name, role)
VALUES
  ('30000000-0000-0000-0000-000000000010', '30000000-0000-0000-0000-000000000001',
   'frank@urbandel.co', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj2NvFhMvfQS', 'Frank Garcia', 'fleet_admin');

-- Urban devices (NYC)
INSERT INTO devices (id, tenant_id, name, type, api_key, status, last_lat, last_lng, last_speed, last_heading, last_seen, driver_name, license_plate)
VALUES
  ('30000000-0000-0000-0001-000000000001', '30000000-0000-0000-0000-000000000001',
   'Moto NYC-1', 'motorcycle', 'urban-device-key-nyc001-secret-x', 'online',
   40.7128, -74.0060, 35.0, 0, now() - interval '15 seconds', 'Grace Lee', 'NY-URB-001'),
  ('30000000-0000-0000-0001-000000000002', '30000000-0000-0000-0000-000000000001',
   'Van NYC-2', 'van', 'urban-device-key-nyc002-secret-x', 'online',
   40.7200, -73.9950, 22.0, 90, now() - interval '30 seconds', 'Henry Clark', 'NY-URB-002'),
  ('30000000-0000-0000-0001-000000000003', '30000000-0000-0000-0000-000000000001',
   'Car NYC-3', 'car', 'urban-device-key-nyc003-secret-x', 'offline',
   40.7050, -74.0150, 0, 0, now() - interval '6 hours', 'Iris Scott', 'NY-URB-003');

-- Urban geofences
INSERT INTO geofences (id, tenant_id, name, center_lat, center_lng, radius_m, color)
VALUES
  ('30000000-0000-0000-0002-000000000001', '30000000-0000-0000-0000-000000000001',
   'Manhattan HQ', 40.7128, -74.0060, 350, '#F59E0B');

-- Urban alert rules
INSERT INTO alert_rules (id, tenant_id, name, type, threshold, severity)
VALUES
  ('30000000-0000-0000-0003-000000000001', '30000000-0000-0000-0000-000000000001',
   'Speed Limit 50 km/h', 'speed', 50, 'warning'),
  ('30000000-0000-0000-0003-000000000002', '30000000-0000-0000-0000-000000000001',
   'Fuel Below 20%', 'fuel_low', 20, 'warning');
