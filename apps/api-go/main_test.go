package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestHealthHandler(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	rr := httptest.NewRecorder()

	healthHandler(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", rr.Code)
	}
	if ct := rr.Header().Get("Content-Type"); ct != "application/json" {
		t.Errorf("expected Content-Type application/json, got %s", ct)
	}

	var response HealthResponse
	if err := json.Unmarshal(rr.Body.Bytes(), &response); err != nil {
		t.Fatalf("failed to parse health response: %v", err)
	}
	if response.Status != "ok" || response.Service != "api-go" {
		t.Fatalf("unexpected health response: %#v", response)
	}
}

func TestHelloHandler(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/api/hello", nil)
	rr := httptest.NewRecorder()

	helloHandler(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", rr.Code)
	}

	var response MessageResponse
	if err := json.Unmarshal(rr.Body.Bytes(), &response); err != nil {
		t.Fatalf("failed to parse hello response: %v", err)
	}
	if response.Message != "Hello from Go API!" {
		t.Fatalf("unexpected hello message: %s", response.Message)
	}
}

func TestCorsMiddleware_AllowsConfiguredOrigin(t *testing.T) {
	mux := http.NewServeMux()
	mux.HandleFunc("/health", healthHandler)
	handler := corsMiddleware("https://frontend.example.com", mux)

	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	rr := httptest.NewRecorder()

	handler.ServeHTTP(rr, req)

	if rr.Header().Get("Access-Control-Allow-Origin") != "https://frontend.example.com" {
		t.Fatalf("unexpected allow-origin header: %s", rr.Header().Get("Access-Control-Allow-Origin"))
	}
}

func TestCorsMiddleware_OptionsReturnsNoContent(t *testing.T) {
	handler := corsMiddleware("https://frontend.example.com", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusTeapot)
	}))

	req := httptest.NewRequest(http.MethodOptions, "/api/hello", nil)
	rr := httptest.NewRecorder()

	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusNoContent {
		t.Fatalf("expected 204 for OPTIONS, got %d", rr.Code)
	}
}
