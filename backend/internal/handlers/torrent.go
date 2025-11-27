package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"

	"nebula/backend/internal/api"
	"nebula/backend/internal/downloader"
	"nebula/backend/internal/logger"
)

const maxMultipartFormSize = 10 << 20

// TorrentHandler gerencia operações de torrent/magnet
type TorrentHandler struct {
	deps *Dependencies
}

// NewTorrentHandler cria um novo handler de torrent
func NewTorrentHandler(deps *Dependencies) *TorrentHandler {
	return &TorrentHandler{deps: deps}
}

// HandleAnalyzeMagnet analisa um magnet link
func (h *TorrentHandler) HandleAnalyzeMagnet(w http.ResponseWriter, r *http.Request) {
	var req struct {
		MagnetLink string `json:"magnet_link"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		logger.Error("Failed to decode request: %v", err)
		api.RespondWithError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if err := api.ValidateMagnetLink(req.MagnetLink); err != nil {
		logger.Warn("Invalid magnet link: %v", err)
		api.RespondWithError(w, http.StatusBadRequest, err.Error())
		return
	}

	files, name, err := h.deps.TorrentService.GetTorrentInfo(req.MagnetLink)
	if err != nil {
		logger.Error("Failed to get torrent info: %v", err)
		api.RespondWithError(w, http.StatusInternalServerError, "Failed to analyze torrent")
		return
	}

	infoHash := extractInfoHash(req.MagnetLink)

	api.RespondWithJSON(w, http.StatusOK, map[string]interface{}{
		"files":       files,
		"name":        name,
		"info_hash":   infoHash,
		"magnet_link": req.MagnetLink,
		"total_size":  calculateTotalSize(files),
	})
}

// HandleAnalyzeTorrentFile analisa um arquivo torrent
func (h *TorrentHandler) HandleAnalyzeTorrentFile(w http.ResponseWriter, r *http.Request) {
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

	files, name, magnetLink, err := h.deps.TorrentService.AddTorrentFromBytes(data[:n])
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

// HandleAnalyzeTorrentBytes analisa bytes de torrent
func (h *TorrentHandler) HandleAnalyzeTorrentBytes(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Data []byte `json:"data"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		api.RespondWithError(w, http.StatusBadRequest, fmt.Sprintf("invalid request body: %v", err))
		return
	}

	files, name, magnetLink, err := h.deps.TorrentService.AddTorrentFromBytes(req.Data)
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

// HandleSetFilePriority define a prioridade de um arquivo
func (h *TorrentHandler) HandleSetFilePriority(w http.ResponseWriter, r *http.Request) {
	var req struct {
		MagnetLink string `json:"magnet_link"`
		FileIndex  int    `json:"file_index"`
		Priority   int    `json:"priority"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		api.RespondWithError(w, http.StatusBadRequest, fmt.Sprintf("invalid request body: %v", err))
		return
	}

	if err := h.deps.TorrentService.SetFilePriority(req.MagnetLink, req.FileIndex, downloader.FilePriority(req.Priority)); err != nil {
		logger.Error("failed to set file priority: %v", err)
		api.RespondWithError(w, http.StatusInternalServerError, "failed to set file priority")
		return
	}
	api.RespondWithJSON(w, http.StatusOK, map[string]string{"status": "updated"})
}

// HandleGetFilePriority retorna a prioridade de um arquivo
func (h *TorrentHandler) HandleGetFilePriority(w http.ResponseWriter, r *http.Request) {
	magnetLink := r.URL.Query().Get("magnet_link")
	fileIndex := 0
	fmt.Sscanf(r.URL.Query().Get("file_index"), "%d", &fileIndex)

	priority, err := h.deps.TorrentService.GetFilePriority(magnetLink, fileIndex)
	if err != nil {
		logger.Error("failed to get file priority: %v", err)
		api.RespondWithError(w, http.StatusInternalServerError, "failed to get file priority")
		return
	}

	api.RespondWithJSON(w, http.StatusOK, map[string]int{"priority": int(priority)})
}
