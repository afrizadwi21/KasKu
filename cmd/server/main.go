package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"

	"kasku-backend/internal/config"
	"kasku-backend/internal/db"
	"kasku-backend/internal/handlers"
)

func main() {
	cfg := config.LoadConfig()

	// Inisialisasi koneksi database PostgreSQL
	database, err := db.ConnectDB(cfg.DatabaseURL)
	if err != nil {
		log.Printf("[Peringatan] Koneksi database belum terhubung (%v). Server tetap berjalan.", err)
	} else {
		defer database.Close()
		// Jalankan skema awal otomatis
		if err := db.InitSchema(database, db.SchemaInitSQL); err != nil {
			log.Printf("[Peringatan] Gagal mengeksekusi skema database: %v", err)
		}
	}

	app := fiber.New(fiber.Config{
		AppName: "KasKu API Server v1.0",
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			code := fiber.StatusInternalServerError
			if e, ok := err.(*fiber.Error); ok {
				code = e.Code
			}
			return c.Status(code).JSON(fiber.Map{
				"error": err.Error(),
			})
		},
	})

	app.Use(recover.New())
	app.Use(logger.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins: cfg.AllowedOrigin,
		AllowHeaders: "Origin, Content-Type, Accept, Authorization, X-Secret-Token",
		AllowMethods: "GET, POST, PUT, DELETE, PATCH, OPTIONS",
	}))

	h := handlers.NewHandler(database)
	h.RegisterRoutes(app, cfg.SecretToken)

	// Graceful shutdown handling
	go func() {
		sigChan := make(chan os.Signal, 1)
		signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)
		<-sigChan
		log.Println("Menerima sinyal shutdown, mematikan server secara graceful...")
		_ = app.Shutdown()
	}()

	log.Printf("KasKu API Server berjalan pada port :%s ...", cfg.Port)
	if err := app.Listen(":" + cfg.Port); err != nil {
		log.Fatalf("Server berhenti: %v", err)
	}
}
