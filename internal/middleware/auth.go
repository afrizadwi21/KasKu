package middleware

import (
	"database/sql"
	"strings"

	"github.com/gofiber/fiber/v2"

	"kasku-backend/internal/auth"
)

// JWTAuth middleware untuk memvalidasi JWT Access Token dan mengisolasi user_id
func JWTAuth(db *sql.DB, jwtSecret string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if !strings.HasPrefix(authHeader, "Bearer ") {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Sesi berakhir, silakan login lagi",
			})
		}

		tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
		tokenStr = strings.TrimSpace(tokenStr)
		if tokenStr == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Sesi berakhir, silakan login lagi",
			})
		}

		userID, err := auth.ValidateAccessToken(tokenStr, jwtSecret)
		if err != nil || userID == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Sesi berakhir, silakan login lagi",
			})
		}

		// Verifikasi bahwa user benar-benar ada di database
		if db != nil {
			var exists bool
			err = db.QueryRow("SELECT true FROM users WHERE id = $1", userID).Scan(&exists)
			if err != nil || !exists {
				return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
					"error": "Sesi berakhir, silakan login lagi",
				})
			}
		}

		// Simpan user_id di context request
		c.Locals("userID", userID)

		return c.Next()
	}
}

// SecurityHeaders menambahkan header keamanan dasar
func SecurityHeaders() fiber.Handler {
	return func(c *fiber.Ctx) error {
		c.Set("X-Content-Type-Options", "nosniff")
		c.Set("X-Frame-Options", "DENY")
		return c.Next()
	}
}

// GetUserID helper mengambil userID dari context request
func GetUserID(c *fiber.Ctx) string {
	val := c.Locals("userID")
	if str, ok := val.(string); ok {
		return str
	}
	return ""
}
