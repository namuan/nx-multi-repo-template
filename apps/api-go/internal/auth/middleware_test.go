package auth

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

func TestJWTMiddlewareMissingTokenReturnsUnauthorized(t *testing.T) {
	handler := JWTMiddleware("test-secret", http.HandlerFunc(func(http.ResponseWriter, *http.Request) {
		t.Fatal("next handler should not be called without a token")
	}))

	req := httptest.NewRequest(http.MethodGet, "/ws", nil)
	rr := httptest.NewRecorder()

	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Fatalf("expected status %d, got %d", http.StatusUnauthorized, rr.Code)
	}
}

func TestJWTMiddlewareMissingTenantClaimReturnsUnauthorized(t *testing.T) {
	token := signedToken(t, "test-secret", Claims{UserID: "user-1", Role: "fleet_admin"})

	handler := JWTMiddleware("test-secret", http.HandlerFunc(func(http.ResponseWriter, *http.Request) {
		t.Fatal("next handler should not be called for invalid claims")
	}))

	req := httptest.NewRequest(http.MethodGet, "/ws?token="+token, nil)
	rr := httptest.NewRecorder()

	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Fatalf("expected status %d, got %d", http.StatusUnauthorized, rr.Code)
	}
}

func TestJWTMiddlewareInvalidRoleReturnsUnauthorized(t *testing.T) {
	token := signedToken(t, "test-secret", Claims{UserID: "user-1", TenantID: "tenant-1", Role: "hacker"})

	handler := JWTMiddleware("test-secret", http.HandlerFunc(func(http.ResponseWriter, *http.Request) {
		t.Fatal("next handler should not be called for invalid role")
	}))

	req := httptest.NewRequest(http.MethodGet, "/ws?token="+token, nil)
	rr := httptest.NewRecorder()

	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Fatalf("expected status %d, got %d", http.StatusUnauthorized, rr.Code)
	}
}

func TestJWTMiddlewareValidTokenCallsNextWithTenantContext(t *testing.T) {
	token := signedToken(t, "test-secret", Claims{UserID: "user-1", TenantID: "tenant-1", Role: "fleet_admin"})

	handler := JWTMiddleware("test-secret", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if got := GetTenantID(r.Context()); got != "tenant-1" {
			t.Fatalf("expected tenant context to be tenant-1, got %q", got)
		}
		if claims := GetClaims(r.Context()); claims == nil || claims.Role != "fleet_admin" {
			t.Fatalf("expected claims in context with fleet_admin role")
		}
		w.WriteHeader(http.StatusNoContent)
	}))

	req := httptest.NewRequest(http.MethodGet, "/ws?token="+token, nil)
	rr := httptest.NewRecorder()

	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusNoContent {
		t.Fatalf("expected status %d, got %d", http.StatusNoContent, rr.Code)
	}
}

func TestDeviceAPIKeyMiddlewareMissingHeaderReturnsUnauthorized(t *testing.T) {
	handler := DeviceAPIKeyMiddleware(nil, http.HandlerFunc(func(http.ResponseWriter, *http.Request) {
		t.Fatal("next handler should not be called without a device key")
	}))

	req := httptest.NewRequest(http.MethodPost, "/api/devices/telemetry", nil)
	rr := httptest.NewRecorder()

	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Fatalf("expected status %d, got %d", http.StatusUnauthorized, rr.Code)
	}
}

func signedToken(t *testing.T, secret string, claims Claims) string {
	t.Helper()
	claims.RegisteredClaims = jwt.RegisteredClaims{
		ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour)),
		IssuedAt:  jwt.NewNumericDate(time.Now()),
	}

	token, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(secret))
	if err != nil {
		t.Fatalf("failed to sign test token: %v", err)
	}

	return token
}
