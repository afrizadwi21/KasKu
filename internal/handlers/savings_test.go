package handlers_test

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"kasku-backend/internal/auth"
	"kasku-backend/internal/config"
	"kasku-backend/internal/handlers"
)

func setupTestApp(mock sqlmock.Sqlmock) (*fiber.App, string, string) {
	app := fiber.New()
	jwtSecret := "supersecretjwtkeythatisover32characterslong123456"
	cfg := &config.Config{
		JWTSecret:         jwtSecret,
		AllowRegistration: true,
		AccessTTL:         15 * time.Minute,
		RefreshTTL:        720 * time.Hour,
	}

	h := &handlers.Handler{
		DB:     nil, // Akan di-assign di test jika butuh
		Config: cfg,
	}
	h.RegisterRoutes(app)

	// Buat token user
	userID := uuid.New().String()
	token, _ := auth.GenerateAccessToken(userID, cfg.JWTSecret, cfg.AccessTTL)

	return app, token, userID
}

func TestSavingsEndpointFlow(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Gagal membuat mock database: %v", err)
	}
	defer db.Close()

	app := fiber.New()
	jwtSecret := "supersecretjwtkeythatisover32characterslong123456"
	cfg := &config.Config{
		JWTSecret:         jwtSecret,
		AllowRegistration: true,
		AccessTTL:         15 * time.Minute,
		RefreshTTL:        720 * time.Hour,
	}

	h := handlers.NewHandler(db, cfg)
	h.RegisterRoutes(app)

	userID := uuid.New().String()
	token, _ := auth.GenerateAccessToken(userID, cfg.JWTSecret, cfg.AccessTTL)

	// 1. Test POST /api/savings (Create Pot)
	potID := uuid.New().String()
	mock.ExpectQuery("SELECT true FROM users WHERE id = \\$1").
		WithArgs(userID).
		WillReturnRows(sqlmock.NewRows([]string{"true"}).AddRow(true))

	mock.ExpectQuery("SELECT true FROM savings_pots WHERE user_id = \\$1 AND LOWER\\(TRIM\\(name\\)\\) = LOWER\\(TRIM\\(\\$2\\)\\) AND archived = false").
		WithArgs(userID, "Dana Darurat").
		WillReturnRows(sqlmock.NewRows([]string{"true"})) // not found

	mock.ExpectExec("INSERT INTO savings_pots").
		WithArgs(sqlmock.AnyArg(), userID, "Dana Darurat", sqlmock.AnyArg(), sqlmock.AnyArg(), "Tabungan darurat").
		WillReturnResult(sqlmock.NewResult(1, 1))

	createBody := map[string]interface{}{
		"name":          "Dana Darurat",
		"target_amount": 1000000,
		"deadline":      "2027-11-26",
		"note":          "Tabungan darurat",
	}
	bodyBytes, _ := json.Marshal(createBody)

	req := httptest.NewRequest("POST", "/api/savings", bytes.NewReader(bodyBytes))
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("Request create pot gagal: %v", err)
	}
	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("Ekspektasi 201 Created, didapat %d", resp.StatusCode)
	}

	// 2. Test Deposit 20.000 dari saldo 65.353
	// Opening: 0, Masuk: 113652, Keluar: 48299 -> Saldo Total: 65353. Total Tersimpan: 0 -> Saldo Bebas: 65353
	mock.ExpectQuery("SELECT true FROM users WHERE id = \\$1").
		WithArgs(userID).
		WillReturnRows(sqlmock.NewRows([]string{"true"}).AddRow(true))

	mock.ExpectBegin()
	mock.ExpectQuery("SELECT id FROM users WHERE id = \\$1 FOR UPDATE").
		WithArgs(userID).
		WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow(userID))

	mock.ExpectQuery("SELECT name, archived FROM savings_pots WHERE id = \\$1 AND user_id = \\$2").
		WithArgs(potID, userID).
		WillReturnRows(sqlmock.NewRows([]string{"name", "archived"}).AddRow("Dana Darurat", false))

	// GetBalances
	mock.ExpectQuery("SELECT value FROM settings WHERE user_id = \\$1 AND key = 'opening_balance'").
		WithArgs(userID).
		WillReturnRows(sqlmock.NewRows([]string{"value"}).AddRow("0"))

	mock.ExpectQuery("SELECT COALESCE\\(SUM\\(CASE WHEN type = 'masuk'").
		WithArgs(userID).
		WillReturnRows(sqlmock.NewRows([]string{"masuk", "keluar"}).AddRow(113652, 48299))

	mock.ExpectQuery("SELECT COALESCE\\(SUM\\(CASE WHEN sm.type = 'setor'").
		WithArgs(userID).
		WillReturnRows(sqlmock.NewRows([]string{"setor", "tarik_pakai"}).AddRow(0, 0))

	// Insert movement
	mock.ExpectExec("INSERT INTO savings_movements").
		WithArgs(sqlmock.AnyArg(), userID, potID, int64(20000), "2026-11-26", "Setor awal").
		WillReturnResult(sqlmock.NewResult(1, 1))

	// Query saldo pos baru
	mock.ExpectQuery("SELECT COALESCE\\(SUM\\(CASE WHEN type = 'setor'").
		WithArgs(potID, userID).
		WillReturnRows(sqlmock.NewRows([]string{"saldo"}).AddRow(20000))

	mock.ExpectCommit()

	depositBody := map[string]interface{}{
		"amount": 20000,
		"date":   "2026-11-26",
		"note":   "Setor awal",
	}
	depBytes, _ := json.Marshal(depositBody)

	depReq := httptest.NewRequest("POST", fmt.Sprintf("/api/savings/%s/deposit", potID), bytes.NewReader(depBytes))
	depReq.Header.Set("Authorization", "Bearer "+token)
	depReq.Header.Set("Content-Type", "application/json")

	depResp, err := app.Test(depReq)
	if err != nil {
		t.Fatalf("Request deposit gagal: %v", err)
	}
	if depResp.StatusCode != http.StatusOK {
		t.Fatalf("Ekspektasi deposit 200 OK, didapat %d", depResp.StatusCode)
	}

	var depResult map[string]interface{}
	_ = json.NewDecoder(depResp.Body).Decode(&depResult)
	// saldo_pos harus 20000, saldo_bebas harus 45353 (65353 - 20000)
	if depResult["saldo_pos"] != float64(20000) {
		t.Errorf("Ekspektasi saldo pos 20000, didapat %v", depResult["saldo_pos"])
	}
	if depResult["saldo_bebas"] != float64(45353) {
		t.Errorf("Ekspektasi saldo bebas 45353, didapat %v", depResult["saldo_bebas"])
	}
}

