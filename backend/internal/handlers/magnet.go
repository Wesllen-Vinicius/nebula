package handlers

import (
	"encoding/json"
	"net/http"

	"nebula/backend/internal/api"
	"nebula/backend/internal/downloader"
	"nebula/backend/internal/logger"
)

type MagnetHandler struct {
	torrentService *downloader.Service
}

func NewMagnetHandler(ts *downloader.Service) *MagnetHandler {
	return &MagnetHandler{torrentService: ts}
}

func (h *MagnetHandler) HandleAnalyzeMagnet(w http.ResponseWriter, r *http.Request) {
	var req struct {
		MagnetLink string `json:"magnet_link"`
	}

	if err := api.DecodeJSON(r, &req); err != nil {
		logger.Error("Failed to decode request: %v", err)
		api.RespondWithError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if err := api.ValidateMagnetLink(req.MagnetLink); err != nil {
		logger.Warn("Invalid magnet link: %v", err)
		api.RespondWithError(w, http.StatusBadRequest, err.Error())
		return
	}

	files, name, err := h.torrentService.GetTorrentInfo(req.MagnetLink)
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

func extractInfoHash(magnetLink string) string {
	const prefix = "magnet:?xt=urn:btih:"
	if len(magnetLink) <= len(prefix)+40 {
		return ""
	}
	start := len(prefix)
	if len(magnetLink) > start+40 {
		return magnetLink[start : start+40]
	}
	return ""
}

func calculateTotalSize(files []downloader.FileMetadata) int64 {
	var total int64
	for _, f := range files {
		total += f.Size
	}
	return total
}

