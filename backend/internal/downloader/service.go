package downloader

import (
	"bytes"
	"context"
	"fmt"
	"log"
	"os"
	"sync"
	"time"

	"github.com/anacrolix/torrent"
	"github.com/anacrolix/torrent/metainfo"
	"github.com/anacrolix/torrent/storage"
	"golang.org/x/time/rate"
)

type Service struct {
	client          *torrent.Client
	config          *DownloadConfig
	downloadLimiter *rate.Limiter
	uploadLimiter   *rate.Limiter
	mu              sync.RWMutex
}

func NewService(config *DownloadConfig, outputDir string) (*Service, error) {
	if outputDir == "" {
		outputDir = "."
	}

	if err := os.MkdirAll(outputDir, 0755); err != nil {
		return nil, fmt.Errorf("create output dir: %w", err)
	}

	cfg := torrent.NewDefaultClientConfig()
	cfg.DataDir = outputDir
	cfg.ListenPort = 0
	cfg.Debug = false

	// === OTIMIZAÇÕES DE VELOCIDADE ===

	// Storage: usar NewFile quando CGO está desabilitado (Windows)
	// NewMMap requer CGO, então usamos NewFile como fallback
	// Isso ainda oferece boa performance
	if os.Getenv("CGO_ENABLED") == "0" {
		cfg.DefaultStorage = storage.NewFile(outputDir)
	} else {
		cfg.DefaultStorage = storage.NewMMap(outputDir)
	}

	// Habilitar DHT para descoberta de peers
	cfg.NoDHT = false

	// Habilitar PEX (Peer Exchange)
	cfg.DisablePEX = false

	// Desabilitar uTP no Windows devido a problemas de compilação com go-libutp
	// uTP é opcional e o BitTorrent funciona normalmente sem ele
	// No Linux, uTP pode ser habilitado se necessário
	cfg.DisableUTP = true

	cfg.EstablishedConnsPerTorrent = 80
	cfg.HalfOpenConnsPerTorrent = 40
	cfg.TotalHalfOpenConns = 100         // Total de conexões half-open

	// Aceitar peers de entrada
	cfg.DisableAcceptRateLimiting = true
	cfg.NoDefaultPortForwarding = false

	cfg.HandshakesTimeout = 10 * time.Second

	// Rate limiters
	var downloadLimiter, uploadLimiter *rate.Limiter

	if config != nil && config.MaxDownloadSpeed > 0 {
		downloadLimiter = rate.NewLimiter(rate.Limit(config.MaxDownloadSpeed), int(config.MaxDownloadSpeed))
	} else {
		downloadLimiter = rate.NewLimiter(rate.Inf, 0)
	}
	cfg.DownloadRateLimiter = downloadLimiter

	if config != nil && config.MaxUploadSpeed > 0 {
		uploadLimiter = rate.NewLimiter(rate.Limit(config.MaxUploadSpeed), int(config.MaxUploadSpeed))
	} else {
		uploadLimiter = rate.NewLimiter(rate.Inf, 0)
	}
	cfg.UploadRateLimiter = uploadLimiter

	client, err := torrent.NewClient(cfg)
	if err != nil {
		return nil, fmt.Errorf("create client: %w", err)
	}

	return &Service{
		client:          client,
		config:          config,
		downloadLimiter: downloadLimiter,
		uploadLimiter:   uploadLimiter,
	}, nil
}

func (s *Service) Close() {
	if s.client != nil {
		s.client.Close()
	}
}

func (s *Service) UpdateLimits(config *DownloadConfig) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.config = config

	if s.downloadLimiter != nil {
		if config.MaxDownloadSpeed > 0 {
			s.downloadLimiter.SetLimit(rate.Limit(config.MaxDownloadSpeed))
			s.downloadLimiter.SetBurst(int(config.MaxDownloadSpeed))
		} else {
			s.downloadLimiter.SetLimit(rate.Inf)
		}
	}

	if s.uploadLimiter != nil {
		if config.MaxUploadSpeed > 0 {
			s.uploadLimiter.SetLimit(rate.Limit(config.MaxUploadSpeed))
			s.uploadLimiter.SetBurst(int(config.MaxUploadSpeed))
		} else {
			s.uploadLimiter.SetLimit(rate.Inf)
		}
	}
}

