package fileutil

import (
	"path/filepath"
	"strings"
)

type FileType string

const (
	TypeVideo      FileType = "video"
	TypeAudio      FileType = "audio"
	TypeImage      FileType = "image"
	TypeDocument   FileType = "document"
	TypeArchive    FileType = "archive"
	TypeSubtitle   FileType = "subtitle"
	TypeExecutable FileType = "executable"
	TypeOther      FileType = "other"
)

type FileTypeConfig struct {
	Type       FileType
	Extensions map[string]bool
	Icon       string
	Color      string
	Display    string
}

var TypeConfigs = map[FileType]FileTypeConfig{
	TypeVideo: {
		Type: TypeVideo,
		Extensions: map[string]bool{
			"mp4": true, "mkv": true, "avi": true, "mov": true, "flv": true,
			"wmv": true, "webm": true, "m4v": true, "mpg": true, "mpeg": true,
			"3gp": true, "ts": true, "m2ts": true, "mts": true,
		},
		Icon:    "VID",
		Color:   "#ef4444",
		Display: "Video",
	},
	TypeAudio: {
		Type: TypeAudio,
		Extensions: map[string]bool{
			"mp3": true, "flac": true, "wav": true, "aac": true, "m4a": true,
			"ogg": true, "wma": true, "alac": true, "aiff": true, "ape": true,
		},
		Icon:    "AUD",
		Color:   "#8b5cf6",
		Display: "Audio",
	},
	TypeImage: {
		Type: TypeImage,
		Extensions: map[string]bool{
			"jpg": true, "jpeg": true, "png": true, "gif": true, "bmp": true,
			"webp": true, "svg": true, "ico": true, "tiff": true, "heic": true,
		},
		Icon:    "IMG",
		Color:   "#06b6d4",
		Display: "Image",
	},
	TypeDocument: {
		Type: TypeDocument,
		Extensions: map[string]bool{
			"pdf": true, "doc": true, "docx": true, "txt": true, "xls": true,
			"xlsx": true, "ppt": true, "pptx": true, "odt": true, "rtf": true,
		},
		Icon:    "DOC",
		Color:   "#3b82f6",
		Display: "Document",
	},
	TypeArchive: {
		Type: TypeArchive,
		Extensions: map[string]bool{
			"zip": true, "rar": true, "7z": true, "tar": true, "gz": true,
			"bz2": true, "xz": true, "iso": true, "dmg": true,
		},
		Icon:    "ZIP",
		Color:   "#f59e0b",
		Display: "Archive",
	},
	TypeSubtitle: {
		Type: TypeSubtitle,
		Extensions: map[string]bool{
			"srt": true, "sub": true, "ass": true, "ssa": true, "vtt": true,
		},
		Icon:    "SUB",
		Color:   "#10b981",
		Display: "Subtitle",
	},
	TypeExecutable: {
		Type: TypeExecutable,
		Extensions: map[string]bool{
			"exe": true, "msi": true, "app": true, "deb": true, "rpm": true,
			"sh": true, "bat": true, "com": true, "scr": true,
		},
		Icon:    "EXE",
		Color:   "#ef4444",
		Display: "Executable",
	},
}

func DetectFileType(filename string) FileType {
	ext := strings.ToLower(strings.TrimPrefix(filepath.Ext(filename), "."))

	for fileType, config := range TypeConfigs {
		if config.Extensions[ext] {
			return fileType
		}
	}

	return TypeOther
}

func GetFileTypeConfig(fileType FileType) FileTypeConfig {
	if config, ok := TypeConfigs[fileType]; ok {
		return config
	}
	return FileTypeConfig{
		Type:    TypeOther,
		Icon:    "FILE",
		Color:   "#9ca3af",
		Display: "Other",
	}
}

func GetAllFileTypes() []FileTypeConfig {
	types := make([]FileTypeConfig, 0, len(TypeConfigs))
	for _, config := range TypeConfigs {
		types = append(types, config)
	}
	return types
}

func FilterByTypes(files []string, types map[FileType]bool) []string {
	if len(types) == 0 {
		return files
	}

	var filtered []string
	for _, file := range files {
		fileType := DetectFileType(file)
		if types[fileType] {
			filtered = append(filtered, file)
		}
	}
	return filtered
}
