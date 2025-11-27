package downloader

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"time"
)

type DownloadRecord struct {
	ID              string    `json:"id"`
	MagnetLink      string    `json:"magnet_link"`
	OutputDir       string    `json:"output_dir"`
	SelectedIndices []int     `json:"selected_indices"`
	Status          string    `json:"status"`
	Progress        float64   `json:"progress"`
	Speed           float64   `json:"speed"`
	TorrentName     string    `json:"torrent_name"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
	ErrorMessage    string    `json:"error_message,omitempty"`
}

type HistoryRecord struct {
	ID          int       `json:"id"`
	MagnetLink  string    `json:"magnet_link"`
	TorrentName string    `json:"torrent_name"`
	FileCount   int       `json:"file_count"`
	TotalSize   int64     `json:"total_size"`
	AccessedAt  time.Time `json:"accessed_at"`
}

type FavoriteRecord struct {
	ID          int       `json:"id"`
	MagnetLink  string    `json:"magnet_link"`
	TorrentName string    `json:"torrent_name"`
	Tags        []string  `json:"tags"`
	Notes       string    `json:"notes,omitempty"`
	AddedAt     time.Time `json:"added_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type PersistenceManager struct {
	dir           string
	downloadsPath string
	historyPath   string
	favoritesPath string
	mu            sync.RWMutex

	downloads map[string]*DownloadRecord
	history   []*HistoryRecord
	favorites []*FavoriteRecord

	saveTimer    *time.Timer
	pendingSave  bool
	saveMu       sync.Mutex
}

func NewPersistenceManager(appDataDir string) (*PersistenceManager, error) {
	if err := os.MkdirAll(appDataDir, 0755); err != nil {
		return nil, fmt.Errorf("create app data dir: %w", err)
	}

	pm := &PersistenceManager{
		dir:           appDataDir,
		downloadsPath: filepath.Join(appDataDir, "downloads.json"),
		historyPath:   filepath.Join(appDataDir, "history.json"),
		favoritesPath: filepath.Join(appDataDir, "favorites.json"),
		downloads:     make(map[string]*DownloadRecord),
		history:       make([]*HistoryRecord, 0),
		favorites:     make([]*FavoriteRecord, 0),
	}

	if err := pm.loadAll(); err != nil {
		return nil, err
	}

	return pm, nil
}

func (pm *PersistenceManager) loadAll() error {
	if err := pm.loadJSON(pm.downloadsPath, &pm.downloads); err != nil {
		return fmt.Errorf("load downloads: %w", err)
	}
	if err := pm.loadJSON(pm.historyPath, &pm.history); err != nil {
		return fmt.Errorf("load history: %w", err)
	}
	if err := pm.loadJSON(pm.favoritesPath, &pm.favorites); err != nil {
		return fmt.Errorf("load favorites: %w", err)
	}
	return nil
}

func (pm *PersistenceManager) loadJSON(path string, v interface{}) error {
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}
	return json.Unmarshal(data, v)
}

func (pm *PersistenceManager) saveJSON(path string, v interface{}) error {
	data, err := json.Marshal(v)
	if err != nil {
		return err
	}
	return os.WriteFile(path, data, 0644)
}

// --- Downloads ---

func (pm *PersistenceManager) SaveDownload(record *DownloadRecord) error {
	pm.mu.Lock()
	record.UpdatedAt = time.Now()
	pm.downloads[record.ID] = record
	pm.mu.Unlock()

	pm.scheduleSave()
	return nil
}

func (pm *PersistenceManager) scheduleSave() {
	pm.saveMu.Lock()
	defer pm.saveMu.Unlock()

	pm.pendingSave = true

	if pm.saveTimer != nil {
		pm.saveTimer.Stop()
	}

	pm.saveTimer = time.AfterFunc(2*time.Second, func() {
		pm.saveMu.Lock()
		if !pm.pendingSave {
			pm.saveMu.Unlock()
			return
		}
		pm.pendingSave = false
		pm.saveMu.Unlock()

		pm.mu.RLock()
		downloadsCopy := make(map[string]*DownloadRecord, len(pm.downloads))
		for k, v := range pm.downloads {
			downloadsCopy[k] = v
		}
		pm.mu.RUnlock()

		pm.saveJSON(pm.downloadsPath, downloadsCopy)
	})
}

func (pm *PersistenceManager) GetDownload(id string) (*DownloadRecord, error) {
	pm.mu.RLock()
	defer pm.mu.RUnlock()

	if record, ok := pm.downloads[id]; ok {
		// Return a copy to avoid race conditions if caller modifies it
		copy := *record
		return &copy, nil
	}
	return nil, nil
}

func (pm *PersistenceManager) GetAllDownloads() ([]*DownloadRecord, error) {
	pm.mu.RLock()
	defer pm.mu.RUnlock()

	all := make([]*DownloadRecord, 0, len(pm.downloads))
	for _, r := range pm.downloads {
		copy := *r
		all = append(all, &copy)
	}

	return all, nil
}

func (pm *PersistenceManager) GetIncompleteDownloads() ([]*DownloadRecord, error) {
	pm.mu.RLock()
	defer pm.mu.RUnlock()

	var incomplete []*DownloadRecord
	for _, r := range pm.downloads {
		if r.Status == "paused" || r.Status == "downloading" || r.Status == "error" {
			copy := *r
			incomplete = append(incomplete, &copy)
		}
	}

	sort.Slice(incomplete, func(i, j int) bool {
		return incomplete[i].UpdatedAt.After(incomplete[j].UpdatedAt)
	})

	return incomplete, nil
}

