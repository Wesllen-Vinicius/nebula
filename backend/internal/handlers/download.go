package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"nebula/backend/internal/api"
	"nebula/backend/internal/downloader"
	"nebula/backend/internal/logger"

	"github.com/go-chi/chi/v5"
)

// DownloadHandler gerencia operações de download
type DownloadHandler struct {
	deps            *Dependencies
	reporterFactory ProgressReporterFactory
}

// NewDownloadHandler cria um novo handler de download
func NewDownloadHandler(deps *Dependencies, factory ProgressReporterFactory) *DownloadHandler {
	return &DownloadHandler{
		deps:            deps,
		reporterFactory: factory,
	}
}

// HandleDownload inicia um novo download
func (h *DownloadHandler) HandleDownload(w http.ResponseWriter, r *http.Request) {
	var req struct {
		MagnetLink      string `json:"magnet_link"`
		OutputDir       string `json:"output_dir"`
		SelectedIndices []int  `json:"selected_indices"`
		Sequential      bool   `json:"sequential"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		logger.Error("failed to decode download request: %v", err)
		api.RespondWithError(w, http.StatusBadRequest, fmt.Sprintf("invalid request body: %v", err))
		return
	}

	if req.MagnetLink == "" {
		api.RespondWithError(w, http.StatusBadRequest, "magnet_link is required")
		return
	}

	if req.OutputDir == "" {
		cfg := h.deps.ConfigManager.Get()
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

	seen := make(map[int]bool)
	for _, idx := range req.SelectedIndices {
		if idx < 0 {
			api.RespondWithError(w, http.StatusBadRequest, fmt.Sprintf("invalid file index: %d (must be non-negative)", idx))
			return
		}
		if seen[idx] {
			api.RespondWithError(w, http.StatusBadRequest, fmt.Sprintf("duplicate file index: %d", idx))
			return
		}
		seen[idx] = true
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

	reporter := h.reporterFactory.NewReporter()
	id, err := h.deps.DownloadManager.StartDownload(r.Context(), req.MagnetLink, req.OutputDir, req.SelectedIndices, req.Sequential, reporter)
	if err != nil {
		logger.Error("failed to start download: %v", err)
		api.RespondWithError(w, http.StatusInternalServerError, "failed to start download")
		return
	}

	record.ID = id
	record.Status = "downloading"
	record.TorrentName = "Processing..."
	if err := h.deps.Persistence.SaveDownload(record); err != nil {
		logger.Warn("failed to save download record: %v", err)
	}

	api.RespondWithJSON(w, http.StatusOK, map[string]string{"id": id})
}

// HandleListDownloads lista todos os downloads
func (h *DownloadHandler) HandleListDownloads(w http.ResponseWriter, r *http.Request) {
	status := r.URL.Query().Get("status")

	allDownloads, err := h.deps.Persistence.GetAllDownloads()
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

// HandleGetDownloadStatus retorna o status de um download
func (h *DownloadHandler) HandleGetDownloadStatus(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		api.RespondWithError(w, http.StatusBadRequest, "download id required")
		return
	}

	record, err := h.deps.Persistence.GetDownload(id)
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

// HandlePauseDownload pausa um download
func (h *DownloadHandler) HandlePauseDownload(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := h.deps.DownloadManager.PauseDownload(id); err != nil {
		logger.Warn("failed to pause download: %v", err)
		api.RespondWithError(w, http.StatusNotFound, "download not found")
		return
	}
	api.RespondWithJSON(w, http.StatusOK, map[string]string{"status": "paused"})
}

// HandleResumeDownload retoma um download pausado
func (h *DownloadHandler) HandleResumeDownload(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := h.deps.DownloadManager.ResumeDownload(id); err != nil {
		logger.Warn("failed to resume download: %v", err)
		api.RespondWithError(w, http.StatusNotFound, "download not found")
		return
	}
	api.RespondWithJSON(w, http.StatusOK, map[string]string{"status": "resumed"})
}

// HandleCancelDownload cancela um download
func (h *DownloadHandler) HandleCancelDownload(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		api.RespondWithError(w, http.StatusBadRequest, "download id required")
		return
	}

	_ = h.deps.DownloadManager.CancelDownload(id)

	if err := h.deps.Persistence.DeleteDownload(id); err != nil {
		logger.Warn("failed to delete download record (may not exist): %v", err)
	}

	api.RespondWithJSON(w, http.StatusOK, map[string]string{"status": "cancelled"})
}

// HandleDeleteDownloadFiles deleta os arquivos de um download
func (h *DownloadHandler) HandleDeleteDownloadFiles(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	record, err := h.deps.Persistence.GetDownload(id)
	if err != nil {
		logger.Error("failed to get download: %v", err)
		api.RespondWithError(w, http.StatusInternalServerError, "failed to retrieve download")
		return
	}

	if record == nil {
		records, _ := h.deps.Persistence.GetIncompleteDownloads()
		for _, rec := range records {
			if rec.ID == id {
				record = rec
				break
			}
		}
	}

	_ = h.deps.DownloadManager.CancelDownload(id)

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
			logger.Warn("failed to delete download directory %s: %v", downloadPath, err)
		}
	}

	if err := h.deps.Persistence.DeleteDownload(id); err != nil {
		logger.Error("failed to delete download record: %v", err)
		api.RespondWithError(w, http.StatusInternalServerError, "failed to delete download record")
		return
	}

	api.RespondWithJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}
