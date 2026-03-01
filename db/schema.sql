-- Fleet Management Platform - PostgreSQL Schema (E2E schema-only)
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

-- ─── Alert Rules ────────────────────────────────────────────────────────────
CREATE TABLE alert_rules (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        VARCHAR(255) NOT NULL,
  type        VARCHAR(20) NOT NULL
                CHECK (type IN ('speed','idle','offline','fuel_low')),
  threshold   DOUBLE PRECISION,
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
