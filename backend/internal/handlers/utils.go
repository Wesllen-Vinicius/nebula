package handlers

import "nebula/backend/internal/downloader"

func extractInfoHash(magnetLink string) string {
	const prefix = "magnet:?xt=urn:btih:"
	if len(magnetLink) <= len(prefix) {
		return ""
	}
	start := len(prefix)
	if len(magnetLink) > start+40 {
		return magnetLink[start : start+40]
	}
	return magnetLink[start:]
}

func calculateTotalSize(files []downloader.FileMetadata) int64 {
	var total int64
	for _, f := range files {
		total += f.Size
	}
	return total
}