func (pm *PersistenceManager) DeleteDownload(id string) error {
	pm.mu.Lock()
	delete(pm.downloads, id)
	pm.mu.Unlock()

	pm.mu.RLock()
	downloadsCopy := make(map[string]*DownloadRecord, len(pm.downloads))
	for k, v := range pm.downloads {
		downloadsCopy[k] = v
	}
	pm.mu.RUnlock()

	return pm.saveJSON(pm.downloadsPath, downloadsCopy)
}

// --- History ---

func (pm *PersistenceManager) AddToHistory(magnetLink, torrentName string, fileCount int, totalSize int64) error {
	pm.mu.Lock()
	defer pm.mu.Unlock()

	for i := range pm.history {
		if pm.history[i].MagnetLink == magnetLink {
			pm.history[i].AccessedAt = time.Now()
			pm.history[i].FileCount = fileCount
			pm.history[i].TotalSize = totalSize
			return pm.saveJSON(pm.historyPath, pm.history)
		}
	}

	newID := 1
	for _, r := range pm.history {
		if r.ID >= newID {
			newID = r.ID + 1
		}
	}

	record := &HistoryRecord{
		ID:          newID,
		MagnetLink:  magnetLink,
		TorrentName: torrentName,
		FileCount:   fileCount,
		TotalSize:   totalSize,
		AccessedAt:  time.Now(),
	}
	pm.history = append(pm.history, record)
	return pm.saveJSON(pm.historyPath, pm.history)
}

func (pm *PersistenceManager) GetHistory(limit int) ([]*HistoryRecord, error) {
	pm.mu.RLock()
	defer pm.mu.RUnlock()

	if len(pm.history) == 0 {
		return []*HistoryRecord{}, nil
	}

	sorted := make([]*HistoryRecord, len(pm.history))
	copy(sorted, pm.history)
	sort.Slice(sorted, func(i, j int) bool {
		return sorted[i].AccessedAt.After(sorted[j].AccessedAt)
	})

	if limit > 0 && limit < len(sorted) {
		return sorted[:limit], nil
	}
	return sorted, nil
}

func (pm *PersistenceManager) SearchHistory(query string) ([]*HistoryRecord, error) {
	pm.mu.RLock()
	defer pm.mu.RUnlock()

	query = strings.ToLower(query)
	var results []*HistoryRecord
	for _, r := range pm.history {
		if strings.Contains(strings.ToLower(r.TorrentName), query) || strings.Contains(strings.ToLower(r.MagnetLink), query) {
			results = append(results, r)
		}
	}

	sort.Slice(results, func(i, j int) bool {
		return results[i].AccessedAt.After(results[j].AccessedAt)
	})

	if len(results) > 50 {
		results = results[:50]
	}
	return results, nil
}

// --- Favorites ---

func (pm *PersistenceManager) AddFavorite(magnetLink, torrentName string, tags []string, notes string) error {
	pm.mu.Lock()
	defer pm.mu.Unlock()

	// Check if exists
	for _, r := range pm.favorites {
		if r.MagnetLink == magnetLink {
			r.Tags = tags
			r.Notes = notes
			r.UpdatedAt = time.Now()
			return pm.saveJSON(pm.favoritesPath, pm.favorites)
		}
	}

	newID := 1
	if len(pm.favorites) > 0 {
		for _, r := range pm.favorites {
			if r.ID >= newID {
				newID = r.ID + 1
			}
		}
	}

	record := &FavoriteRecord{
		ID:          newID,
		MagnetLink:  magnetLink,
		TorrentName: torrentName,
		Tags:        tags,
		Notes:       notes,
		AddedAt:     time.Now(),
		UpdatedAt:   time.Now(),
	}
	pm.favorites = append(pm.favorites, record)
	return pm.saveJSON(pm.favoritesPath, pm.favorites)
}

func (pm *PersistenceManager) RemoveFavorite(magnetLink string) error {
	pm.mu.Lock()
	defer pm.mu.Unlock()

	for i, r := range pm.favorites {
		if r.MagnetLink == magnetLink {
			pm.favorites = append(pm.favorites[:i], pm.favorites[i+1:]...)
			return pm.saveJSON(pm.favoritesPath, pm.favorites)
		}
	}
	return nil
}

func (pm *PersistenceManager) GetFavorites() ([]*FavoriteRecord, error) {
	pm.mu.RLock()
	defer pm.mu.RUnlock()

	sorted := make([]*FavoriteRecord, len(pm.favorites))
	copy(sorted, pm.favorites)
	sort.Slice(sorted, func(i, j int) bool {
		return sorted[i].AddedAt.After(sorted[j].AddedAt)
	})
	return sorted, nil
}

func (pm *PersistenceManager) IsFavorite(magnetLink string) (bool, error) {
	pm.mu.RLock()
	defer pm.mu.RUnlock()

	for _, r := range pm.favorites {
		if r.MagnetLink == magnetLink {
			return true, nil
		}
	}
	return false, nil
}

func (pm *PersistenceManager) Close() error {
	pm.saveMu.Lock()
	if pm.saveTimer != nil {
		pm.saveTimer.Stop()
	}
	if pm.pendingSave {
		pm.mu.RLock()
		downloadsCopy := make(map[string]*DownloadRecord, len(pm.downloads))
		for k, v := range pm.downloads {
			downloadsCopy[k] = v
		}
		pm.mu.RUnlock()
		pm.saveJSON(pm.downloadsPath, downloadsCopy)
	}
	pm.saveMu.Unlock()
	return nil
}
