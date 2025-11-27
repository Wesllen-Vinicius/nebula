package downloader

import (
	"context"
	"errors"
	"strings"
	"time"

	"nebula/backend/internal/fileutil"
)

const (
	MetadataTimeout  = 30 * time.Second
	ProgressInterval = 2 * time.Second
)

type DownloadConfig struct {
	MaxDownloadSpeed int64
	MaxUploadSpeed   int64
}

type FileMetadata struct {
	Index    int               `json:"index"`
	Path     string            `json:"path"`
	Size     int64             `json:"size"`
	FileType fileutil.FileType `json:"fileType"`
}

func NewFileMetadata(index int, path string, size int64) *FileMetadata {
	return &FileMetadata{
		Index:    index,
		Path:     path,
		Size:     size,
		FileType: fileutil.DetectFileType(path),
	}
}

type PauseManager struct {
	paused chan bool
}

func NewPauseManager() *PauseManager {
	return &PauseManager{
		paused: make(chan bool, 1),
	}
}

func (pm *PauseManager) Pause() {
	select {
	case pm.paused <- true:
	default:
	}
}

func (pm *PauseManager) Resume() {
	select {
	case <-pm.paused:
	default:
	}
}

func (pm *PauseManager) IsPaused() bool {
	select {
	case <-pm.paused:
		pm.paused <- true
		return true
	default:
		return false
	}
}

func (pm *PauseManager) WaitIfPaused(ctx context.Context) error {
	for {
		if !pm.IsPaused() {
			return nil
		}
		select {
		case <-time.After(100 * time.Millisecond):
		case <-ctx.Done():
			return ctx.Err()
		}
	}
}

type ProgressReporter interface {
	OnProgress(id string, percentage float64, downloadSpeed float64, uploadSpeed float64)
	OnLog(id string, message string)
	SetMeta(name string, totalSize int64, peers int)
}

func ValidateMagnetLink(link string) error {
	if link == "" {
		return errors.New("magnet link cannot be empty")
	}
	if !strings.HasPrefix(link, "magnet:?") {
		return errors.New("invalid magnet link format")
	}
	if !strings.Contains(link, "xt=urn:btih:") {
		return errors.New("magnet link missing info hash")
	}
	return nil
}
