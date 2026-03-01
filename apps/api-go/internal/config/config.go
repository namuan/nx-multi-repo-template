package config

import "os"

type Config struct {
	Port          string
	DatabaseURL   string
	JWTSecret     string
	AllowedOrigin string
}

func Load() *Config {
	return &Config{
		Port:          getEnv("PORT", "8080"),
		DatabaseURL:   getEnv("DATABASE_URL", "postgres://fleet_user:fleet_password@localhost:5432/fleet_db?sslmode=disable"),
		JWTSecret:     getEnv("JWT_SECRET", "fleet-super-secret-jwt-key-change-in-production"),
		AllowedOrigin: getEnv("ALLOWED_ORIGIN", "http://localhost:9100"),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
