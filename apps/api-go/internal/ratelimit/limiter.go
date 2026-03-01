package ratelimit

import (
	"sync"
	"time"
)

// TenantLimiter enforces per-tenant token-bucket rate limiting.
type TenantLimiter struct {
	mu      sync.Mutex
	buckets map[string]*bucket
	rate    int // tokens per second
	burst   int // max burst
}

type bucket struct {
	tokens   float64
	lastSeen time.Time
}

func NewTenantLimiter(ratePerSec, burst int) *TenantLimiter {
	l := &TenantLimiter{
		buckets: make(map[string]*bucket),
		rate:    ratePerSec,
		burst:   burst,
	}
	// Cleanup goroutine removes idle buckets every minute
	go func() {
		t := time.NewTicker(time.Minute)
		for range t.C {
			l.cleanup()
		}
	}()
	return l
}

func (l *TenantLimiter) Allow(tenantID string) bool {
	l.mu.Lock()
	defer l.mu.Unlock()

	now := time.Now()
	b, ok := l.buckets[tenantID]
	if !ok {
		b = &bucket{tokens: float64(l.burst), lastSeen: now}
		l.buckets[tenantID] = b
	}

	// Refill tokens based on elapsed time
	elapsed := now.Sub(b.lastSeen).Seconds()
	b.tokens += elapsed * float64(l.rate)
	if b.tokens > float64(l.burst) {
		b.tokens = float64(l.burst)
	}
	b.lastSeen = now

	if b.tokens < 1 {
		return false
	}
	b.tokens--
	return true
}

func (l *TenantLimiter) cleanup() {
	l.mu.Lock()
	defer l.mu.Unlock()
	cutoff := time.Now().Add(-5 * time.Minute)
	for k, b := range l.buckets {
		if b.lastSeen.Before(cutoff) {
			delete(l.buckets, k)
		}
	}
}
