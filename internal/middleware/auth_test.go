package middleware_test

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"

	"kasku-backend/internal/auth"
	"kasku-backend/internal/middleware"
)

func TestJWTAuthMiddleware(t *testing.T) {
	jwtSecret := "kasku_jwt_secret_key_minimum_32_characters_random_string"

	app := fiber.New()
	app.Use(middleware.SecurityHeaders())
	app.Use("/protected", middleware.JWTAuth(nil, jwtSecret))
	app.Get("/protected/me", func(c *fiber.Ctx) error {
		userID := middleware.GetUserID(c)
		return c.JSON(fiber.Map{
			"status":  "ok",
			"user_id": userID,
		})
	})

	// 1. Tanpa header Authorization -> 401
	req1 := httptest.NewRequest("GET", "/protected/me", nil)
	resp1, err := app.Test(req1)
	if err != nil {
		t.Fatalf("Gagal menjalankan test: %v", err)
	}
	if resp1.StatusCode != http.StatusUnauthorized {
		t.Errorf("Ekspektasi 401 tanpa token, didapat %d", resp1.StatusCode)
	}

	// 2. Token salah format -> 401
	req2 := httptest.NewRequest("GET", "/protected/me", nil)
	req2.Header.Set("Authorization", "Bearer invalid-token-string")
	resp2, _ := app.Test(req2)
	if resp2.StatusCode != http.StatusUnauthorized {
		t.Errorf("Ekspektasi 401 untuk token invalid, didapat %d", resp2.StatusCode)
	}

	// 3. Token kedaluwarsa -> 401
	expiredToken, _ := auth.GenerateAccessToken("user-123", jwtSecret, -1*time.Minute)
	req3 := httptest.NewRequest("GET", "/protected/me", nil)
	req3.Header.Set("Authorization", "Bearer "+expiredToken)
	resp3, _ := app.Test(req3)
	if resp3.StatusCode != http.StatusUnauthorized {
		t.Errorf("Ekspektasi 401 untuk token kedaluwarsa, didapat %d", resp3.StatusCode)
	}

	// 4. Token dengan secret berbeda -> 401
	wrongSecretToken, _ := auth.GenerateAccessToken("user-123", "another_secret_key_min_32_chars_long_12345", 15*time.Minute)
	req4 := httptest.NewRequest("GET", "/protected/me", nil)
	req4.Header.Set("Authorization", "Bearer "+wrongSecretToken)
	resp4, _ := app.Test(req4)
	if resp4.StatusCode != http.StatusUnauthorized {
		t.Errorf("Ekspektasi 401 untuk secret berbeda, didapat %d", resp4.StatusCode)
	}

	// 5. Token valid -> 200 dan user_id tersimpan di context
	validToken, _ := auth.GenerateAccessToken("user-123-abc", jwtSecret, 15*time.Minute)
	req5 := httptest.NewRequest("GET", "/protected/me", nil)
	req5.Header.Set("Authorization", "Bearer "+validToken)
	resp5, _ := app.Test(req5)
	if resp5.StatusCode != http.StatusOK {
		t.Errorf("Ekspektasi 200 untuk token valid, didapat %d", resp5.StatusCode)
	}

	// 6. Uji Security Headers
	if resp5.Header.Get("X-Content-Type-Options") != "nosniff" {
		t.Errorf("Header X-Content-Type-Options harus 'nosniff', didapat '%s'", resp5.Header.Get("X-Content-Type-Options"))
	}
	if resp5.Header.Get("X-Frame-Options") != "DENY" {
		t.Errorf("Header X-Frame-Options harus 'DENY', didapat '%s'", resp5.Header.Get("X-Frame-Options"))
	}
}
