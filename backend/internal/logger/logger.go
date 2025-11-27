package logger

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"time"
)

type Level int

const (
	DEBUG Level = iota
	INFO
	WARN
	ERROR
	FATAL
)

var (
	levelNames = map[Level]string{
		DEBUG: "DEBUG",
		INFO:  "INFO",
		WARN:  "WARN",
		ERROR: "ERROR",
		FATAL: "FATAL",
	}
	currentLevel = INFO
	logFile      *os.File
)

func Init(logDir string) error {
	if logDir == "" {
		logDir = "logs"
	}

	if err := os.MkdirAll(logDir, 0755); err != nil {
		return fmt.Errorf("failed to create log directory: %w", err)
	}

	filename := filepath.Join(logDir, fmt.Sprintf("nebula-%s.log", time.Now().Format("2006-01-02")))
	file, err := os.OpenFile(filename, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0666)
	if err != nil {
		return fmt.Errorf("failed to open log file: %w", err)
	}

	logFile = file
	log.SetOutput(file)
	log.SetFlags(log.LstdFlags | log.Lshortfile)

	return nil
}

func SetLevel(level Level) {
	currentLevel = level
}

func Close() {
	if logFile != nil {
		logFile.Close()
	}
}

func logMessage(level Level, format string, v ...interface{}) {
	if level < currentLevel {
		return
	}

	timestamp := time.Now().Format("2006-01-02 15:04:05")
	message := fmt.Sprintf(format, v...)
	logLine := fmt.Sprintf("[%s] [%s] %s", timestamp, levelNames[level], message)

	if logFile != nil {
		log.Println(logLine)
	}

	fmt.Println(logLine)
}

func Debug(format string, v ...interface{}) {
	logMessage(DEBUG, format, v...)
}

func Info(format string, v ...interface{}) {
	logMessage(INFO, format, v...)
}

func Warn(format string, v ...interface{}) {
	logMessage(WARN, format, v...)
}

func Error(format string, v ...interface{}) {
	logMessage(ERROR, format, v...)
}

func Fatal(format string, v ...interface{}) {
	logMessage(FATAL, format, v...)
	os.Exit(1)
}

