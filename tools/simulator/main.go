// Device Simulator — sends realistic GPS telemetry to the Go API.
// Each goroutine simulates a single device moving along a random walk route.
package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log/slog"
	"math"
	"math/rand"
	"net/http"
	"os"
	"strconv"
	"time"
)

type telemetryPayload struct {
	Lat        float64  `json:"lat"`
	Lng        float64  `json:"lng"`
	Speed      float64  `json:"speed"`
	Heading    float64  `json:"heading"`
	Altitude   float64  `json:"altitude"`
	FuelLevel  *float64 `json:"fuel_level,omitempty"`
	EngineTemp *float64 `json:"engine_temp,omitempty"`
	Odometer   *float64 `json:"odometer,omitempty"`
}

type device struct {
	name    string
	apiKey  string
	lat     float64
	lng     float64
	fuel    float64
	odo     float64
	heading float64
}

var devices = []device{
	// Acme Logistics — SF Bay Area
	{name: "Truck Alpha-1", apiKey: "acme-device-key-alpha-001-secret-x", lat: 37.7749, lng: -122.4194, fuel: 85, odo: 45120},
	{name: "Van Beta-2",    apiKey: "acme-device-key-beta-002-secret-xx", lat: 37.7849, lng: -122.4094, fuel: 62, odo: 23450},
	{name: "Truck Gamma-3", apiKey: "acme-device-key-gamma-003-secretx",  lat: 37.7649, lng: -122.4394, fuel: 45, odo: 78900},

	// SwiftFleet — Chicago
	{name: "Unit SW-101", apiKey: "swift-device-key-sw101-secret-xxx", lat: 41.8781, lng: -87.6298, fuel: 91, odo: 12340},
	{name: "Unit SW-102", apiKey: "swift-device-key-sw102-secret-xxx", lat: 41.8850, lng: -87.6400, fuel: 73, odo: 34560},
	{name: "Unit SW-103", apiKey: "swift-device-key-sw103-secret-xx",  lat: 41.8700, lng: -87.6150, fuel: 28, odo: 56780},

	// Urban Delivery — NYC
	{name: "Moto NYC-1", apiKey: "urban-device-key-nyc001-secret-x", lat: 40.7128, lng: -74.0060, fuel: 55, odo: 9876},
	{name: "Van NYC-2",  apiKey: "urban-device-key-nyc002-secret-x", lat: 40.7200, lng: -73.9950, fuel: 80, odo: 15432},
}

func main() {
	apiURL := getEnv("GO_API_URL", "http://localhost:8081")
	intervalMs, _ := strconv.Atoi(getEnv("INTERVAL_MS", "3000"))
	interval := time.Duration(intervalMs) * time.Millisecond

	slog.Info("simulator starting", "devices", len(devices), "interval", interval, "api", apiURL)

	for i := range devices {
		d := &devices[i]
		d.heading = rand.Float64() * 360
		go simulateDevice(d, apiURL, interval)
	}

	// Block forever
	select {}
}

func simulateDevice(d *device, apiURL string, interval time.Duration) {
	client := &http.Client{Timeout: 5 * time.Second}
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	for range ticker.C {
		// Random walk: change heading slightly, move forward
		d.heading += (rand.Float64() - 0.5) * 30
		d.heading = math.Mod(d.heading+360, 360)

		speed := 20 + rand.Float64()*60 // 20–80 km/h

		// Occasional speeding for alert demo
		if rand.Float64() < 0.05 {
			speed = 90 + rand.Float64()*30
		}

		// Compute displacement
		distKm := speed * interval.Hours()
		headingRad := d.heading * math.Pi / 180

		// Approximate lat/lng delta (1 degree lat ≈ 111 km)
		d.lat += (distKm / 111.0) * math.Cos(headingRad)
		d.lng += (distKm / (111.0 * math.Cos(d.lat*math.Pi/180))) * math.Sin(headingRad)

		// Slowly drain fuel
		d.fuel = math.Max(5, d.fuel-0.02)
		d.odo += distKm

		engineTemp := 75 + rand.Float64()*25
		fuel := d.fuel
		odo := d.odo

		p := telemetryPayload{
			Lat:        d.lat,
			Lng:        d.lng,
			Speed:      speed,
			Heading:    d.heading,
			Altitude:   10 + rand.Float64()*100,
			FuelLevel:  &fuel,
			EngineTemp: &engineTemp,
			Odometer:   &odo,
		}

		body, _ := json.Marshal(p)
		req, _ := http.NewRequest(http.MethodPost, apiURL+"/api/devices/telemetry", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("X-Device-Key", d.apiKey)

		resp, err := client.Do(req)
		if err != nil {
			slog.Warn("telemetry send failed", "device", d.name, "error", err)
			continue
		}
		resp.Body.Close()

		if resp.StatusCode != http.StatusAccepted {
			slog.Warn("unexpected response", "device", d.name, "status", resp.StatusCode)
		} else {
			slog.Debug("telemetry sent", "device", d.name,
				"lat", fmt.Sprintf("%.4f", d.lat),
				"lng", fmt.Sprintf("%.4f", d.lng),
				"speed", fmt.Sprintf("%.1f", speed))
		}
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
