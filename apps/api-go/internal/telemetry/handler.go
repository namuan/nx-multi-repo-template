package telemetry

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/nx-polyglot/api-go/internal/auth"
	"github.com/nx-polyglot/api-go/internal/ratelimit"
	"github.com/nx-polyglot/api-go/internal/ws"
)

type Handler struct {
	db      *sql.DB
	hub     *ws.Hub
	limiter *ratelimit.TenantLimiter
}

type alertRule struct {
	ID        string
	Type      string
	Threshold sql.NullFloat64
	Severity  string
}

func NewHandler(db *sql.DB, hub *ws.Hub, limiter *ratelimit.TenantLimiter) *Handler {
	return &Handler{db: db, hub: hub, limiter: limiter}
}

func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	deviceID := auth.GetDeviceID(r.Context())
	tenantID := auth.GetTenantID(r.Context())

	if !h.limiter.Allow(tenantID) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusTooManyRequests)
		json.NewEncoder(w).Encode(map[string]string{"error": "rate limit exceeded"})
		return
	}

	var p Payload
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "invalid JSON"})
		return
	}

	if p.Lat < -90 || p.Lat > 90 || p.Lng < -180 || p.Lng > 180 {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "invalid coordinates"})
		return
	}

	now := time.Now().UTC()
	if p.RecordedAt == nil {
		p.RecordedAt = &now
	}

	metaJSON, _ := json.Marshal(p.Metadata)
	if metaJSON == nil {
		metaJSON = []byte("{}")
	}

	eventID := uuid.New().String()

	_, err := h.db.ExecContext(r.Context(), `
		INSERT INTO telemetry_events
		  (id, tenant_id, device_id, lat, lng, speed, heading, altitude, fuel_level, engine_temp, odometer, metadata, recorded_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
		eventID, tenantID, deviceID,
		p.Lat, p.Lng, p.Speed, p.Heading, p.Altitude,
		p.FuelLevel, p.EngineTemp, p.Odometer,
		metaJSON, p.RecordedAt,
	)
	if err != nil {
		slog.Error("telemetry insert failed", "error", err, "device", deviceID)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "storage error"})
		return
	}

	// Update device last-seen position
	_, _ = h.db.ExecContext(r.Context(), `
		UPDATE devices
		SET last_lat=$1, last_lng=$2, last_speed=$3, last_heading=$4, last_seen=$5, status='online', updated_at=now()
		WHERE id=$6`,
		p.Lat, p.Lng, p.Speed, p.Heading, p.RecordedAt, deviceID,
	)

	h.generateAlerts(r.Context(), tenantID, deviceID, p)

	// Broadcast to WebSocket room
	event := Event{
		Type:     "telemetry",
		DeviceID: deviceID,
		TenantID: tenantID,
		Lat:      p.Lat,
		Lng:      p.Lng,
		Speed:    p.Speed,
		Heading:  p.Heading,
		Status:   "online",
	}
	payload, _ := json.Marshal(event)
	h.hub.BroadcastToTenant(tenantID, payload)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusAccepted)
	json.NewEncoder(w).Encode(map[string]string{"id": eventID, "status": "accepted"})
}

func (h *Handler) generateAlerts(ctx context.Context, tenantID string, deviceID string, payload Payload) {
	rows, err := h.db.QueryContext(ctx, `
		SELECT id, type, threshold, severity
		FROM alert_rules
		WHERE tenant_id = $1 AND active = true`, tenantID)
	if err != nil {
		slog.Error("alert rules query failed", "error", err, "tenant", tenantID)
		return
	}
	defer rows.Close()

	deviceName := h.deviceName(ctx, tenantID, deviceID)
	now := time.Now().UTC()

	for rows.Next() {
		var rule alertRule
		if err := rows.Scan(&rule.ID, &rule.Type, &rule.Threshold, &rule.Severity); err != nil {
			slog.Error("alert rule scan failed", "error", err)
			continue
		}

		triggered, message := evaluateRule(rule, payload, deviceName)
		if !triggered {
			continue
		}

		if h.hasOpenAlert(ctx, tenantID, deviceID, rule.ID) {
			continue
		}

		_, err = h.db.ExecContext(ctx, `
			INSERT INTO alerts (id, tenant_id, device_id, rule_id, type, message, severity, acknowledged, created_at)
			VALUES ($1,$2,$3,$4,$5,$6,$7,false,$8)`,
			uuid.New().String(), tenantID, deviceID, rule.ID, rule.Type, message, rule.Severity, now,
		)
		if err != nil {
			slog.Error("alert insert failed", "error", err, "tenant", tenantID, "device", deviceID, "rule", rule.ID)
		}
	}

	if err := rows.Err(); err != nil {
		slog.Error("alert rule iteration failed", "error", err, "tenant", tenantID)
	}
}

func (h *Handler) hasOpenAlert(ctx context.Context, tenantID string, deviceID string, ruleID string) bool {
	var count int
	err := h.db.QueryRowContext(ctx, `
		SELECT COUNT(1)
		FROM alerts
		WHERE tenant_id = $1 AND device_id = $2 AND rule_id = $3 AND acknowledged = false`,
		tenantID, deviceID, ruleID,
	).Scan(&count)
	if err != nil {
		slog.Error("open alert lookup failed", "error", err, "tenant", tenantID, "device", deviceID, "rule", ruleID)
		return false
	}

	return count > 0
}

func (h *Handler) deviceName(ctx context.Context, tenantID string, deviceID string) string {
	var name string
	err := h.db.QueryRowContext(ctx, `
		SELECT name
		FROM devices
		WHERE id = $1 AND tenant_id = $2`, deviceID, tenantID).Scan(&name)
	if err != nil {
		return fmt.Sprintf("Device %s", deviceID)
	}

	return name
}

func evaluateRule(rule alertRule, payload Payload, deviceName string) (bool, string) {
	switch rule.Type {
	case "speed":
		if !rule.Threshold.Valid {
			return false, ""
		}
		if payload.Speed > rule.Threshold.Float64 {
			return true, fmt.Sprintf("%s exceeded %.0f km/h (recorded: %.0f km/h)", deviceName, rule.Threshold.Float64, payload.Speed)
		}
	case "fuel_low":
		if !rule.Threshold.Valid || payload.FuelLevel == nil {
			return false, ""
		}
		if *payload.FuelLevel < rule.Threshold.Float64 {
			return true, fmt.Sprintf("%s fuel level at %.0f%% — refuel required", deviceName, *payload.FuelLevel)
		}
	}

	return false, ""
}
