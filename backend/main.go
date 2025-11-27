package main

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"sync"
	"syscall"
	"time"

	"nebula/backend/internal/api"
	"nebula/backend/internal/config"
	"nebula/backend/internal/downloader"
	"nebula/backend/internal/logger"
	"nebula/backend/internal/manager"
	customMiddleware "nebula/backend/internal/middleware"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"golang.org/x/time/rate"
)

const (
	maxMultipartFormSize = 10 << 20
	progressHubBufferSize = 256
	defaultHistoryLimit = 100
)

type Server struct {
	router          *chi.Mux
	downloadManager *manager.DownloadManager
	configManager   *config.ConfigManager
	torrentService  *downloader.Service
	persistence     *downloader.PersistenceManager
	progressHub     *ProgressHub
}

type ProgressHub struct {
	clients    map[string]chan []byte
	broadcast  chan []byte
	register   chan *Client
	unregister chan *Client
	mu         sync.RWMutex
}

type Client struct {
	id     string
	send   chan []byte
	hub    *ProgressHub
	ctx    context.Context
	cancel context.CancelFunc
}

func NewProgressHub() *ProgressHub {
	return &ProgressHub{
		clients:    make(map[string]chan []byte),
		broadcast:  make(chan []byte),
		register:   make(chan *Client),
		unregister: make(chan *Client),
	}
}

func (h *ProgressHub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client.id] = client.send
			h.mu.Unlock()
		case client := <-h.unregister:
			h.mu.Lock()
			if ch, ok := h.clients[client.id]; ok {
				select {
				case <-ch:
				default:
				}
				close(ch)
				delete(h.clients, client.id)
			}
			h.mu.Unlock()
		case message := <-h.broadcast:
			h.mu.RLock()
			clientsCopy := make([]chan []byte, 0, len(h.clients))
			for _, ch := range h.clients {
				clientsCopy = append(clientsCopy, ch)
			}
			h.mu.RUnlock()
			
			for _, ch := range clientsCopy {
				select {
				case ch <- message:
				default:
				}
			}
		}
	}
}

func (h *ProgressHub) Broadcast(id string, data map[string]interface{}) {
	payload := map[string]interface{}{
		"id":   id,
		"data": data,
	}
	jsonData, err := json.Marshal(payload)
	if err != nil {
		logger.Error("failed to marshal progress payload: %v", err)
		return
	}
	select {
	case h.broadcast <- jsonData:
	default:
		logger.Warn("progress hub broadcast channel full, dropping message")
	}
}

type HTTPProgressReporter struct {
	hub           *ProgressHub
	name          string
	totalSize     int64
	peers         int
	lastBroadcast map[string]time.Time
	lastProgress  map[string]float64
	mu            sync.RWMutex
}

func NewHTTPProgressReporter(hub *ProgressHub) *HTTPProgressReporter {
	return &HTTPProgressReporter{
		hub:           hub,
		lastBroadcast: make(map[string]time.Time),
		lastProgress:  make(map[string]float64),
	}
}

func (r *HTTPProgressReporter) SetMeta(name string, totalSize int64, peers int) {
	r.name = name
	r.totalSize = totalSize
	r.peers = peers
}

func (r *HTTPProgressReporter) OnProgress(id string, percentage float64, downloadSpeed float64, uploadSpeed float64) {
	r.mu.Lock()
	defer r.mu.Unlock()
	
	// Throttle: só envia se passou pelo menos 1 segundo desde a última mensagem
	now := time.Now()
	lastTime, hasLastTime := r.lastBroadcast[id]
	lastProgress, hasLastProgress := r.lastProgress[id]
	
	// Throttle mínimo de 1 segundo entre mensagens
	if hasLastTime && now.Sub(lastTime) < 1*time.Second {
		// Só atualiza se o progresso mudou significativamente (> 1%)
		if hasLastProgress && math.Abs(percentage-lastProgress) < 1.0 {
			return
		}
	}
	
	// Só atualiza se o progresso mudou significativamente (> 0.5%)
	if hasLastProgress && math.Abs(percentage-lastProgress) < 0.5 {
		return
	}
	
	r.lastBroadcast[id] = now
	r.lastProgress[id] = percentage
	
	var eta int64
	if downloadSpeed > 0 && r.totalSize > 0 && percentage < 100 {
		remainingBytes := float64(r.totalSize) * (1 - percentage/100)
		eta = int64(remainingBytes / downloadSpeed)
	}

	r.hub.Broadcast(id, map[string]interface{}{
		"type":          "progress",
		"percentage":    percentage,
		"downloadSpeed": downloadSpeed,
		"uploadSpeed":   uploadSpeed,
		"name":          r.name,
		"totalSize":     r.totalSize,
		"peers":         r.peers,
		"eta":           eta,
	})
}

