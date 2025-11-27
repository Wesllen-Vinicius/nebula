package api

import (
	"errors"
	"path/filepath"
	"regexp"
	"strings"
)

var magnetLinkRegex = regexp.MustCompile(`^magnet:\?xt=urn:btih:[a-fA-F0-9]{40}`)

func ValidateMagnetLink(magnetLink string) error {
	if magnetLink == "" {
		return errors.New("magnet link cannot be empty")
	}

	if !strings.HasPrefix(magnetLink, "magnet:?") {
		return errors.New("invalid magnet link format")
	}

	if !magnetLinkRegex.MatchString(magnetLink) {
		return errors.New("invalid magnet link: missing or invalid info hash")
	}

	return nil
}

func ValidateOutputDir(outputDir string) error {
	if outputDir == "" {
		return errors.New("output directory cannot be empty")
	}

	cleaned := filepath.Clean(outputDir)
	if cleaned != outputDir {
		return errors.New("output directory contains invalid path components")
	}

	if strings.Contains(outputDir, "..") {
		return errors.New("output directory cannot contain parent directory references")
	}

	dangerous := []string{"<", ">", "|", "*", "?", "\""}
	for _, char := range dangerous {
		if strings.Contains(outputDir, char) {
			return errors.New("output directory contains invalid characters")
		}
	}

	return nil
}

func SanitizePath(path string) string {
	cleaned := filepath.Clean(path)
	cleaned = strings.ReplaceAll(cleaned, "..", "")
	cleaned = strings.TrimSpace(cleaned)
	return cleaned
}

func ValidateSpeedLimit(speed int) error {
	if speed < 0 {
		return errors.New("speed limit cannot be negative")
	}

	if speed > 102400 {
		return errors.New("speed limit exceeds maximum allowed (100 MB/s)")
	}

	return nil
}

func ValidateFileIndex(index, maxIndex int) error {
	if index < 0 {
		return errors.New("file index cannot be negative")
	}

	if index >= maxIndex {
		return errors.New("file index out of range")
	}

	return nil
}

