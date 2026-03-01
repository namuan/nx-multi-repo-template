-- Demo seed data for local development
-- Applied after schema migrations

-- Platform admin tenant (special)
INSERT INTO tenants (id, name, subdomain, primary_color, plan, max_devices, retention_days)
VALUES ('00000000-0000-0000-0000-000000000001', 'Platform Admin', 'admin', '#6366F1', 'enterprise', 9999, 365);

-- Platform admin user  (password: Admin123!)
INSERT INTO users (id, tenant_id, email, password_hash, full_name, role, is_platform_admin)
VALUES (
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000001',
  'admin@fleetpilot.io',
  '$2a$12$GHw2wLrcHGCbr/kEdVqRCuWwTya.qVXxQLJEW.kp/EN5L7Q0javOS', -- Admin123!
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
  'alice@acme.com', '$2a$12$f/pBdgde3eaS3krDMm7bsuDei7q2kYbL13yw0/m1sSbiiLQIF8oAu', 'Alice Chen', 'fleet_admin'),
  ('10000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000001',
  'bob@acme.com', '$2a$12$f/pBdgde3eaS3krDMm7bsuDei7q2kYbL13yw0/m1sSbiiLQIF8oAu', 'Bob Martinez', 'dispatcher'),
  ('10000000-0000-0000-0000-000000000012', '10000000-0000-0000-0000-000000000001',
  'carol@acme.com', '$2a$12$f/pBdgde3eaS3krDMm7bsuDei7q2kYbL13yw0/m1sSbiiLQIF8oAu', 'Carol Williams', 'driver');

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
  'diana@swiftfleet.io', '$2a$12$f/pBdgde3eaS3krDMm7bsuDei7q2kYbL13yw0/m1sSbiiLQIF8oAu', 'Diana Park', 'fleet_admin'),
  ('20000000-0000-0000-0000-000000000011', '20000000-0000-0000-0000-000000000001',
  'evan@swiftfleet.io', '$2a$12$f/pBdgde3eaS3krDMm7bsuDei7q2kYbL13yw0/m1sSbiiLQIF8oAu', 'Evan Torres', 'dispatcher');

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
  'frank@urbandel.co', '$2a$12$f/pBdgde3eaS3krDMm7bsuDei7q2kYbL13yw0/m1sSbiiLQIF8oAu', 'Frank Garcia', 'fleet_admin');

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

-- Urban alert rules
INSERT INTO alert_rules (id, tenant_id, name, type, threshold, severity)
VALUES
  ('30000000-0000-0000-0003-000000000001', '30000000-0000-0000-0000-000000000001',
   'Speed Limit 50 km/h', 'speed', 50, 'warning'),
  ('30000000-0000-0000-0003-000000000002', '30000000-0000-0000-0000-000000000001',
   'Fuel Below 20%', 'fuel_low', 20, 'warning');
