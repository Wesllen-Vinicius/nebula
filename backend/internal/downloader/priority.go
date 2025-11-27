package downloader

import (
	"fmt"

	"github.com/anacrolix/torrent"
	"github.com/anacrolix/torrent/types"
)

type FilePriority int

const (
	PriorityNone FilePriority = iota
	PriorityLow
	PriorityNormal
	PriorityHigh
)

func (s *Service) SetFilePriority(magnetLink string, fileIndex int, priority FilePriority) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	var targetTorrent *torrent.Torrent
	for _, t := range s.client.Torrents() {
		if t.InfoHash().String() == magnetLink || t.Metainfo().Magnet(nil, t.Info()).String() == magnetLink {
			targetTorrent = t
			break
		}
	}

	if targetTorrent == nil {
		return fmt.Errorf("torrent not found")
	}

	files := targetTorrent.Files()
	if fileIndex < 0 || fileIndex >= len(files) {
		return fmt.Errorf("invalid file index: %d", fileIndex)
	}

	file := files[fileIndex]

	var piecePriority types.PiecePriority
	switch priority {
	case PriorityNone:
		piecePriority = types.PiecePriorityNone
	case PriorityLow:
		piecePriority = types.PiecePriorityNow - 2
	case PriorityNormal:
		piecePriority = types.PiecePriorityNormal
	case PriorityHigh:
		piecePriority = types.PiecePriorityNow
	default:
		piecePriority = types.PiecePriorityNormal
	}

	file.SetPriority(piecePriority)
	return nil
}

func (s *Service) GetFilePriority(magnetLink string, fileIndex int) (FilePriority, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	var targetTorrent *torrent.Torrent
	for _, t := range s.client.Torrents() {
		if t.InfoHash().String() == magnetLink || t.Metainfo().Magnet(nil, t.Info()).String() == magnetLink {
			targetTorrent = t
			break
		}
	}

	if targetTorrent == nil {
		return PriorityNone, fmt.Errorf("torrent not found")
	}

	files := targetTorrent.Files()
	if fileIndex < 0 || fileIndex >= len(files) {
		return PriorityNone, fmt.Errorf("invalid file index: %d", fileIndex)
	}

	file := files[fileIndex]
	piecePriority := file.Priority()

	switch {
	case piecePriority == types.PiecePriorityNone:
		return PriorityNone, nil
	case piecePriority >= types.PiecePriorityNow:
		return PriorityHigh, nil
	case piecePriority == types.PiecePriorityNormal:
		return PriorityNormal, nil
	case piecePriority < types.PiecePriorityNormal:
		return PriorityLow, nil
	default:
		return PriorityNormal, nil
	}
}
