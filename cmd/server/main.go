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
	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatalf("Konfigurasi server gagal: %v", err)
	}

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
		AppName: "KasKu Multi-User API Server v2.0",
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

	// Logger yang aman: tidak pernah mencatat body, password, atau token
	app.Use(logger.New(logger.Config{
		Format: "[${time}] ${status} - ${method} ${path} (${latency})\n",
	}))

	// CORS hanya untuk ALLOWED_ORIGIN yang ditentukan
	app.Use(cors.New(cors.Config{
		AllowOrigins: cfg.AllowedOrigin,
		AllowHeaders: "Origin, Content-Type, Accept, Authorization",
		AllowMethods: "GET, POST, PUT, DELETE, PATCH, OPTIONS",
	}))

	h := handlers.NewHandler(database, cfg)
	h.RegisterRoutes(app)

	// Graceful shutdown handling
	go func() {
		sigChan := make(chan os.Signal, 1)
		signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)
		<-sigChan
		log.Println("Menerima sinyal shutdown, mematikan server secara graceful...")
		_ = app.Shutdown()
	}()

	log.Printf("KasKu Multi-User API Server berjalan pada port :%s ...", cfg.Port)
	if err := app.Listen(":" + cfg.Port); err != nil {
		log.Fatalf("Server berhenti: %v", err)
	}
}
