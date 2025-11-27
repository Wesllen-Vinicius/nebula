package manager

import (
	"context"
	"errors"
	"fmt"
	"sync"

	"nebula/backend/internal/downloader"

	"github.com/google/uuid"
)

type DownloadManager struct {
	sessions      map[string]*DownloadSession
	pauseManagers map[string]*downloader.PauseManager
	service       *downloader.Service
	persistence   *downloader.PersistenceManager
	mu            sync.Mutex
}

type DownloadSession struct {
	ID           string
	Cancel       context.CancelFunc
	PauseManager *downloader.PauseManager
}

func NewDownloadManager(service *downloader.Service, persistence *downloader.PersistenceManager) *DownloadManager {
	return &DownloadManager{
		sessions:      make(map[string]*DownloadSession),
		pauseManagers: make(map[string]*downloader.PauseManager),
		service:       service,
		persistence:   persistence,
	}
}

func (dm *DownloadManager) startDownloadInternal(ctx context.Context, id string, magnetLink string, outputDir string, selectedIndices []int, sequential bool, reporter downloader.ProgressReporter) (string, error) {
	if err := downloader.ValidateMagnetLink(magnetLink); err != nil {
		return "", fmt.Errorf("invalid magnet link: %w", err)
	}

	if len(selectedIndices) == 0 {
		return "", errors.New("no files selected")
	}

	downloadCtx, cancel := context.WithCancel(context.Background())
	pauseManager := downloader.NewPauseManager()

	session := &DownloadSession{
		ID:           id,
		Cancel:       cancel,
		PauseManager: pauseManager,
	}

	dm.mu.Lock()
	dm.sessions[id] = session
	dm.pauseManagers[id] = pauseManager
	dm.mu.Unlock()

	go func() {
		defer func() {
			dm.mu.Lock()
			delete(dm.sessions, id)
			delete(dm.pauseManagers, id)
			dm.mu.Unlock()
		}()

		err := dm.service.Download(downloadCtx, id, magnetLink, selectedIndices, sequential, reporter, pauseManager)

		if dm.persistence != nil {
			if err != nil {
				var msg string
				switch {
				case errors.Is(err, context.Canceled):
					msg = "Canceled"
				case errors.Is(err, context.DeadlineExceeded):
					msg = "Timeout"
				default:
					msg = fmt.Sprintf("Error: %s", err)
				}

				dm.persistence.SaveDownload(&downloader.DownloadRecord{
					ID:              id,
					MagnetLink:      magnetLink,
					OutputDir:       outputDir,
					SelectedIndices: selectedIndices,
					Status:          "error",
					ErrorMessage:    msg,
				})
			} else {
				dm.persistence.SaveDownload(&downloader.DownloadRecord{
					ID:              id,
					MagnetLink:      magnetLink,
					OutputDir:       outputDir,
					SelectedIndices: selectedIndices,
					Status:          "completed",
					Progress:        100,
				})
			}
		}
	}()

	return id, nil
}

func (dm *DownloadManager) StartDownload(ctx context.Context, magnetLink string, outputDir string, selectedIndices []int, sequential bool, reporter downloader.ProgressReporter) (string, error) {
	id := uuid.New().String()
	return dm.startDownloadInternal(ctx, id, magnetLink, outputDir, selectedIndices, sequential, reporter)
}

func (dm *DownloadManager) StartDownloadWithID(ctx context.Context, id string, magnetLink string, outputDir string, selectedIndices []int, sequential bool, reporter downloader.ProgressReporter) (string, error) {
	return dm.startDownloadInternal(ctx, id, magnetLink, outputDir, selectedIndices, sequential, reporter)
}

func (dm *DownloadManager) CancelDownload(id string) error {
	dm.mu.Lock()
	session, exists := dm.sessions[id]
	dm.mu.Unlock()

	if !exists {
		return fmt.Errorf("download not found: %s", id)
	}

	session.Cancel()
	return nil
}

func (dm *DownloadManager) PauseDownload(id string) error {
	dm.mu.Lock()
	pauseManager, exists := dm.pauseManagers[id]
	dm.mu.Unlock()

	if !exists {
		return errors.New("download not found")
	}

	pauseManager.Pause()

	if dm.persistence != nil {
		dm.persistence.SaveDownload(&downloader.DownloadRecord{
			ID:     id,
			Status: "paused",
		})
	}

	return nil
}

func (dm *DownloadManager) ResumeDownload(id string) error {
	dm.mu.Lock()
	pauseManager, exists := dm.pauseManagers[id]
	dm.mu.Unlock()

	if !exists {
		return errors.New("download not found")
	}

	pauseManager.Resume()

	if dm.persistence != nil {
		dm.persistence.SaveDownload(&downloader.DownloadRecord{
			ID:     id,
			Status: "downloading",
		})
	}

	return nil
}

func (dm *DownloadManager) DeleteDownload(id string) error {
	dm.mu.Lock()
	session, exists := dm.sessions[id]
	dm.mu.Unlock()

	if exists {
		session.Cancel()
	}

	if dm.persistence != nil {
		return dm.persistence.DeleteDownload(id)
	}

	return nil
}

func (dm *DownloadManager) GetSession(id string) (*DownloadSession, bool) {
	dm.mu.Lock()
	defer dm.mu.Unlock()
	session, exists := dm.sessions[id]
	return session, exists
}

func (dm *DownloadManager) Shutdown() {
	dm.mu.Lock()
	defer dm.mu.Unlock()

	for _, session := range dm.sessions {
		session.Cancel()
	}
}