func TestSavingsWithdrawalAndSpendValidation(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Gagal membuat mock database: %v", err)
	}
	defer db.Close()

	app := fiber.New()
	jwtSecret := "supersecretjwtkeythatisover32characterslong123456"
	cfg := &config.Config{
		JWTSecret:         jwtSecret,
		AllowRegistration: true,
		AccessTTL:         15 * time.Minute,
		RefreshTTL:        720 * time.Hour,
	}

	h := handlers.NewHandler(db, cfg)
	h.RegisterRoutes(app)

	userID := uuid.New().String()
	potID := uuid.New().String()
	token, _ := auth.GenerateAccessToken(userID, cfg.JWTSecret, cfg.AccessTTL)

	// Test 1: Tarik melebihi saldo pos ditolak 422
	mock.ExpectQuery("SELECT true FROM users WHERE id = \\$1").
		WithArgs(userID).
		WillReturnRows(sqlmock.NewRows([]string{"true"}).AddRow(true))

	mock.ExpectBegin()
	mock.ExpectQuery("SELECT id FROM users WHERE id = \\$1 FOR UPDATE").
		WithArgs(userID).
		WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow(userID))

	mock.ExpectQuery("SELECT p.name, COALESCE\\(SUM").
		WithArgs(potID, userID).
		WillReturnRows(sqlmock.NewRows([]string{"name", "saldo"}).AddRow("Dana Darurat", 20000))

	mock.ExpectRollback()

	withBody := map[string]interface{}{
		"amount": 50000, // melebihi saldo 20000
	}
	wBytes, _ := json.Marshal(withBody)
	wReq := httptest.NewRequest("POST", fmt.Sprintf("/api/savings/%s/withdraw", potID), bytes.NewReader(wBytes))
	wReq.Header.Set("Authorization", "Bearer "+token)
	wReq.Header.Set("Content-Type", "application/json")

	wResp, _ := app.Test(wReq)
	if wResp.StatusCode != http.StatusUnprocessableEntity {
		t.Fatalf("Ekspektasi 422 Unprocessable Entity saat tarik melebihi saldo, didapat %d", wResp.StatusCode)
	}

	// Test 2: Hapus transaksi belanja yang terhubung ke tabungan ditolak (409)
	txID := uuid.New().String()
	mock.ExpectQuery("SELECT true FROM users WHERE id = \\$1").
		WithArgs(userID).
		WillReturnRows(sqlmock.NewRows([]string{"true"}).AddRow(true))

	mock.ExpectQuery("SELECT true FROM savings_movements WHERE transaction_id = \\$1 AND user_id = \\$2").
		WithArgs(txID, userID).
		WillReturnRows(sqlmock.NewRows([]string{"true"}).AddRow(true))

	delTxReq := httptest.NewRequest("DELETE", fmt.Sprintf("/api/transactions/%s", txID), nil)
	delTxReq.Header.Set("Authorization", "Bearer "+token)

	delTxResp, _ := app.Test(delTxReq)
	if delTxResp.StatusCode != http.StatusConflict {
		t.Fatalf("Ekspektasi 409 Conflict saat hapus transaksi dari tabungan, didapat %d", delTxResp.StatusCode)
	}
}

