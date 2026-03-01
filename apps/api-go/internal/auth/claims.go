package auth

import "github.com/golang-jwt/jwt/v5"

type Claims struct {
	UserID          string `json:"sub"`
	TenantID        string `json:"tenant_id"`
	Role            string `json:"role"`
	IsPlatformAdmin bool   `json:"is_platform_admin"`
	jwt.RegisteredClaims
}
