package handlers_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"

	"kasku-backend/internal/handlers"
)

func TestValidationErrors(t *testing.T) {
	// Buat handler dengan DB nil untuk menguji validasi request payload
	h := handlers.NewHandler(nil)
	app := fiber.New()
	h.RegisterRoutes(app, "")

	// 1. POST /api/transactions dengan kategori tidak sesuai -> 422
	body1 := map[string]any{
		"date":     "2026-11-26",
		"type":     "masuk",
		"category": "Makanan & Minuman", // salah untuk 'masuk'
		"source":   "Gaji",
		"amount":   50000,
	}
	raw1, _ := json.Marshal(body1)
	req1 := httptest.NewRequest("POST", "/api/transactions", bytes.NewReader(raw1))
	req1.Header.Set("Content-Type", "application/json")
	resp1, err := app.Test(req1)
	if err != nil {
		t.Fatalf("Gagal menjalankan request: %v", err)
	}
	if resp1.StatusCode != http.StatusUnprocessableEntity {
		t.Errorf("Ekspektasi 422 Unprocessable Entity, didapat %d", resp1.StatusCode)
	}
	var errResp1 map[string]string
	_ = json.NewDecoder(resp1.Body).Decode(&errResp1)
	if errResp1["error"] == "" {
		t.Errorf("Format error harus {'error': '...'}, didapat %+v", errResp1)
	}

	// 2. POST /api/transactions type 'masuk' tanpa source -> 422
	body2 := map[string]any{
		"date":     "2026-11-26",
		"type":     "masuk",
		"category": "Gaji/Penghasilan",
		"source":   "", // kosong
		"amount":   100000,
	}
	raw2, _ := json.Marshal(body2)
	req2 := httptest.NewRequest("POST", "/api/transactions", bytes.NewReader(raw2))
	req2.Header.Set("Content-Type", "application/json")
	resp2, _ := app.Test(req2)
	if resp2.StatusCode != http.StatusUnprocessableEntity {
		t.Errorf("Ekspektasi 422 jika source kosong pada uang masuk, didapat %d", resp2.StatusCode)
	}

	// 3. POST /api/transactions format tanggal tidak valid -> 422
	body3 := map[string]any{
		"date":     "26-11-2026", // format salah
		"type":     "keluar",
		"category": "Makanan & Minuman",
		"amount":   15000,
	}
	raw3, _ := json.Marshal(body3)
	req3 := httptest.NewRequest("POST", "/api/transactions", bytes.NewReader(raw3))
	req3.Header.Set("Content-Type", "application/json")
	resp3, _ := app.Test(req3)
	if resp3.StatusCode != http.StatusUnprocessableEntity {
		t.Errorf("Ekspektasi 422 untuk format tanggal salah, didapat %d", resp3.StatusCode)
	}

	// 4. POST /api/transactions amount <= 0 tanpa items -> 422
	body4 := map[string]any{
		"date":     "2026-11-26",
		"type":     "keluar",
		"category": "Makanan & Minuman",
		"amount":   0,
	}
	raw4, _ := json.Marshal(body4)
	req4 := httptest.NewRequest("POST", "/api/transactions", bytes.NewReader(raw4))
	req4.Header.Set("Content-Type", "application/json")
	resp4, _ := app.Test(req4)
	if resp4.StatusCode != http.StatusUnprocessableEntity {
		t.Errorf("Ekspektasi 422 untuk amount 0, didapat %d", resp4.StatusCode)
	}

	// 5. POST /api/subscriptions cycle tidak valid -> 422
	body5 := map[string]any{
		"name":      "Netflix",
		"amount":    186000,
		"cycle":     "harian", // tidak valid
		"first_due": "2026-11-26",
	}
	raw5, _ := json.Marshal(body5)
	req5 := httptest.NewRequest("POST", "/api/subscriptions", bytes.NewReader(raw5))
	req5.Header.Set("Content-Type", "application/json")
	resp5, _ := app.Test(req5)
	if resp5.StatusCode != http.StatusUnprocessableEntity {
		t.Errorf("Ekspektasi 422 untuk siklus langganan tidak valid, didapat %d", resp5.StatusCode)
	}

	// 6. GET /healthz -> 200 {"status":"ok"}
	req6 := httptest.NewRequest("GET", "/healthz", nil)
	resp6, _ := app.Test(req6)
	if resp6.StatusCode != http.StatusOK {
		t.Errorf("Ekspektasi 200 untuk /healthz, didapat %d", resp6.StatusCode)
	}
	var healthResp map[string]string
	_ = json.NewDecoder(resp6.Body).Decode(&healthResp)
	if healthResp["status"] != "ok" {
		t.Errorf("Ekspektasi status 'ok', didapat '%s'", healthResp["status"])
	}
}
