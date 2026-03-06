// Package config loads runtime configuration from environment variables.
package config

import "os"

// Config contains runtime settings for the Go API.
type Config struct {
	Port          string
	DatabaseURL   string
	JWTSigningKey string
	AllowedOrigin string
}

// Load returns configuration values with local-development defaults.
func Load() *Config {
	return &Config{
		Port:          getEnvAny([]string{"GO_PORT", "PORT"}, "8080"),
		DatabaseURL:   getEnv("DATABASE_URL", "postgres://fleet_user:fleet_password@localhost:5432/fleet_db?sslmode=disable"),
		JWTSigningKey: getEnv("JWT_SECRET", "fleet-super-secret-jwt-key-change-in-production"),
		AllowedOrigin: getEnv("ALLOWED_ORIGIN", "http://localhost:9100"),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getEnvAny(keys []string, fallback string) string {
	for _, key := range keys {
		if v := os.Getenv(key); v != "" {
			return v
		}
	}
	return fallback
}