func (r *HTTPProgressReporter) OnLog(id string, message string) {
	r.hub.Broadcast(id, map[string]interface{}{
		"type":    "log",
		"message": message,
	})
}

func NewServer() (*Server, error) {
	appDataDir := filepath.Join(os.Getenv("APPDATA"), "Nebula")
	if os.Getenv("APPDATA") == "" {
		home, _ := os.UserHomeDir()
		appDataDir = filepath.Join(home, ".nebula")
	}

	logDir := filepath.Join(appDataDir, "logs")
	if err := logger.Init(logDir); err != nil {
		return nil, fmt.Errorf("init logger: %w", err)
	}

	// Inicializar API Key
	_, err := customMiddleware.InitAPIKey(appDataDir)
	if err != nil {
		return nil, fmt.Errorf("init api key: %w", err)
	}
	pm, err := downloader.NewPersistenceManager(appDataDir)
	if err != nil {
		return nil, fmt.Errorf("init persistence: %w", err)
	}

	cm, err := config.NewConfigManager(appDataDir)
	if err != nil {
		return nil, fmt.Errorf("init config: %w", err)
	}

	downloadConfig := &downloader.DownloadConfig{
		MaxDownloadSpeed: cm.GetMaxDownloadSpeed(),
		MaxUploadSpeed:   cm.GetMaxUploadSpeed(),
	}

	ts, err := downloader.NewService(downloadConfig, cm.Get().DefaultDownloadDir)
	if err != nil {
		return nil, fmt.Errorf("init torrent service: %w", err)
	}

	dm := manager.NewDownloadManager(ts, pm)
	hub := NewProgressHub()

	s := &Server{
		router:          chi.NewRouter(),
		downloadManager: dm,
		configManager:   cm,
		torrentService:  ts,
		persistence:     pm,
		progressHub:     hub,
	}

	s.setupRoutes()
	return s, nil
}

