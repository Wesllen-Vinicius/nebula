package config

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"
)

type AppConfig struct {
	MaxDownloadSpeed int64 `json:"max_download_speed"`
	MaxUploadSpeed   int64 `json:"max_upload_speed"`

	Theme         string `json:"theme"`
	Compact       bool   `json:"compact"`
	Notifications bool   `json:"notifications"`

	DefaultDownloadDir string `json:"default_download_dir"`

	ProxyEnabled bool   `json:"proxy_enabled"`
	ProxyType    string `json:"proxy_type"`
	ProxyAddress string `json:"proxy_address"`
	ProxyPort    int    `json:"proxy_port"`

	MaxConnections int `json:"max_connections"`
	RequestTimeout int `json:"request_timeout"`
}

func DefaultConfig() *AppConfig {
	home, _ := os.UserHomeDir()
	defaultDir := filepath.Join(home, "Downloads")

	return &AppConfig{
		MaxDownloadSpeed:   0,
		MaxUploadSpeed:     0,
		Theme:              "auto",
		Compact:            false,
		Notifications:      true,
		DefaultDownloadDir: defaultDir,
		ProxyEnabled:       false,
		ProxyType:          "socks5",
		ProxyAddress:       "",
		ProxyPort:          0,
		MaxConnections:     0,
		RequestTimeout:     30,
	}
}

type ConfigManager struct {
	config *AppConfig
	path   string
	mu     sync.RWMutex
}

func NewConfigManager(configDir string) (*ConfigManager, error) {
	if err := os.MkdirAll(configDir, 0755); err != nil {
		return nil, fmt.Errorf("create config dir: %w", err)
	}

	configPath := filepath.Join(configDir, "config.json")

	cm := &ConfigManager{
		config: DefaultConfig(),
		path:   configPath,
	}

	if err := cm.Load(); err != nil && !os.IsNotExist(err) {
		return nil, fmt.Errorf("load config: %w", err)
	}

	return cm, nil
}

func (cm *ConfigManager) Load() error {
	cm.mu.Lock()
	defer cm.mu.Unlock()

	data, err := os.ReadFile(cm.path)
	if err != nil {
		return err
	}

	config := DefaultConfig()
	if err := json.Unmarshal(data, config); err != nil {
		return fmt.Errorf("unmarshal config: %w", err)
	}

	cm.config = config
	return nil
}

func (cm *ConfigManager) Save() error {
	cm.mu.RLock()
	defer cm.mu.RUnlock()

	data, err := json.MarshalIndent(cm.config, "", "  ")
	if err != nil {
		return fmt.Errorf("marshal config: %w", err)
	}

	if err := os.WriteFile(cm.path, data, 0644); err != nil {
		return fmt.Errorf("write config: %w", err)
	}

	return nil
}

func (cm *ConfigManager) Get() *AppConfig {
	cm.mu.RLock()
	defer cm.mu.RUnlock()

	cfg := *cm.config
	return &cfg
}

func (cm *ConfigManager) Set(key string, value interface{}) error {
	cm.mu.Lock()
	defer cm.mu.Unlock()

	switch key {
	case "max_download_speed":
		if v, ok := value.(int64); ok {
			cm.config.MaxDownloadSpeed = v
		}
	case "max_upload_speed":
		if v, ok := value.(int64); ok {
			cm.config.MaxUploadSpeed = v
		}
	case "theme":
		if v, ok := value.(string); ok {
			cm.config.Theme = v
		}
	case "compact":
		if v, ok := value.(bool); ok {
			cm.config.Compact = v
		}
	case "notifications":
		if v, ok := value.(bool); ok {
			cm.config.Notifications = v
		}
	case "default_download_dir":
		if v, ok := value.(string); ok {
			cm.config.DefaultDownloadDir = v
		}
	case "max_connections":
		if v, ok := value.(int); ok {
			cm.config.MaxConnections = v
		}
	case "request_timeout":
		if v, ok := value.(int); ok {
			cm.config.RequestTimeout = v
		}
	default:
		return fmt.Errorf("unknown config key: %s", key)
	}

	return cm.Save()
}

func (cm *ConfigManager) SetMaxDownloadSpeed(kbps int64) error {
	if kbps < 0 {
		return fmt.Errorf("speed cannot be negative")
	}
	return cm.Set("max_download_speed", kbps)
}

func (cm *ConfigManager) GetMaxDownloadSpeed() int64 {
	return cm.Get().MaxDownloadSpeed * 1024
}

func (cm *ConfigManager) SetMaxUploadSpeed(kbps int64) error {
	if kbps < 0 {
		return fmt.Errorf("speed cannot be negative")
	}
	return cm.Set("max_upload_speed", kbps)
}

func (cm *ConfigManager) GetMaxUploadSpeed() int64 {
	return cm.Get().MaxUploadSpeed * 1024
}
