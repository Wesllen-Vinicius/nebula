package handlers

import (
	"nebula/backend/internal/config"
	"nebula/backend/internal/downloader"
	"nebula/backend/internal/manager"
)

// Dependencies contém todas as dependências necessárias para os handlers
type Dependencies struct {
	DownloadManager *manager.DownloadManager
	ConfigManager   *config.ConfigManager
	TorrentService  *downloader.Service
	Persistence     *downloader.PersistenceManager
	ProgressHub     ProgressBroadcaster
}

// ProgressBroadcaster interface para broadcast de progresso
type ProgressBroadcaster interface {
	Broadcast(id string, data map[string]interface{})
}

// ProgressReporterFactory cria reporters de progresso
type ProgressReporterFactory interface {
	NewReporter() downloader.ProgressReporter
}

