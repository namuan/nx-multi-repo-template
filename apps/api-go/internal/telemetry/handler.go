package telemetry

import (
	"database/sql"
	"encoding/json"
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
