// Package auth contains JWT and device-key authentication helpers.
package auth

import (
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v5"
)

type contextKey string

const (
	// ClaimsKey stores JWT claims in request context.
	ClaimsKey contextKey = "claims"
	// DeviceIDKey stores the authenticated device ID in request context.
	DeviceIDKey contextKey = "device_id"
	// TenantIDKey stores the authenticated tenant ID in request context.
	TenantIDKey contextKey = "tenant_id"
)

// JWTMiddleware validates a JWT token and injects claims into the request context.
func JWTMiddleware(secret string, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Support token in query param for WebSocket connections
		tokenStr := r.URL.Query().Get("token")
		if tokenStr == "" {
			if h := r.Header.Get("Authorization"); strings.HasPrefix(h, "Bearer ") {
				tokenStr = h[7:]
			}
		}

		if tokenStr == "" {
			writeError(w, http.StatusUnauthorized, "missing token")
			return
		}

		claims := &Claims{}
		token, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (any, error) {
			if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, jwt.ErrSignatureInvalid
			}
			return []byte(secret), nil
		})
		if err != nil || !token.Valid {
			writeError(w, http.StatusUnauthorized, "invalid token")
			return
		}

		ctx := context.WithValue(r.Context(), ClaimsKey, claims)
		ctx = context.WithValue(ctx, TenantIDKey, claims.TenantID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// DeviceAPIKeyMiddleware validates the X-Device-Key header against the devices table.
// On success it injects device_id and tenant_id into the request context.
func DeviceAPIKeyMiddleware(db *sql.DB, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		apiKey := r.Header.Get("X-Device-Key")
		if apiKey == "" {
			writeError(w, http.StatusUnauthorized, "missing X-Device-Key header")
			return
		}

		var deviceID, tenantID string
		//nolint:gosec // Query uses positional placeholders and no dynamic SQL construction.
		err := db.QueryRowContext(r.Context(),
			`SELECT id, tenant_id FROM devices WHERE api_key = $1 AND status != 'maintenance'`,
			apiKey,
		).Scan(&deviceID, &tenantID)
		if err == sql.ErrNoRows {
			writeError(w, http.StatusUnauthorized, "invalid device key")
			return
		}
		if err != nil {
			writeError(w, http.StatusInternalServerError, "db error")
			return
		}

		ctx := context.WithValue(r.Context(), DeviceIDKey, deviceID)
		ctx = context.WithValue(ctx, TenantIDKey, tenantID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// GetClaims returns JWT claims from request context.
func GetClaims(ctx context.Context) *Claims {
	c, _ := ctx.Value(ClaimsKey).(*Claims)
	return c
}

// GetDeviceID returns device ID from request context.
func GetDeviceID(ctx context.Context) string {
	v, _ := ctx.Value(DeviceIDKey).(string)
	return v
}

// GetTenantID returns tenant ID from request context.
func GetTenantID(ctx context.Context) string {
	v, _ := ctx.Value(TenantIDKey).(string)
	return v
}

func writeError(w http.ResponseWriter, code int, msg string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	if err := json.NewEncoder(w).Encode(map[string]string{"error": msg}); err != nil {
		http.Error(w, "failed to write error response", http.StatusInternalServerError)
	}
}
