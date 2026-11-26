package config

import (
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	Port              string
	DatabaseURL       string
	JWTSecret         string
	AllowRegistration bool
	AccessTTL         time.Duration
	RefreshTTL        time.Duration
	AllowedOrigin     string
}

func LoadConfig() (*Config, error) {
	_ = godotenv.Load()

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	jwtSecret := os.Getenv("JWT_SECRET")
	if len(strings.TrimSpace(jwtSecret)) < 32 {
		return nil, fmt.Errorf("JWT_SECRET wajib diisi dan minimal 32 karakter")
	}

	allowRegStr := strings.ToLower(strings.TrimSpace(os.Getenv("ALLOW_REGISTRATION")))
	allowRegistration := true
	if allowRegStr == "false" || allowRegStr == "0" || allowRegStr == "no" {
		allowRegistration = false
	}

	accessTTL := 15 * time.Minute
	if ttlStr := os.Getenv("ACCESS_TTL"); ttlStr != "" {
		if d, err := time.ParseDuration(ttlStr); err == nil && d > 0 {
			accessTTL = d
		}
	}

	refreshTTL := 720 * time.Hour // 30 hari
	if ttlStr := os.Getenv("REFRESH_TTL"); ttlStr != "" {
		if d, err := time.ParseDuration(ttlStr); err == nil && d > 0 {
			refreshTTL = d
		}
	}

	allowedOrigin := os.Getenv("ALLOWED_ORIGIN")
	if allowedOrigin == "" {
		allowedOrigin = "*"
	}

	return &Config{
		Port:              port,
		DatabaseURL:       os.Getenv("DATABASE_URL"),
		JWTSecret:         jwtSecret,
		AllowRegistration: allowRegistration,
		AccessTTL:         accessTTL,
		RefreshTTL:        refreshTTL,
		AllowedOrigin:     allowedOrigin,
	}, nil
}
