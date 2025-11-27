package handlers

import (
	"fmt"
	"net/http"

	"nebula/backend/internal/api"
	"nebula/backend/internal/downloader"
	"nebula/backend/internal/logger"
)

const defaultHistoryLimit = 100

// HistoryHandler gerencia operações de histórico
type HistoryHandler struct {
	deps *Dependencies
}

// NewHistoryHandler cria um novo handler de histórico
func NewHistoryHandler(deps *Dependencies) *HistoryHandler {
	return &HistoryHandler{deps: deps}
}

// HandleGetHistory retorna o histórico de downloads
func (h *HistoryHandler) HandleGetHistory(w http.ResponseWriter, r *http.Request) {
	limit := defaultHistoryLimit
	fmt.Sscanf(r.URL.Query().Get("limit"), "%d", &limit)

	records, err := h.deps.Persistence.GetHistory(limit)
	if err != nil {
		logger.Error("failed to get history: %v", err)
		api.RespondWithError(w, http.StatusInternalServerError, "failed to retrieve history")
		return
	}

	dtos := make([]*downloader.HistoryRecordDTO, len(records))
	for i, rec := range records {
		dtos[i] = rec.ToDTO()
	}

	api.RespondWithJSON(w, http.StatusOK, dtos)
}

// HandleSearchHistory busca no histórico
func (h *HistoryHandler) HandleSearchHistory(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query().Get("q")
	records, err := h.deps.Persistence.SearchHistory(query)
	if err != nil {
		logger.Error("failed to search history: %v", err)
		api.RespondWithError(w, http.StatusInternalServerError, "failed to search history")
		return
	}

	dtos := make([]*downloader.HistoryRecordDTO, len(records))
	for i, rec := range records {
		dtos[i] = rec.ToDTO()
	}

	api.RespondWithJSON(w, http.StatusOK, dtos)
}

