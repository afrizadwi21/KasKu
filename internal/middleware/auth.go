package middleware

import (
	"strings"

	"github.com/gofiber/fiber/v2"
)

// TokenAuth middleware untuk mengamankan API dengan token rahasia satu pengguna
func TokenAuth(secretToken string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Jika token rahasia tidak diatur di environment, izinkan (mode dev tanpa proteksi)
		if secretToken == "" {
			return c.Next()
		}

		clientToken := c.Get("X-Secret-Token")
		if clientToken == "" {
			authHeader := c.Get("Authorization")
			if strings.HasPrefix(authHeader, "Bearer ") {
				clientToken = strings.TrimPrefix(authHeader, "Bearer ")
			}
		}

		if clientToken == "" || clientToken != secretToken {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Akses ditolak: Token rahasia tidak valid atau tidak disediakan",
			})
		}

		return c.Next()
	}
}
