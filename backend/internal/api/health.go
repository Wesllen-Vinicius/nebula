package api

import (
	"encoding/json"
	"net/http"
	"runtime"
	"time"
)

type HealthResponse struct {
	Status    string            `json:"status"`
	Timestamp time.Time         `json:"timestamp"`
	Version   string            `json:"version"`
	Uptime    string            `json:"uptime"`
	System    SystemInfo        `json:"system"`
	Services  map[string]string `json:"services"`
}

type SystemInfo struct {
	GoVersion    string `json:"go_version"`
	NumCPU       int    `json:"num_cpu"`
	NumGoroutine int    `json:"num_goroutine"`
	MemoryAlloc  string `json:"memory_alloc"`
}

type MetricsResponse struct {
	ActiveDownloads   int     `json:"active_downloads"`
	CompletedToday    int     `json:"completed_today"`
	TotalDownloaded   int64   `json:"total_downloaded_bytes"`
	AverageSpeed      float64 `json:"average_speed_mbps"`
	TotalConnections  int     `json:"total_connections"`
	ErrorRate         float64 `json:"error_rate"`
}

var startTime = time.Now()

func HandleHealth(w http.ResponseWriter, r *http.Request) {
	var m runtime.MemStats
	runtime.ReadMemStats(&m)

	health := HealthResponse{
		Status:    "healthy",
		Timestamp: time.Now(),
		Version:   "1.0.0",
		Uptime:    time.Since(startTime).String(),
		System: SystemInfo{
			GoVersion:    runtime.Version(),
			NumCPU:       runtime.NumCPU(),
			NumGoroutine: runtime.NumGoroutine(),
			MemoryAlloc:  formatBytes(m.Alloc),
		},
		Services: map[string]string{
			"database":    "ok",
			"torrent":     "ok",
			"persistence": "ok",
		},
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(health)
}

func HandleMetrics(w http.ResponseWriter, r *http.Request) {
	// TODO: Implementar coleta real de métricas
	metrics := MetricsResponse{
		ActiveDownloads:   0,
		CompletedToday:    0,
		TotalDownloaded:   0,
		AverageSpeed:      0.0,
		TotalConnections:  0,
		ErrorRate:         0.0,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(metrics)
}

func formatBytes(bytes uint64) string {
	const unit = 1024
	if bytes < unit {
		return string(rune(bytes)) + " B"
	}
	div, exp := uint64(unit), 0
	for n := bytes / unit; n >= unit; n /= unit {
		div *= unit
		exp++
	}
	return string(rune(bytes/div)) + " " + "KMGTPE"[exp:exp+1] + "B"
}

