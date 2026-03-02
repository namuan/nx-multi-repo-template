package telemetry

import "time"

// Payload is what a device POSTs to /api/devices/telemetry
type Payload struct {
	Lat        float64        `json:"lat"`
	Lng        float64        `json:"lng"`
	Speed      float64        `json:"speed"`
	Heading    float64        `json:"heading"`
	Altitude   float64        `json:"altitude"`
	FuelLevel  *float64       `json:"fuel_level,omitempty"`
	EngineTemp *float64       `json:"engine_temp,omitempty"`
	Odometer   *float64       `json:"odometer,omitempty"`
	Metadata   map[string]any `json:"metadata,omitempty"`
	RecordedAt *time.Time     `json:"recorded_at,omitempty"`
}

// Event is the WebSocket broadcast payload sent to the frontend
type Event struct {
	Type     string  `json:"type"` // "telemetry"
	DeviceID string  `json:"device_id"`
	TenantID string  `json:"tenant_id"`
	Lat      float64 `json:"lat"`
	Lng      float64 `json:"lng"`
	Speed    float64 `json:"speed"`
	Heading  float64 `json:"heading"`
	Status   string  `json:"status"` // "online"
}
