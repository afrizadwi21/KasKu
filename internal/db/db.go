package db

import (
	"database/sql"
	"fmt"
	"log"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"
)

// ConnectDB membuka koneksi ke PostgreSQL (Neon compatible)
func ConnectDB(databaseURL string) (*sql.DB, error) {
	if databaseURL == "" {
		return nil, fmt.Errorf("DATABASE_URL belum diatur")
	}

	db, err := sql.Open("pgx", databaseURL)
	if err != nil {
		return nil, fmt.Errorf("gagal membuka koneksi database: %w", err)
	}

	// Konfigurasi connection pooling yang optimal untuk Neon serverless
	db.SetMaxOpenConns(20)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(15 * time.Minute)
	db.SetConnMaxIdleTime(5 * time.Minute)

	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("gagal terhubung ke database: %w", err)
	}

	log.Println("Koneksi database PostgreSQL (Neon) berhasil terhubung.")
	return db, nil
}

// InitSchema mengeksekusi SQL skema database awal
func InitSchema(db *sql.DB, schemaSQL string) error {
	if schemaSQL == "" {
		return nil
	}
	_, err := db.Exec(schemaSQL)
	if err != nil {
		return fmt.Errorf("gagal menjalankan skema database: %w", err)
	}
	log.Println("Inisialisasi skema database berhasil diterapkan.")
	return nil
}
