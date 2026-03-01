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
	"net/url"
	"os"
	"strconv"
	"strings"
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
	rand.Seed(time.Now().UnixNano())

	apiURL := normalizeLocalAPIURL(getEnv("GO_API_URL", "http://127.0.0.1:9101"))
	intervalMs := getEnvInt("INTERVAL_MS", 3000)
	interval := time.Duration(intervalMs) * time.Millisecond

	warmupDefault := 0
	if isLocalAPI(apiURL) {
		warmupDefault = 40
	}
	warmupEvents := getEnvInt("FAST_FORWARD_EVENTS", warmupDefault)
	warmupStepMs := getEnvInt("FAST_FORWARD_STEP_MS", 15000)
	if warmupStepMs <= 0 {
		warmupStepMs = 15000
	}
	warmupStep := time.Duration(warmupStepMs) * time.Millisecond

	slog.Info("simulator starting",
		"devices", len(devices),
		"interval", interval,
		"api", apiURL,
		"fastForwardEvents", warmupEvents,
		"fastForwardStep", warmupStep,
	)

	if err := waitForAPIReady(apiURL, 30*time.Second); err != nil {
		slog.Warn("api-go not ready before simulator start", "api", apiURL, "error", err)
	} else {
		slog.Info("api-go ready", "api", apiURL)
	}

	for i := range devices {
		d := &devices[i]
		d.heading = rand.Float64() * 360
		go simulateDevice(d, apiURL, interval, warmupStep, warmupEvents)
	}

	// Block forever
	select {}
}

func simulateDevice(d *device, apiURL string, interval, warmupStep time.Duration, warmupEvents int) {
	client := &http.Client{Timeout: 5 * time.Second}

	if warmupEvents > 0 {
		slog.Info("simulator fast-forward", "device", d.name, "events", warmupEvents, "step", warmupStep)
		for i := 0; i < warmupEvents; i++ {
			sendTelemetry(client, d, apiURL, warmupStep)
		}
	}

	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	for range ticker.C {
		sendTelemetry(client, d, apiURL, interval)
	}
}

func sendTelemetry(client *http.Client, d *device, apiURL string, step time.Duration) {
	p, speed := advanceDevice(d, step)

	body, _ := json.Marshal(p)
	req, _ := http.NewRequest(http.MethodPost, apiURL+"/api/devices/telemetry", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Device-Key", d.apiKey)

	resp, err := client.Do(req)
	if err != nil {
		slog.Warn("telemetry send failed", "device", d.name, "error", err)
		return
	}
	resp.Body.Close()

	if resp.StatusCode != http.StatusAccepted {
		slog.Warn("unexpected response", "device", d.name, "status", resp.StatusCode)
		return
	}

	slog.Debug("telemetry sent", "device", d.name,
		"lat", fmt.Sprintf("%.4f", d.lat),
		"lng", fmt.Sprintf("%.4f", d.lng),
		"speed", fmt.Sprintf("%.1f", speed))
}

func advanceDevice(d *device, step time.Duration) (telemetryPayload, float64) {
	// Random walk: change heading slightly, move forward
	d.heading += (rand.Float64() - 0.5) * 30
	d.heading = math.Mod(d.heading+360, 360)

	speed := 20 + rand.Float64()*60 // 20–80 km/h

	// Occasional speeding for alert demo
	if rand.Float64() < 0.05 {
		speed = 90 + rand.Float64()*30
	}

	// Compute displacement
	distKm := speed * step.Hours()
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

	return telemetryPayload{
		Lat:        d.lat,
		Lng:        d.lng,
		Speed:      speed,
		Heading:    d.heading,
		Altitude:   10 + rand.Float64()*100,
		FuelLevel:  &fuel,
		EngineTemp: &engineTemp,
		Odometer:   &odo,
	}, speed
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		return fallback
	}
	return n
}

func isLocalAPI(apiURL string) bool {
	return strings.Contains(apiURL, "localhost") || strings.Contains(apiURL, "127.0.0.1")
}

func normalizeLocalAPIURL(raw string) string {
	u, err := url.Parse(raw)
	if err != nil {
		return raw
	}
	if strings.EqualFold(u.Hostname(), "localhost") {
		port := u.Port()
		if port == "" {
			port = "9101"
		}
		u.Host = "127.0.0.1:" + port
	}
	return u.String()
}

func waitForAPIReady(apiURL string, timeout time.Duration) error {
	client := &http.Client{Timeout: 2 * time.Second}
	deadline := time.Now().Add(timeout)
	healthURL := strings.TrimRight(apiURL, "/") + "/health"

	for {
		req, _ := http.NewRequest(http.MethodGet, healthURL, nil)
		resp, err := client.Do(req)
		if err == nil {
			resp.Body.Close()
			if resp.StatusCode >= 200 && resp.StatusCode < 300 {
				return nil
			}
		}

		if time.Now().After(deadline) {
			if err != nil {
				return err
			}
			return fmt.Errorf("health endpoint not ready: %s", healthURL)
		}

		time.Sleep(500 * time.Millisecond)
	}
}
