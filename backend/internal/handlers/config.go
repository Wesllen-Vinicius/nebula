package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"

	"nebula/backend/internal/api"
	"nebula/backend/internal/downloader"
	"nebula/backend/internal/logger"
)

// ConfigHandler gerencia operações de configuração
type ConfigHandler struct {
	deps *Dependencies
}

// NewConfigHandler cria um novo handler de configuração
func NewConfigHandler(deps *Dependencies) *ConfigHandler {
	return &ConfigHandler{deps: deps}
}

// HandleGetConfig retorna a configuração atual
func (h *ConfigHandler) HandleGetConfig(w http.ResponseWriter, r *http.Request) {
	cfg := h.deps.ConfigManager.Get()
	api.RespondWithJSON(w, http.StatusOK, cfg)
}

// HandleSetMaxDownloadSpeed define a velocidade máxima de download
func (h *ConfigHandler) HandleSetMaxDownloadSpeed(w http.ResponseWriter, r *http.Request) {
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

	if err := h.deps.ConfigManager.SetMaxDownloadSpeed(speed); err != nil {
		logger.Error("failed to set max download speed: %v", err)
		api.RespondWithError(w, http.StatusInternalServerError, "failed to update download speed limit")
		return
	}

	h.deps.TorrentService.UpdateLimits(&downloader.DownloadConfig{
		MaxDownloadSpeed: h.deps.ConfigManager.GetMaxDownloadSpeed(),
		MaxUploadSpeed:   h.deps.ConfigManager.GetMaxUploadSpeed(),
	})

	api.RespondWithJSON(w, http.StatusOK, map[string]string{"status": "updated"})
}

// HandleSetMaxUploadSpeed define a velocidade máxima de upload
func (h *ConfigHandler) HandleSetMaxUploadSpeed(w http.ResponseWriter, r *http.Request) {
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

	if err := h.deps.ConfigManager.SetMaxUploadSpeed(speed); err != nil {
		logger.Error("failed to set max upload speed: %v", err)
		api.RespondWithError(w, http.StatusInternalServerError, "failed to update upload speed limit")
		return
	}

	h.deps.TorrentService.UpdateLimits(&downloader.DownloadConfig{
		MaxDownloadSpeed: h.deps.ConfigManager.GetMaxDownloadSpeed(),
		MaxUploadSpeed:   h.deps.ConfigManager.GetMaxUploadSpeed(),
	})

	api.RespondWithJSON(w, http.StatusOK, map[string]string{"status": "updated"})
}

// HandleGetFileTypes retorna os tipos de arquivo suportados
func (h *ConfigHandler) HandleGetFileTypes(w http.ResponseWriter, r *http.Request) {
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

