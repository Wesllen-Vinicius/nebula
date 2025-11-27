package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"nebula/backend/internal/api"
	"nebula/backend/internal/logger"

	"github.com/go-chi/chi/v5"
)

// FavoritesHandler gerencia operações de favoritos
type FavoritesHandler struct {
	deps *Dependencies
}

// NewFavoritesHandler cria um novo handler de favoritos
func NewFavoritesHandler(deps *Dependencies) *FavoritesHandler {
	return &FavoritesHandler{deps: deps}
}

// HandleGetFavorites retorna todos os favoritos
func (h *FavoritesHandler) HandleGetFavorites(w http.ResponseWriter, r *http.Request) {
	records, err := h.deps.Persistence.GetFavorites()
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

// HandleAddFavorite adiciona um novo favorito
func (h *FavoritesHandler) HandleAddFavorite(w http.ResponseWriter, r *http.Request) {
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

	if err := h.deps.Persistence.AddFavorite(req.MagnetLink, name, req.Tags, req.Notes); err != nil {
		logger.Error("failed to add favorite: %v", err)
		api.RespondWithError(w, http.StatusInternalServerError, "failed to add favorite")
		return
	}

	api.RespondWithJSON(w, http.StatusCreated, map[string]string{"status": "created"})
}

// HandleRemoveFavorite remove um favorito
func (h *FavoritesHandler) HandleRemoveFavorite(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")

	id, err := strconv.Atoi(idStr)
	if err != nil {
		api.RespondWithError(w, http.StatusBadRequest, "Invalid ID format")
		return
	}

	favorites, err := h.deps.Persistence.GetFavorites()
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

	if err := h.deps.Persistence.RemoveFavorite(targetMagnet); err != nil {
		logger.Error("failed to remove favorite: %v", err)
		api.RespondWithError(w, http.StatusInternalServerError, "failed to remove favorite")
		return
	}

	api.RespondWithJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

// HandleIsFavorite verifica se um magnet link é favorito
func (h *FavoritesHandler) HandleIsFavorite(w http.ResponseWriter, r *http.Request) {
	magnetLink := r.URL.Query().Get("magnet_link")
	isFavorite, err := h.deps.Persistence.IsFavorite(magnetLink)
	if err != nil {
		logger.Error("failed to check favorite: %v", err)
		api.RespondWithError(w, http.StatusInternalServerError, "failed to check favorite status")
		return
	}

	api.RespondWithJSON(w, http.StatusOK, map[string]bool{"is_favorite": isFavorite})
}

