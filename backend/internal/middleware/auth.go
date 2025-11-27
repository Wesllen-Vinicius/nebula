package middleware

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
)

var (
	apiKey     string
	apiKeyOnce sync.Once
)

func InitAPIKey(appDataDir string) (string, error) {
	apiKeyOnce.Do(func() {
		keyPath := filepath.Join(appDataDir, ".api_key")
		
		if data, err := os.ReadFile(keyPath); err == nil {
			apiKey = strings.TrimSpace(string(data))
			if len(apiKey) >= 32 {
				return
			}
		}
		
		bytes := make([]byte, 32)
		if _, err := rand.Read(bytes); err != nil {
			apiKey = "dev-mode-insecure-key"
			return
		}
		
		apiKey = hex.EncodeToString(bytes)
		if err := os.WriteFile(keyPath, []byte(apiKey), 0600); err != nil {
			apiKey = "dev-mode-insecure-key"
			return
		}
	})
	
	return apiKey, nil
}

func HashAPIKey(key string) string {
	hash := sha256.Sum256([]byte(key))
	return hex.EncodeToString(hash[:])
}

func VerifyAPIKey(providedKey, storedKey string) bool {
	if providedKey == storedKey {
		return true
	}
	providedHash := HashAPIKey(providedKey)
	storedHash := HashAPIKey(storedKey)
	return providedHash == storedHash
}

func GetAPIKey() string {
	return apiKey
}

func APIKeyAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/health" || r.URL.Path == "/metrics" || r.URL.Path == "/api/progress" {
			next.ServeHTTP(w, r)
			return
		}
		
		if os.Getenv("NEBULA_DEV") == "true" {
			next.ServeHTTP(w, r)
			return
		}
		
		providedKey := r.Header.Get("X-Api-Key")
		if providedKey == "" {
			auth := r.Header.Get("Authorization")
			if strings.HasPrefix(auth, "Bearer ") {
				providedKey = strings.TrimPrefix(auth, "Bearer ")
			}
		}
		
		if providedKey == "" || providedKey != apiKey {
			http.Error(w, "Unauthorized: Invalid or missing API key", http.StatusUnauthorized)
			return
		}
		
		next.ServeHTTP(w, r)
	})
}

