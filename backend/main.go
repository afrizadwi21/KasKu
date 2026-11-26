package main

import (
	"log"
	"os"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/joho/godotenv"
)

func main() {
	_ = godotenv.Load()

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	app := fiber.New(fiber.Config{
		AppName: "KasKu API v1.0",
	})

	app.Use(logger.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins: "*",
		AllowHeaders: "Origin, Content-Type, Accept, Authorization, X-Secret-Token",
		AllowMethods: "GET, POST, PUT, DELETE, PATCH, OPTIONS",
	}))

	// Health Check
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status":  "healthy",
			"service": "KasKu Backend (Golang Fiber)",
		})
	})

	api := app.Group("/api")

	// Token protection middleware for secure single-user access
	api.Use(func(c *fiber.Ctx) error {
		secretToken := os.Getenv("SECRET_TOKEN")
		// If SECRET_TOKEN is set, enforce matching token
		if secretToken != "" {
			clientToken := c.Get("X-Secret-Token")
			if clientToken == "" {
				authHeader := c.Get("Authorization")
				if len(authHeader) > 7 && authHeader[:7] == "Bearer " {
					clientToken = authHeader[7:]
				}
			}

			if clientToken != secretToken {
				return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
					"error": "Akses ditolak: Token rahasia tidak valid atau tidak disediakan",
				})
			}
		}
		return c.Next()
	})

	api.Get("/ping", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"message": "Authenticated successfully to KasKu API",
		})
	})

	log.Printf("KasKu Fiber Backend berjalan pada port %s...\n", port)
	if err := app.Listen(":" + port); err != nil {
		log.Fatalf("Gagal menjalankan server: %v", err)
	}
}