func TestSavingsCloseAndCancelMovementFlow(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Gagal membuat mock database: %v", err)
	}
	defer db.Close()

	app := fiber.New()
	jwtSecret := "supersecretjwtkeythatisover32characterslong123456"
	cfg := &config.Config{
		JWTSecret:         jwtSecret,
		AllowRegistration: true,
		AccessTTL:         15 * time.Minute,
		RefreshTTL:        720 * time.Hour,
	}

	h := handlers.NewHandler(db, cfg)
	h.RegisterRoutes(app)

	userA := uuid.New().String()
	userB := uuid.New().String()
	potID := uuid.New().String()
	movID := uuid.New().String()
	tokenA, _ := auth.GenerateAccessToken(userA, cfg.JWTSecret, cfg.AccessTTL)
	tokenB, _ := auth.GenerateAccessToken(userB, cfg.JWTSecret, cfg.AccessTTL)

	// Test 1: User B mencoba mengakses pos milik User A -> 404
	mock.ExpectQuery("SELECT true FROM users WHERE id = \\$1").
		WithArgs(userB).
		WillReturnRows(sqlmock.NewRows([]string{"true"}).AddRow(true))

	mock.ExpectQuery("SELECT p.id, p.name").
		WithArgs(potID, userB).
		WillReturnRows(sqlmock.NewRows([]string{"id"})) // Not found

	reqB := httptest.NewRequest("GET", fmt.Sprintf("/api/savings/%s", potID), nil)
	reqB.Header.Set("Authorization", "Bearer "+tokenB)
	respB, _ := app.Test(reqB)
	if respB.StatusCode != http.StatusNotFound {
		t.Fatalf("Ekspektasi User B dapat 404 saat akses pos User A, didapat %d", respB.StatusCode)
	}

	// Test 2: User A close pos tabungan (ada sisa saldo 15.000)
	mock.ExpectQuery("SELECT true FROM users WHERE id = \\$1").
		WithArgs(userA).
		WillReturnRows(sqlmock.NewRows([]string{"true"}).AddRow(true))

	mock.ExpectBegin()
	mock.ExpectQuery("SELECT id FROM users WHERE id = \\$1 FOR UPDATE").
		WithArgs(userA).
		WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow(userA))

	mock.ExpectQuery("SELECT p.name, p.archived, COALESCE\\(SUM").
		WithArgs(potID, userA).
		WillReturnRows(sqlmock.NewRows([]string{"name", "archived", "saldo"}).AddRow("Dana Darurat", false, 15000))

	// Insert tarik otomatis
	mock.ExpectExec("INSERT INTO savings_movements").
		WithArgs(sqlmock.AnyArg(), userA, potID, int64(15000), sqlmock.AnyArg()).
		WillReturnResult(sqlmock.NewResult(1, 1))

	// Update archived = true
	mock.ExpectExec("UPDATE savings_pots SET archived = true WHERE id = \\$1 AND user_id = \\$2").
		WithArgs(potID, userA).
		WillReturnResult(sqlmock.NewResult(1, 1))

	// GetBalances
	mock.ExpectQuery("SELECT value FROM settings WHERE user_id = \\$1 AND key = 'opening_balance'").
		WithArgs(userA).
		WillReturnRows(sqlmock.NewRows([]string{"value"}).AddRow("0"))

	mock.ExpectQuery("SELECT COALESCE\\(SUM\\(CASE WHEN type = 'masuk'").
		WithArgs(userA).
		WillReturnRows(sqlmock.NewRows([]string{"masuk", "keluar"}).AddRow(100000, 20000))

	mock.ExpectQuery("SELECT COALESCE\\(SUM\\(CASE WHEN sm.type = 'setor'").
		WithArgs(userA).
		WillReturnRows(sqlmock.NewRows([]string{"setor", "tarik_pakai"}).AddRow(0, 0))

	mock.ExpectCommit()

	closeReq := httptest.NewRequest("POST", fmt.Sprintf("/api/savings/%s/close", potID), nil)
	closeReq.Header.Set("Authorization", "Bearer "+tokenA)
	closeResp, _ := app.Test(closeReq)
	if closeResp.StatusCode != http.StatusOK {
		t.Fatalf("Ekspektasi close pot 200 OK, didapat %d", closeResp.StatusCode)
	}

	// Test 3: Cancel movement 'pakai' menghapus transaksi terkait dan mengembalikan saldo
	txSpendID := uuid.New().String()
	mock.ExpectQuery("SELECT true FROM users WHERE id = \\$1").
		WithArgs(userA).
		WillReturnRows(sqlmock.NewRows([]string{"true"}).AddRow(true))

	mock.ExpectBegin()
	mock.ExpectQuery("SELECT id FROM users WHERE id = \\$1 FOR UPDATE").
		WithArgs(userA).
		WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow(userA))

	mock.ExpectQuery("SELECT pot_id, type, amount, transaction_id FROM savings_movements WHERE id = \\$1 AND user_id = \\$2").
		WithArgs(movID, userA).
		WillReturnRows(sqlmock.NewRows([]string{"pot_id", "type", "amount", "transaction_id"}).AddRow(potID, "pakai", 8000, txSpendID))

	// Hapus transaksi belanja
	mock.ExpectExec("DELETE FROM transactions WHERE id = \\$1 AND user_id = \\$2").
		WithArgs(txSpendID, userA).
		WillReturnResult(sqlmock.NewResult(1, 1))

	// Hapus movement
	mock.ExpectExec("DELETE FROM savings_movements WHERE id = \\$1 AND user_id = \\$2").
		WithArgs(movID, userA).
		WillReturnResult(sqlmock.NewResult(1, 1))

	// Validasi saldo pos baru
	mock.ExpectQuery("SELECT COALESCE\\(SUM\\(CASE WHEN type = 'setor'").
		WithArgs(potID, userA).
		WillReturnRows(sqlmock.NewRows([]string{"saldo"}).AddRow(8000))

	// Validasi saldo bebas baru (GetBalances)
	mock.ExpectQuery("SELECT value FROM settings WHERE user_id = \\$1 AND key = 'opening_balance'").
		WithArgs(userA).
		WillReturnRows(sqlmock.NewRows([]string{"value"}).AddRow("0"))

	mock.ExpectQuery("SELECT COALESCE\\(SUM\\(CASE WHEN type = 'masuk'").
		WithArgs(userA).
		WillReturnRows(sqlmock.NewRows([]string{"masuk", "keluar"}).AddRow(100000, 12000)) // keluar berkurang 8000

	mock.ExpectQuery("SELECT COALESCE\\(SUM\\(CASE WHEN sm.type = 'setor'").
		WithArgs(userA).
		WillReturnRows(sqlmock.NewRows([]string{"setor", "tarik_pakai"}).AddRow(8000, 0))

	mock.ExpectCommit()

	cancelReq := httptest.NewRequest("DELETE", fmt.Sprintf("/api/savings/movements/%s", movID), nil)
	cancelReq.Header.Set("Authorization", "Bearer "+tokenA)
	cancelResp, _ := app.Test(cancelReq)
	if cancelResp.StatusCode != http.StatusOK {
		t.Fatalf("Ekspektasi cancel movement 200 OK, didapat %d", cancelResp.StatusCode)
	}
}

