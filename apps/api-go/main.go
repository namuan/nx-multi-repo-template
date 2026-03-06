// Package main starts the Go telemetry ingestion and WebSocket API service.
package main

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/nx-polyglot/api-go/internal/auth"
	"github.com/nx-polyglot/api-go/internal/config"
	"github.com/nx-polyglot/api-go/internal/db"
	"github.com/nx-polyglot/api-go/internal/ratelimit"
	"github.com/nx-polyglot/api-go/internal/telemetry"
	"github.com/nx-polyglot/api-go/internal/tracing"
	"github.com/nx-polyglot/api-go/internal/ws"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	slog.SetDefault(logger)

	cfg := config.Load()

	shutdownTracing, err := tracing.Init(context.Background(), "api-go")
	if err != nil {
		slog.Error("tracing init failed", "error", err)
		os.Exit(1)
	}
	defer func() {
		tCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		if tErr := shutdownTracing(tCtx); tErr != nil {
			slog.Warn("tracing shutdown error", "error", tErr)
		}
	}()

	database, err := db.Connect(cfg.DatabaseURL)
	if err != nil {
		slog.Error("database connection failed", "error", err)
		os.Exit(1)
	}
	defer func() {
		if closeErr := database.Close(); closeErr != nil {
			slog.Error("database close failed", "error", closeErr)
		}
	}()
	slog.Info("database connected")

	hub := ws.NewHub()
	go hub.Run()

	// Per-tenant rate limiter: 100 events/sec, burst 200
	limiter := ratelimit.NewTenantLimiter(100, 200)

	telemetryHandler := telemetry.NewHandler(database, hub, limiter)

	mux := http.NewServeMux()

	// Health + metrics
	mux.HandleFunc("/health", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(map[string]string{"status": "ok", "service": "api-go"}); err != nil {
			http.Error(w, "failed to write health payload", http.StatusInternalServerError)
		}
	})
	mux.Handle("/metrics", promhttp.Handler())

	// Telemetry ingestion — device API key auth
	mux.Handle("/api/devices/telemetry",
		auth.DeviceAPIKeyMiddleware(database,
			telemetryHandler,
		),
	)

	// WebSocket — JWT auth
	mux.Handle("/ws",
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			auth.JWTMiddleware(cfg.JWTSigningKey, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				tenantID := auth.GetTenantID(r.Context())
				ws.ServeWS(hub, tenantID, w, r)
			})).ServeHTTP(w, r)
		}),
	)

	handler := corsMiddleware(cfg.AllowedOrigin, otelhttp.NewHandler(mux, "api-go",
		otelhttp.WithSpanNameFormatter(func(_ string, r *http.Request) string {
			return r.Method + " " + r.URL.Path
		}),
	))

	server := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           handler,
		ReadHeaderTimeout: 5 * time.Second,
		IdleTimeout:       120 * time.Second,
	}

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	go func() {
		<-ctx.Done()
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()
		slog.Info("shutting down api-go")
		if err := server.Shutdown(shutdownCtx); err != nil {
			slog.Error("graceful shutdown failed", "error", err)
		}
	}()

	slog.Info("api-go listening", "port", cfg.Port)
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		slog.Error("server error", "error", err)
		os.Exit(1)
	}
	slog.Info("api-go stopped")
}

func corsMiddleware(allowedOrigin string, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", allowedOrigin)
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Device-Key")
		w.Header().Set("Access-Control-Allow-Credentials", "true")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}