func (s *Service) Download(ctx context.Context, id string, magnetLink string, selectedIndices []int, sequential bool, reporter ProgressReporter, pauseManager *PauseManager) error {
	if err := ValidateMagnetLink(magnetLink); err != nil {
		return err
	}

	if len(selectedIndices) == 0 {
		return fmt.Errorf("no files selected")
	}

	t, err := s.client.AddMagnet(magnetLink)
	if err != nil {
		return fmt.Errorf("add magnet: %w", err)
	}
	defer t.Drop()

	select {
	case <-t.GotInfo():
	case <-time.After(MetadataTimeout):
		return fmt.Errorf("timeout fetching metadata")
	case <-ctx.Done():
		return ctx.Err()
	}

	if len(t.Files()) == 0 {
		return fmt.Errorf("torrent has no files")
	}

	selectedSet := make(map[int]bool)
	for _, idx := range selectedIndices {
		if idx < 0 || idx >= len(t.Files()) {
			return fmt.Errorf("invalid file index: %d (torrent has %d files)", idx, len(t.Files()))
		}
		selectedSet[idx] = true
	}

	if len(selectedSet) == 0 {
		return fmt.Errorf("no valid files selected")
	}

	if len(selectedSet) != len(selectedIndices) {
		return fmt.Errorf("duplicate file indices in selection")
	}

	var totalSize int64
	selectedFilesList := make([]int, 0, len(selectedSet))
	
	for i, file := range t.Files() {
		if selectedSet[i] {
			totalSize += file.Length()
			selectedFilesList = append(selectedFilesList, i)
		}
	}

	log.Printf("[Download] Starting download ID=%s: %d selected files out of %d total. Selected indices: %v", id, len(selectedSet), len(t.Files()), selectedFilesList)

	for i, file := range t.Files() {
		if !selectedSet[i] {
			file.SetPriority(torrent.PiecePriorityNone)
			if file.BytesCompleted() > 0 {
				log.Printf("[Download] WARNING: File %d (%s) already has %d bytes before disabling", i, file.Path(), file.BytesCompleted())
			}
		}
	}

	for i, file := range t.Files() {
		if selectedSet[i] {
			file.SetPriority(torrent.PiecePriorityNormal)
			file.Download()
			log.Printf("[Download] File %d (%s) - ENABLED for download", i, file.Path())
		}
	}

	// Modo sequencial para streaming/playback
	if sequential {
		priorityOffset := 0
		for idx, file := range t.Files() {
			if selectedSet[idx] {
				if priorityOffset == 0 {
					file.SetPriority(torrent.PiecePriorityNow)
				} else {
					file.SetPriority(torrent.PiecePriorityNormal)
				}
				priorityOffset++
			}
		}
	}

	ticker := time.NewTicker(ProgressInterval)
	defer ticker.Stop()

	var lastCompleted int64
	var lastUploaded int64
	var completedSize int64

	for {
		if err := pauseManager.WaitIfPaused(ctx); err != nil {
			return err
		}

		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-ticker.C:
			completedSize = 0
			unselectedBytes := int64(0)
			for i, file := range t.Files() {
				if selectedSet[i] {
					completedSize += file.BytesCompleted()
				} else {
					bytesCompleted := file.BytesCompleted()
					if bytesCompleted > 0 {
						unselectedBytes += bytesCompleted
						log.Printf("[Download] ERROR: Unselected file %d (%s) has %d bytes downloaded!", i, file.Path(), bytesCompleted)
					}
				}
			}
			
			if unselectedBytes > 0 {
				return fmt.Errorf("unselected files are being downloaded: %d bytes total from unselected files", unselectedBytes)
			}

			if totalSize == 0 {
				continue
			}

			progress := float64(completedSize) / float64(totalSize) * 100
			downloadSpeed := float64(completedSize-lastCompleted) / ProgressInterval.Seconds()
			lastCompleted = completedSize

			stats := t.Stats()
			currentUploaded := stats.BytesWrittenData.Int64()
			uploadSpeed := float64(currentUploaded-lastUploaded) / ProgressInterval.Seconds()
			lastUploaded = currentUploaded

			peers := stats.ConnectedSeeders + stats.TotalPeers

			if reporter != nil {
				reporter.SetMeta(t.Name(), totalSize, peers)
				reporter.OnProgress(id, progress, downloadSpeed, uploadSpeed)
			}

			if completedSize >= totalSize {
				if reporter != nil {
					reporter.OnLog(id, "Completed")
					reporter.OnProgress(id, 100, 0, 0)
				}
				return nil
			}
		}
	}
}

func (s *Service) GetTorrentInfo(magnetLink string) ([]FileMetadata, string, error) {
	if err := ValidateMagnetLink(magnetLink); err != nil {
		return nil, "", err
	}

	t, err := s.client.AddMagnet(magnetLink)
	if err != nil {
		return nil, "", fmt.Errorf("add magnet: %w", err)
	}
	defer t.Drop()

	select {
	case <-t.GotInfo():
	case <-time.After(MetadataTimeout):
		t.Drop()
		return nil, "", fmt.Errorf("timeout fetching metadata")
	}

	files := make([]FileMetadata, 0, len(t.Files()))
	for i, file := range t.Files() {
		files = append(files, *NewFileMetadata(i, file.Path(), file.Length()))
	}

	return files, t.Name(), nil
}

func (s *Service) AddTorrentFromFile(path string) ([]FileMetadata, string, string, error) {
	t, err := s.client.AddTorrentFromFile(path)
	if err != nil {
		return nil, "", "", fmt.Errorf("add torrent file: %w", err)
	}
	defer t.Drop()

	select {
	case <-t.GotInfo():
	case <-time.After(MetadataTimeout):
		t.Drop()
		return nil, "", "", fmt.Errorf("timeout fetching metadata")
	}

	files := make([]FileMetadata, 0, len(t.Files()))
	for i, file := range t.Files() {
		files = append(files, *NewFileMetadata(i, file.Path(), file.Length()))
	}

	magnet := t.Metainfo().Magnet(nil, t.Info()).String()

	return files, t.Name(), magnet, nil
}

func (s *Service) AddTorrentFromBytes(data []byte) ([]FileMetadata, string, string, error) {
	mi, err := metainfo.Load(bytes.NewReader(data))
	if err != nil {
		return nil, "", "", fmt.Errorf("parse torrent data: %w", err)
	}

	t, err := s.client.AddTorrent(mi)
	if err != nil {
		return nil, "", "", fmt.Errorf("add torrent: %w", err)
	}
	defer t.Drop()

	select {
	case <-t.GotInfo():
	case <-time.After(MetadataTimeout):
		t.Drop()
		return nil, "", "", fmt.Errorf("timeout fetching metadata")
	}

	files := make([]FileMetadata, 0, len(t.Files()))
	for i, file := range t.Files() {
		files = append(files, *NewFileMetadata(i, file.Path(), file.Length()))
	}

	magnet := mi.Magnet(nil, t.Info()).String()

	return files, t.Name(), magnet, nil
}
