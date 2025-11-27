package middleware

import (
	"net/http"
	"sync"
	"time"

	"golang.org/x/time/rate"
)

type RateLimiter struct {
	limiter *rate.Limiter
}

func NewRateLimiter(r rate.Limit, b int) *RateLimiter {
	return &RateLimiter{
		limiter: rate.NewLimiter(r, b),
	}
}

func (rl *RateLimiter) Limit(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !rl.limiter.Allow() {
			http.Error(w, "Too many requests", http.StatusTooManyRequests)
			return
		}
		next.ServeHTTP(w, r)
	})
}

type ipEntry struct {
	limiter   *rate.Limiter
	lastSeen  time.Time
}

type IPRateLimiter struct {
	ips       map[string]*ipEntry
	mu        sync.RWMutex
	r         rate.Limit
	b         int
	cleanupInterval time.Duration
	inactiveTimeout time.Duration
}

func NewIPRateLimiter(r rate.Limit, b int) *IPRateLimiter {
	limiter := &IPRateLimiter{
		ips:             make(map[string]*ipEntry),
		r:               r,
		b:               b,
		cleanupInterval: 30 * time.Minute,
		inactiveTimeout: 1 * time.Hour,
	}
	
	go limiter.cleanup()
	
	return limiter
}

func (i *IPRateLimiter) cleanup() {
	ticker := time.NewTicker(i.cleanupInterval)
	defer ticker.Stop()
	
	for range ticker.C {
		now := time.Now()
		i.mu.Lock()
		for ip, entry := range i.ips {
			if now.Sub(entry.lastSeen) > i.inactiveTimeout {
				delete(i.ips, ip)
			}
		}
		i.mu.Unlock()
	}
}

func (i *IPRateLimiter) GetLimiter(ip string) *rate.Limiter {
	i.mu.Lock()
	defer i.mu.Unlock()

	entry, exists := i.ips[ip]
	if !exists {
		entry = &ipEntry{
			limiter:  rate.NewLimiter(i.r, i.b),
			lastSeen: time.Now(),
		}
		i.ips[ip] = entry
	} else {
		entry.lastSeen = time.Now()
	}

	return entry.limiter
}

func (i *IPRateLimiter) Limit(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip := r.Header.Get("X-Real-IP")
		if ip == "" {
			ip = r.Header.Get("X-Forwarded-For")
		}
		if ip == "" {
			ip = r.RemoteAddr
		}

		limiter := i.GetLimiter(ip)
		if !limiter.Allow() {
			http.Error(w, "Rate limit exceeded for your IP", http.StatusTooManyRequests)
			return
		}

		next.ServeHTTP(w, r)
	})
}
