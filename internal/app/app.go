package app

import (
	"database/sql"
	"log"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"

	"kasku-backend/internal/config"
	"kasku-backend/internal/db"
	"kasku-backend/internal/handlers"
)

// NewApp membangun instance Fiber, koneksi database, dan mendaftarkan seluruh rute API KasKu
func NewApp() (*fiber.App, *sql.DB, *config.Config, *handlers.Handler, error) {
	cfg, err := config.LoadConfig()
	if err != nil {
		return nil, nil, nil, nil, err
	}

	database, err := db.ConnectDB(cfg.DatabaseURL)
	if err != nil {
		log.Printf("[Peringatan] Koneksi database belum terhubung (%v). Server tetap berjalan.", err)
	} else {
		if err := db.InitSchema(database, db.SchemaInitSQL); err != nil {
			log.Printf("[Peringatan] Gagal mengeksekusi skema database: %v", err)
		}
	}

	fiberApp := fiber.New(fiber.Config{
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

	fiberApp.Use(recover.New())
	fiberApp.Use(logger.New(logger.Config{
		Format: "[${time}] ${status} - ${method} ${path} (${latency})\n",
	}))
	fiberApp.Use(cors.New(cors.Config{
		AllowOrigins: cfg.AllowedOrigin,
		AllowHeaders: "Origin, Content-Type, Accept, Authorization",
		AllowMethods: "GET, POST, PUT, DELETE, PATCH, OPTIONS",
	}))

	h := handlers.NewHandler(database, cfg)
	h.RegisterRoutes(fiberApp)

	return fiberApp, database, cfg, h, nil
}
