package middleware

import (
	"net/http"
	"sync"
	"time"

	"golang.org/x/time/rate"
)

// EndpointRateLimitConfig define os limites por endpoint
type EndpointRateLimitConfig struct {
	Rate  rate.Limit
	Burst int
}

// EndpointRateLimiter implementa rate limiting por endpoint
type EndpointRateLimiter struct {
	configs  map[string]EndpointRateLimitConfig
	limiters map[string]map[string]*rate.Limiter // endpoint -> IP -> limiter
	mu       sync.RWMutex
	default_ EndpointRateLimitConfig
}

// DefaultEndpointLimits retorna configurações padrão por endpoint
func DefaultEndpointLimits() map[string]EndpointRateLimitConfig {
	return map[string]EndpointRateLimitConfig{
		"/api/magnet/analyze":       {Rate: rate.Limit(5), Burst: 10},
		"/api/torrent/analyze":      {Rate: rate.Limit(5), Burst: 10},
		"/api/torrent/analyze-bytes": {Rate: rate.Limit(5), Burst: 10},

		// Endpoints de download - moderados
		"/api/magnet/download": {Rate: rate.Limit(10), Burst: 20},

		"/api/download":   {Rate: rate.Limit(30), Burst: 60},
		"/api/favorites":  {Rate: rate.Limit(30), Burst: 60},
		"/api/history":    {Rate: rate.Limit(30), Burst: 60},
		"/api/config":     {Rate: rate.Limit(30), Burst: 60},

		// SSE - muito permissivo (conexões longas)
		"/api/progress": {Rate: rate.Limit(100), Burst: 200},
	}
}

// NewEndpointRateLimiter cria um novo rate limiter por endpoint
func NewEndpointRateLimiter(configs map[string]EndpointRateLimitConfig) *EndpointRateLimiter {
	return &EndpointRateLimiter{
		configs:  configs,
		limiters: make(map[string]map[string]*rate.Limiter),
		default_: EndpointRateLimitConfig{Rate: rate.Limit(20), Burst: 40},
	}
}

// getLimiter retorna ou cria um limiter para endpoint/IP
func (erl *EndpointRateLimiter) getLimiter(endpoint, ip string) *rate.Limiter {
	erl.mu.RLock()
	if endpointLimiters, ok := erl.limiters[endpoint]; ok {
		if limiter, ok := endpointLimiters[ip]; ok {
			erl.mu.RUnlock()
			return limiter
		}
	}
	erl.mu.RUnlock()

	// Criar novo limiter
	erl.mu.Lock()
	defer erl.mu.Unlock()

	// Double-check
	if _, ok := erl.limiters[endpoint]; !ok {
		erl.limiters[endpoint] = make(map[string]*rate.Limiter)
	}

	if limiter, ok := erl.limiters[endpoint][ip]; ok {
		return limiter
	}

	// Obter config para este endpoint
	config, ok := erl.configs[endpoint]
	if !ok {
		config = erl.default_
	}

	limiter := rate.NewLimiter(config.Rate, config.Burst)
	erl.limiters[endpoint][ip] = limiter

	return limiter
}

// Limit é o middleware de rate limiting por endpoint
func (erl *EndpointRateLimiter) Limit(next http.Handler) http.Handler {
	// Goroutine para limpeza periódica
	go func() {
		ticker := time.NewTicker(30 * time.Minute)
		defer ticker.Stop()

		for range ticker.C {
			erl.mu.Lock()
			// Limpar limiters antigos (sem atividade recente)
			for endpoint := range erl.limiters {
				if len(erl.limiters[endpoint]) > 1000 {
					// Limpar metade dos limiters se houver muitos
					count := 0
					for ip := range erl.limiters[endpoint] {
						if count%2 == 0 {
							delete(erl.limiters[endpoint], ip)
						}
						count++
					}
				}
			}
			erl.mu.Unlock()
		}
	}()

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip := r.RemoteAddr
		if forwarded := r.Header.Get("X-Forwarded-For"); forwarded != "" {
			ip = forwarded
		}

		limiter := erl.getLimiter(r.URL.Path, ip)

		if !limiter.Allow() {
			w.Header().Set("Retry-After", "1")
			http.Error(w, "Too Many Requests", http.StatusTooManyRequests)
			return
		}

		next.ServeHTTP(w, r)
	})
}

