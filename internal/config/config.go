package config

import (
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	Port          string
	DatabaseURL   string
	SecretToken   string
	AllowedOrigin string
}

func LoadConfig() *Config {
	_ = godotenv.Load()

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	allowedOrigin := os.Getenv("ALLOWED_ORIGIN")
	if allowedOrigin == "" {
		allowedOrigin = "*"
	}

	return &Config{
		Port:          port,
		DatabaseURL:   os.Getenv("DATABASE_URL"),
		SecretToken:   os.Getenv("SECRET_TOKEN"),
		AllowedOrigin: allowedOrigin,
	}
}
