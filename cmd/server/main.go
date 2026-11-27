package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"kasku-backend/internal/app"
)

func main() {
	fiberApp, database, cfg, h, err := app.NewApp()
	if err != nil {
		log.Fatalf("Konfigurasi server gagal: %v", err)
	}
	if database != nil {
		defer database.Close()
	}

	// Pembersihan gambar yatim saat server start dan setiap 24 jam
	if database != nil {
		go func() {
			if count, err := h.CleanOrphanImages(); err == nil && count > 0 {
				log.Printf("[Cleanup] Berhasil membersihkan %d gambar yatim saat startup.", count)
			}
			ticker := time.NewTicker(24 * time.Hour)
			defer ticker.Stop()
			for range ticker.C {
				if count, err := h.CleanOrphanImages(); err == nil && count > 0 {
					log.Printf("[Cleanup] Berhasil membersihkan %d gambar yatim harian.", count)
				}
			}
		}()
	}

	// Graceful shutdown handling
	go func() {
		sigChan := make(chan os.Signal, 1)
		signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)
		<-sigChan
		log.Println("Menerima sinyal shutdown, mematikan server secara graceful...")
		_ = fiberApp.Shutdown()
	}()

	log.Printf("KasKu Multi-User API Server berjalan pada port :%s ...", cfg.Port)
	if err := fiberApp.Listen(":" + cfg.Port); err != nil {
		log.Fatalf("Server berhenti: %v", err)
	}
}
