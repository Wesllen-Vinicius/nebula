package downloader

import (
	"time"
)

type HistoryRecordDTO struct {
	ID          int    `json:"id"`
	MagnetLink  string `json:"magnet_link"`
	TorrentName string `json:"torrent_name"`
	FileCount   int    `json:"file_count"`
	TotalSize   int64  `json:"total_size"`
	AccessedAt  string `json:"accessed_at"`
}

type FavoriteRecordDTO struct {
	ID          int      `json:"id"`
	MagnetLink  string   `json:"magnet_link"`
	TorrentName string   `json:"torrent_name"`
	Tags        []string `json:"tags"`
	Notes       string   `json:"notes,omitempty"`
	AddedAt     string   `json:"added_at"`
	UpdatedAt   string   `json:"updated_at"`
}

func (h *HistoryRecord) ToDTO() *HistoryRecordDTO {
	if h == nil {
		return nil
	}
	return &HistoryRecordDTO{
		ID:          h.ID,
		MagnetLink:  h.MagnetLink,
		TorrentName: h.TorrentName,
		FileCount:   h.FileCount,
		TotalSize:   h.TotalSize,
		AccessedAt:  h.AccessedAt.Format(time.RFC3339),
	}
}

func (f *FavoriteRecord) ToDTO() *FavoriteRecordDTO {
	if f == nil {
		return nil
	}
	return &FavoriteRecordDTO{
		ID:          f.ID,
		MagnetLink:  f.MagnetLink,
		TorrentName: f.TorrentName,
		Tags:        f.Tags,
		Notes:       f.Notes,
		AddedAt:     f.AddedAt.Format(time.RFC3339),
		UpdatedAt:   f.UpdatedAt.Format(time.RFC3339),
	}
}
