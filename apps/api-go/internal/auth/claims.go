// Package auth contains JWT and device-key authentication helpers.
package auth

import "github.com/golang-jwt/jwt/v5"

// Claims represents tenant-scoped JWT claims used by API and WebSocket auth.
type Claims struct {
	UserID          string `json:"sub"`
	TenantID        string `json:"tenant_id"`
	Role            string `json:"role"`
	IsPlatformAdmin bool   `json:"is_platform_admin"`
	jwt.RegisteredClaims
}
