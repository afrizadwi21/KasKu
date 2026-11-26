package middleware_test

import (
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"

	"kasku-backend/internal/middleware"
)

func TestTokenAuth(t *testing.T) {
	secret := "secret-kasku-123"

	app := fiber.New()
	app.Use("/protected", middleware.TokenAuth(secret))
	app.Get("/protected/test", func(c *fiber.Ctx) error {
		return c.SendString("sukses")
	})

	// Test 1: Tanpa token -> 401
	req1 := httptest.NewRequest("GET", "/protected/test", nil)
	resp1, err := app.Test(req1)
	if err != nil {
		t.Fatalf("Gagal menjalankan request: %v", err)
	}
	if resp1.StatusCode != http.StatusUnauthorized {
		t.Errorf("Ekspektasi 401 Unauthorized tanpa token, didapat %d", resp1.StatusCode)
	}

	// Test 2: Token salah -> 401
	req2 := httptest.NewRequest("GET", "/protected/test", nil)
	req2.Header.Set("X-Secret-Token", "wrong-token")
	resp2, _ := app.Test(req2)
	if resp2.StatusCode != http.StatusUnauthorized {
		t.Errorf("Ekspektasi 401 dengan token salah, didapat %d", resp2.StatusCode)
	}

	// Test 3: Token benar via X-Secret-Token -> 200
	req3 := httptest.NewRequest("GET", "/protected/test", nil)
	req3.Header.Set("X-Secret-Token", secret)
	resp3, _ := app.Test(req3)
	if resp3.StatusCode != http.StatusOK {
		t.Errorf("Ekspektasi 200 dengan X-Secret-Token benar, didapat %d", resp3.StatusCode)
	}
	body3, _ := io.ReadAll(resp3.Body)
	if string(body3) != "sukses" {
		t.Errorf("Body tidak sesuai, didapat %s", string(body3))
	}

	// Test 4: Token benar via Authorization: Bearer <token> -> 200
	req4 := httptest.NewRequest("GET", "/protected/test", nil)
	req4.Header.Set("Authorization", "Bearer "+secret)
	resp4, _ := app.Test(req4)
	if resp4.StatusCode != http.StatusOK {
		t.Errorf("Ekspektasi 200 dengan Bearer token, didapat %d", resp4.StatusCode)
	}
}