func (s *Server) setupRoutes() {
	s.router.Use(middleware.RequestID)
	s.router.Use(middleware.RealIP)
	s.router.Use(middleware.Logger)
	s.router.Use(customMiddleware.Recovery)
	s.router.Use(middleware.Timeout(60 * time.Second))
	s.router.Use(middleware.Compress(5))

	rateLimiter := customMiddleware.NewRateLimiter(rate.Limit(100), 200)
	s.router.Use(rateLimiter.Limit)

	ipRateLimiter := customMiddleware.NewIPRateLimiter(rate.Limit(20), 50)
	s.router.Use(ipRateLimiter.Limit)

	s.router.Use(customMiddleware.APIKeyAuth)

	s.router.Use(cors.Handler(cors.Options{
		AllowedOrigins: []string{
			"tauri://localhost",
			"http://localhost:5173",
			"http://127.0.0.1:5173",
		},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token", "X-Api-Key"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	s.router.Get("/health", api.HandleHealth)
	s.router.Get("/metrics", api.HandleMetrics)

	s.router.Route("/api", func(r chi.Router) {
		r.Route("/magnet", func(r chi.Router) {
			r.Post("/analyze", s.handleAnalyzeMagnet)
			r.Post("/download", s.handleDownload)
		})

		r.Route("/torrent", func(r chi.Router) {
			r.Post("/analyze", s.handleAnalyzeTorrentFile)
			r.Post("/analyze-bytes", s.handleAnalyzeTorrentBytes)
		})

		r.Route("/download", func(r chi.Router) {
			r.Get("/", s.handleListDownloads)
			r.Get("/{id}/status", s.handleGetDownloadStatus)
			r.Post("/{id}/pause", s.handlePauseDownload)
			r.Post("/{id}/resume", s.handleResumeDownload)
			r.Delete("/{id}", s.handleCancelDownload)
			r.Delete("/{id}/delete-files", s.handleDeleteDownloadFiles)
		})

		r.Route("/file", func(r chi.Router) {
			r.Put("/priority", s.handleSetFilePriority)
			r.Get("/priority", s.handleGetFilePriority)
		})

		r.Route("/history", func(r chi.Router) {
			r.Get("/", s.handleGetHistory)
			r.Get("/search", s.handleSearchHistory)
		})

		r.Route("/favorites", func(r chi.Router) {
			r.Get("/", s.handleGetFavorites)
			r.Post("/", s.handleAddFavorite)
			r.Delete("/{id}", s.handleRemoveFavorite)
			r.Get("/check", s.handleIsFavorite)
		})

		r.Route("/config", func(r chi.Router) {
			r.Get("/", s.handleGetConfig)
			r.Put("/download-speed", s.handleSetMaxDownloadSpeed)
			r.Put("/upload-speed", s.handleSetMaxUploadSpeed)
			r.Put("/default-dir", s.handleSetDefaultDir)
			r.Post("/reset", s.handleResetConfig)
		})

		r.Get("/file-types", s.handleGetFileTypes)
		r.Get("/progress", s.handleProgressSSE)
	})
}

func (s *Server) handleAnalyzeMagnet(w http.ResponseWriter, r *http.Request) {
	var req struct {
		MagnetLink string `json:"magnet_link"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		logger.Error("Failed to decode request: %v", err)
		api.RespondWithError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Validar magnet link
	if err := api.ValidateMagnetLink(req.MagnetLink); err != nil {
		logger.Warn("Invalid magnet link: %v", err)
		api.RespondWithError(w, http.StatusBadRequest, err.Error())
		return
	}

	files, name, err := s.torrentService.GetTorrentInfo(req.MagnetLink)
	if err != nil {
		logger.Error("Failed to get torrent info: %v", err)
		api.RespondWithError(w, http.StatusInternalServerError, "Failed to analyze torrent")
		return
	}

	infoHash := ""
	if len(req.MagnetLink) > 20 {
		start := len("magnet:?xt=urn:btih:")
		if len(req.MagnetLink) > start+40 {
			infoHash = req.MagnetLink[start : start+40]
		}
	}

	api.RespondWithJSON(w, http.StatusOK, map[string]interface{}{
		"files":       files,
		"name":        name,
		"info_hash":   infoHash,
		"magnet_link": req.MagnetLink,
		"total_size":  calculateTotalSize(files),
	})
}

func calculateTotalSize(files []downloader.FileMetadata) int64 {
	var total int64
	for _, f := range files {
		total += f.Size
	}
	return total
}

func (s *Server) handleAnalyzeTorrentFile(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(maxMultipartFormSize); err != nil {
		api.RespondWithError(w, http.StatusBadRequest, fmt.Sprintf("failed to parse multipart form: %v", err))
		return
	}

	file, _, err := r.FormFile("torrent")
	if err != nil {
		api.RespondWithError(w, http.StatusBadRequest, fmt.Sprintf("failed to get torrent file: %v", err))
		return
	}
	defer file.Close()

	data := make([]byte, maxMultipartFormSize)
	n, err := file.Read(data)
	if err != nil && err.Error() != "EOF" {
		api.RespondWithError(w, http.StatusBadRequest, fmt.Sprintf("failed to read file: %v", err))
		return
	}

	files, name, magnetLink, err := s.torrentService.AddTorrentFromBytes(data[:n])
	if err != nil {
		logger.Error("failed to analyze torrent file: %v", err)
		api.RespondWithError(w, http.StatusInternalServerError, "failed to analyze torrent file")
		return
	}

	api.RespondWithJSON(w, http.StatusOK, map[string]interface{}{
		"files":       files,
		"name":        name,
		"magnet_link": magnetLink,
	})
}

func (s *Server) handleAnalyzeTorrentBytes(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Data []byte `json:"data"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		api.RespondWithError(w, http.StatusBadRequest, fmt.Sprintf("invalid request body: %v", err))
		return
	}

	files, name, magnetLink, err := s.torrentService.AddTorrentFromBytes(req.Data)
	if err != nil {
		logger.Error("failed to analyze torrent bytes: %v", err)
		api.RespondWithError(w, http.StatusInternalServerError, "failed to analyze torrent data")
		return
	}

	api.RespondWithJSON(w, http.StatusOK, map[string]interface{}{
		"files":       files,
		"name":        name,
		"magnet_link": magnetLink,
	})
}

func (s *Server) handleDownload(w http.ResponseWriter, r *http.Request) {
	var req struct {
		MagnetLink      string `json:"magnet_link"`
		OutputDir       string `json:"output_dir"`
		SelectedIndices []int  `json:"selected_indices"`
		Sequential      bool   `json:"sequential"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		logger.Error("failed to decode download request", "error", err)
		api.RespondWithError(w, http.StatusBadRequest, fmt.Sprintf("invalid request body: %v", err))
		return
	}

	if req.MagnetLink == "" {
		api.RespondWithError(w, http.StatusBadRequest, "magnet_link is required")
		return
	}

	if req.OutputDir == "" {
		cfg := s.configManager.Get()
		req.OutputDir = cfg.DefaultDownloadDir
	}

	if err := api.ValidateOutputDir(req.OutputDir); err != nil {
		api.RespondWithError(w, http.StatusBadRequest, err.Error())
		return
	}

	if len(req.SelectedIndices) == 0 {
		api.RespondWithError(w, http.StatusBadRequest, "selected_indices cannot be empty")
		return
	}

	for _, idx := range req.SelectedIndices {
		if idx < 0 {
			api.RespondWithError(w, http.StatusBadRequest, fmt.Sprintf("invalid file index: %d (must be non-negative)", idx))
			return
		}
	}

	record := &downloader.DownloadRecord{
		ID:              "",
		MagnetLink:      req.MagnetLink,
		OutputDir:       req.OutputDir,
		SelectedIndices: req.SelectedIndices,
		Status:          "pending",
		Progress:        0,
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}

	reporter := NewHTTPProgressReporter(s.progressHub)
	id, err := s.downloadManager.StartDownload(r.Context(), req.MagnetLink, req.OutputDir, req.SelectedIndices, req.Sequential, reporter)
	if err != nil {
		logger.Error("failed to start download: %v", err)
		api.RespondWithError(w, http.StatusInternalServerError, "failed to start download")
		return
	}

	record.ID = id
	record.Status = "downloading"
	record.TorrentName = "Processing..."
	if err := s.persistence.SaveDownload(record); err != nil {
		logger.Warn("failed to save download record", "error", err)
	}

	api.RespondWithJSON(w, http.StatusOK, map[string]string{"id": id})
}

func (s *Server) handleListDownloads(w http.ResponseWriter, r *http.Request) {
	status := r.URL.Query().Get("status")
	
	allDownloads, err := s.persistence.GetAllDownloads()
	if err != nil {
		logger.Error("failed to get downloads: %v", err)
		api.RespondWithError(w, http.StatusInternalServerError, "failed to retrieve downloads")
		return
	}

	var filtered []*downloader.DownloadRecord
	if status != "" {
		for _, record := range allDownloads {
			if record.Status == status {
				filtered = append(filtered, record)
			}
		}
	} else {
		filtered = allDownloads
	}

	sort.Slice(filtered, func(i, j int) bool {
		return filtered[i].UpdatedAt.After(filtered[j].UpdatedAt)
	})

	api.RespondWithJSON(w, http.StatusOK, filtered)
}

func (s *Server) handleGetDownloadStatus(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		api.RespondWithError(w, http.StatusBadRequest, "download id required")
		return
	}

	record, err := s.persistence.GetDownload(id)
	if err != nil {
		logger.Error("failed to get download: %v", err)
		api.RespondWithError(w, http.StatusInternalServerError, "failed to retrieve download")
		return
	}
	if record == nil {
		api.RespondWithError(w, http.StatusNotFound, "download not found")
		return
	}

	api.RespondWithJSON(w, http.StatusOK, record)
}

func (s *Server) handlePauseDownload(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := s.downloadManager.PauseDownload(id); err != nil {
		logger.Warn("failed to pause download: %v", err)
		api.RespondWithError(w, http.StatusNotFound, "download not found")
		return
	}
	api.RespondWithJSON(w, http.StatusOK, map[string]string{"status": "paused"})
}

func (s *Server) handleResumeDownload(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := s.downloadManager.ResumeDownload(id); err != nil {
		logger.Warn("failed to resume download: %v", err)
		api.RespondWithError(w, http.StatusNotFound, "download not found")
		return
	}
	api.RespondWithJSON(w, http.StatusOK, map[string]string{"status": "resumed"})
}

func (s *Server) handleCancelDownload(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	_ = s.downloadManager.CancelDownload(id)
	
	if err := s.persistence.DeleteDownload(id); err != nil {
		logger.Error("failed to delete download record: %v", err)
		api.RespondWithError(w, http.StatusInternalServerError, "failed to delete download record")
		return
	}
	
	api.RespondWithJSON(w, http.StatusOK, map[string]string{"status": "cancelled"})
}

func (s *Server) handleDeleteDownloadFiles(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	
	record, err := s.persistence.GetDownload(id)
	if err != nil {
		logger.Error("failed to get download: %v", err)
		api.RespondWithError(w, http.StatusInternalServerError, "failed to retrieve download")
		return
	}
	
	if record == nil {
		records, _ := s.persistence.GetIncompleteDownloads()
		for _, r := range records {
			if r.ID == id {
				record = r
				break
			}
		}
	}
	
	_ = s.downloadManager.CancelDownload(id)
	
	if record != nil {
		if err := api.ValidateOutputDir(record.OutputDir); err != nil {
			api.RespondWithError(w, http.StatusBadRequest, "invalid output directory")
			return
		}
		
		torrentName := api.SanitizePath(record.TorrentName)
		if torrentName == "" {
			torrentName = "Unknown"
		}
		
		downloadPath := filepath.Join(record.OutputDir, torrentName)
		downloadPath = filepath.Clean(downloadPath)
		
		if !strings.HasPrefix(downloadPath, record.OutputDir) {
			api.RespondWithError(w, http.StatusBadRequest, "invalid download path")
			return
		}
		
		if err := os.RemoveAll(downloadPath); err != nil {
			logger.Warn("failed to delete download directory", "path", downloadPath, "error", err)
		}
	}
	
	if err := s.persistence.DeleteDownload(id); err != nil {
		logger.Error("failed to delete download record: %v", err)
		api.RespondWithError(w, http.StatusInternalServerError, "failed to delete download record")
		return
	}
	
	api.RespondWithJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

func (s *Server) handleSetFilePriority(w http.ResponseWriter, r *http.Request) {
	var req struct {
		MagnetLink string `json:"magnet_link"`
		FileIndex  int    `json:"file_index"`
		Priority   int    `json:"priority"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		api.RespondWithError(w, http.StatusBadRequest, fmt.Sprintf("invalid request body: %v", err))
		return
	}

	if err := s.torrentService.SetFilePriority(req.MagnetLink, req.FileIndex, downloader.FilePriority(req.Priority)); err != nil {
		logger.Error("failed to set file priority: %v", err)
		api.RespondWithError(w, http.StatusInternalServerError, "failed to set file priority")
		return
	}
	api.RespondWithJSON(w, http.StatusOK, map[string]string{"status": "updated"})
}

func (s *Server) handleGetFilePriority(w http.ResponseWriter, r *http.Request) {
	magnetLink := r.URL.Query().Get("magnet_link")
	fileIndex := 0
	fmt.Sscanf(r.URL.Query().Get("file_index"), "%d", &fileIndex)

	priority, err := s.torrentService.GetFilePriority(magnetLink, fileIndex)
	if err != nil {
		logger.Error("failed to get file priority: %v", err)
		api.RespondWithError(w, http.StatusInternalServerError, "failed to get file priority")
		return
	}

	api.RespondWithJSON(w, http.StatusOK, map[string]int{"priority": int(priority)})
}

func (s *Server) handleGetHistory(w http.ResponseWriter, r *http.Request) {
	limit := defaultHistoryLimit
	fmt.Sscanf(r.URL.Query().Get("limit"), "%d", &limit)

	records, err := s.persistence.GetHistory(limit)
	if err != nil {
		logger.Error("failed to get history: %v", err)
		api.RespondWithError(w, http.StatusInternalServerError, "failed to retrieve history")
		return
	}

	dtos := make([]*downloader.HistoryRecordDTO, len(records))
	for i, r := range records {
		dtos[i] = r.ToDTO()
	}

	api.RespondWithJSON(w, http.StatusOK, dtos)
}

func (s *Server) handleSearchHistory(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query().Get("q")
	records, err := s.persistence.SearchHistory(query)
	if err != nil {
		logger.Error("failed to search history: %v", err)
		api.RespondWithError(w, http.StatusInternalServerError, "failed to search history")
		return
	}

	dtos := make([]*downloader.HistoryRecordDTO, len(records))
	for i, r := range records {
		dtos[i] = r.ToDTO()
	}

	api.RespondWithJSON(w, http.StatusOK, dtos)
}

func (s *Server) handleGetFavorites(w http.ResponseWriter, r *http.Request) {
	records, err := s.persistence.GetFavorites()
	if err != nil {
		api.RespondWithError(w, http.StatusInternalServerError, err.Error())
		return
	}

	result := make([]map[string]interface{}, len(records))
	for i, fav := range records {
		result[i] = map[string]interface{}{
			"id":          fmt.Sprintf("%d", fav.ID),
			"name":        fav.TorrentName,
			"magnet_link": fav.MagnetLink,
			"created_at":  fav.AddedAt.Format(time.RFC3339),
		}
	}

	api.RespondWithJSON(w, http.StatusOK, result)
}

func (s *Server) handleAddFavorite(w http.ResponseWriter, r *http.Request) {
	var req struct {
		ID         string   `json:"id"`
		Name       string   `json:"name"`
		MagnetLink string   `json:"magnet_link"`
		Tags       []string `json:"tags"`
		Notes      string   `json:"notes"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		api.RespondWithError(w, http.StatusBadRequest, err.Error())
		return
	}

	if req.MagnetLink == "" {
		api.RespondWithError(w, http.StatusBadRequest, "magnet_link is required")
		return
	}

	name := req.Name
	if name == "" {
		name = "Download Favorito"
	}

	if err := s.persistence.AddFavorite(req.MagnetLink, name, req.Tags, req.Notes); err != nil {
		logger.Error("failed to add favorite: %v", err)
		api.RespondWithError(w, http.StatusInternalServerError, "failed to add favorite")
		return
	}
	
	api.RespondWithJSON(w, http.StatusCreated, map[string]string{"status": "created"})
}

func (s *Server) handleRemoveFavorite(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	
	id, err := strconv.Atoi(idStr)
	if err != nil {
		api.RespondWithError(w, http.StatusBadRequest, "Invalid ID format")
		return
	}
	
	favorites, err := s.persistence.GetFavorites()
	if err != nil {
		api.RespondWithError(w, http.StatusInternalServerError, "Failed to get favorites")
		return
	}
	
	var targetMagnet string
	for _, fav := range favorites {
		if fav.ID == id {
			targetMagnet = fav.MagnetLink
			break
		}
	}
	
	if targetMagnet == "" {
		api.RespondWithError(w, http.StatusNotFound, "Favorite not found")
		return
	}
	
	if err := s.persistence.RemoveFavorite(targetMagnet); err != nil {
		logger.Error("failed to remove favorite: %v", err)
		api.RespondWithError(w, http.StatusInternalServerError, "failed to remove favorite")
		return
	}
	
	api.RespondWithJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

func (s *Server) handleIsFavorite(w http.ResponseWriter, r *http.Request) {
	magnetLink := r.URL.Query().Get("magnet_link")
	isFavorite, err := s.persistence.IsFavorite(magnetLink)
	if err != nil {
		logger.Error("failed to check favorite: %v", err)
		api.RespondWithError(w, http.StatusInternalServerError, "failed to check favorite status")
		return
	}

	api.RespondWithJSON(w, http.StatusOK, map[string]bool{"is_favorite": isFavorite})
}

func (s *Server) handleGetConfig(w http.ResponseWriter, r *http.Request) {
	cfg := s.configManager.Get()
	// Retornar valores em bytes/s para o frontend
	api.RespondWithJSON(w, http.StatusOK, map[string]interface{}{
		"max_download_speed": cfg.MaxDownloadSpeed,
		"max_upload_speed":   cfg.MaxUploadSpeed,
		"default_download_dir": cfg.DefaultDownloadDir,
	})
}

func (s *Server) handleSetMaxDownloadSpeed(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Speed            int64 `json:"speed"`
		MaxDownloadSpeed int64 `json:"max_download_speed"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		api.RespondWithError(w, http.StatusBadRequest, fmt.Sprintf("invalid request body: %v", err))
		return
	}

	speed := req.Speed
	if req.MaxDownloadSpeed > 0 {
		speed = req.MaxDownloadSpeed
	}

	// Frontend envia em bytes/s, backend salva em bytes/s (não precisa converter)
	if err := s.configManager.Set("max_download_speed", speed); err != nil {
		logger.Error("failed to set max download speed: %v", err)
		api.RespondWithError(w, http.StatusInternalServerError, "failed to update download speed limit")
		return
	}

	s.torrentService.UpdateLimits(&downloader.DownloadConfig{
		MaxDownloadSpeed: s.configManager.Get().MaxDownloadSpeed,
		MaxUploadSpeed:   s.configManager.Get().MaxUploadSpeed,
	})

	api.RespondWithJSON(w, http.StatusOK, map[string]string{"status": "updated"})
}

func (s *Server) handleSetMaxUploadSpeed(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Speed          int64 `json:"speed"`
		MaxUploadSpeed int64 `json:"max_upload_speed"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		api.RespondWithError(w, http.StatusBadRequest, fmt.Sprintf("invalid request body: %v", err))
		return
	}

	speed := req.Speed
	if req.MaxUploadSpeed > 0 {
		speed = req.MaxUploadSpeed
	}

	// Frontend envia em bytes/s, backend salva em bytes/s (não precisa converter)
	if err := s.configManager.Set("max_upload_speed", speed); err != nil {
		logger.Error("failed to set max upload speed: %v", err)
		api.RespondWithError(w, http.StatusInternalServerError, "failed to update upload speed limit")
		return
	}

	s.torrentService.UpdateLimits(&downloader.DownloadConfig{
		MaxDownloadSpeed: s.configManager.Get().MaxDownloadSpeed,
		MaxUploadSpeed:   s.configManager.Get().MaxUploadSpeed,
	})

	api.RespondWithJSON(w, http.StatusOK, map[string]string{"status": "updated"})
}

func (s *Server) handleSetDefaultDir(w http.ResponseWriter, r *http.Request) {
	var req struct {
		DefaultDownloadDir string `json:"default_download_dir"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		api.RespondWithError(w, http.StatusBadRequest, fmt.Sprintf("invalid request body: %v", err))
		return
	}

	if req.DefaultDownloadDir == "" {
		api.RespondWithError(w, http.StatusBadRequest, "default_download_dir cannot be empty")
		return
	}

	if err := s.configManager.Set("default_download_dir", req.DefaultDownloadDir); err != nil {
		logger.Error("failed to set default download dir: %v", err)
		api.RespondWithError(w, http.StatusInternalServerError, "failed to update default directory")
		return
	}

	api.RespondWithJSON(w, http.StatusOK, map[string]string{"status": "updated"})
}

func (s *Server) handleResetConfig(w http.ResponseWriter, r *http.Request) {
	defaultConfig := config.DefaultConfig()
	
	if err := s.configManager.Set("max_download_speed", defaultConfig.MaxDownloadSpeed); err != nil {
		logger.Error("failed to reset max download speed: %v", err)
	}
	if err := s.configManager.Set("max_upload_speed", defaultConfig.MaxUploadSpeed); err != nil {
		logger.Error("failed to reset max upload speed: %v", err)
	}
	if err := s.configManager.Set("default_download_dir", defaultConfig.DefaultDownloadDir); err != nil {
		logger.Error("failed to reset default download dir: %v", err)
	}

	api.RespondWithJSON(w, http.StatusOK, map[string]string{"status": "reset"})
}

func (s *Server) handleGetFileTypes(w http.ResponseWriter, r *http.Request) {
	types := map[string]map[string]string{
		"video":      {"icon": "VID", "color": "#ef4444", "display": "Vídeo"},
		"audio":      {"icon": "AUD", "color": "#8b5cf6", "display": "Áudio"},
		"image":      {"icon": "IMG", "color": "#06b6d4", "display": "Imagem"},
		"document":   {"icon": "DOC", "color": "#3b82f6", "display": "Documento"},
		"archive":    {"icon": "ZIP", "color": "#f59e0b", "display": "Arquivo"},
		"subtitle":   {"icon": "SUB", "color": "#10b981", "display": "Legenda"},
		"executable": {"icon": "EXE", "color": "#ef4444", "display": "Executável"},
		"other":      {"icon": "FILE", "color": "#9ca3af", "display": "Outro"},
	}

	api.RespondWithJSON(w, http.StatusOK, types)
}

func (s *Server) handleProgressSSE(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")

	ctx, cancel := context.WithCancel(r.Context())
	defer cancel()

	clientID := r.URL.Query().Get("id")
	if clientID == "" {
		clientID = fmt.Sprintf("client-%d", time.Now().UnixNano())
	}

	client := &Client{
		id:     clientID,
		send:   make(chan []byte, progressHubBufferSize),
		hub:    s.progressHub,
		ctx:    ctx,
		cancel: cancel,
	}

	s.progressHub.register <- client

	go func() {
		<-ctx.Done()
		s.progressHub.unregister <- client
	}()

	for {
		select {
		case <-ctx.Done():
			return
		case message := <-client.send:
			fmt.Fprintf(w, "data: %s\n\n", message)
			if f, ok := w.(http.Flusher); ok {
				f.Flush()
			}
		}
	}
}

func (s *Server) Start(addr string) error {
	srv := &http.Server{
		Addr:         addr,
		Handler:      s.router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	var wg sync.WaitGroup
	wg.Add(1)
	go func() {
		defer wg.Done()
		s.progressHub.Run()
	}()

	s.loadIncompleteDownloads()

	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)

	go func() {
		<-sigChan
		logger.Info("shutting down server...")
		
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()
		
		if err := srv.Shutdown(shutdownCtx); err != nil {
			logger.Error("server forced to shutdown: %v", err)
		}
		
		s.downloadManager.Shutdown()
		if s.torrentService != nil {
			s.torrentService.Close()
		}
		if s.persistence != nil {
			s.persistence.Close()
		}
		
		close(s.progressHub.broadcast)
		wg.Wait()
		
		logger.Info("server shutdown complete")
	}()

	logger.Info("server starting", "addr", addr)
	err := srv.ListenAndServe()
	if err != nil && err != http.ErrServerClosed {
		return err
	}
	return nil
}

func (s *Server) loadIncompleteDownloads() {
	records, err := s.persistence.GetIncompleteDownloads()
	if err != nil {
		logger.Error("failed to load incomplete downloads", "error", err)
		return
	}

	reporter := NewHTTPProgressReporter(s.progressHub)
	for _, record := range records {
		if record.Status == "downloading" {
			ctx := context.Background()
			_, err := s.downloadManager.StartDownloadWithID(ctx, record.ID, record.MagnetLink, record.OutputDir, record.SelectedIndices, false, reporter)
			if err != nil {
				logger.Warn("failed to resume download", "id", record.ID, "error", err)
			}
		}
	}
}

func main() {
	server, err := NewServer()
	if err != nil {
		logger.Error("failed to create server", "error", err)
		os.Exit(1)
	}

	addr := os.Getenv("NEBULA_ADDR")
	if addr == "" {
		addr = "127.0.0.1:8080"
	}

	if err := server.Start(addr); err != nil && err != http.ErrServerClosed {
		logger.Error("server error", "error", err)
		os.Exit(1)
	}
}

