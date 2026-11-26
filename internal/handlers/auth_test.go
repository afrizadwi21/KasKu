package handlers_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"regexp"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/gofiber/fiber/v2"

	"kasku-backend/internal/auth"
	"kasku-backend/internal/config"
	"kasku-backend/internal/handlers"
)

func TestAuthFlows(t *testing.T) {
	jwtSecret := "kasku_jwt_secret_key_minimum_32_characters_random_string"
	cfg := &config.Config{
		JWTSecret:         jwtSecret,
		AllowRegistration: true,
		AccessTTL:         15 * time.Minute,
		RefreshTTL:        720 * time.Hour,
	}

	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Gagal inisialisasi sqlmock: %v", err)
	}
	defer db.Close()

	h := handlers.NewHandler(db, cfg)
	app := fiber.New()
	h.RegisterRoutes(app)

	// 1. Registrasi Sukses
	bodyReg := map[string]any{
		"name":     "Afriza",
		"email":    "afriza@example.com",
		"password": "Password123",
	}
	rawReg, _ := json.Marshal(bodyReg)

	// Mock queries for register:
	// - SELECT true FROM users WHERE lower(email) = $1
	mock.ExpectQuery(regexp.QuoteMeta("SELECT true FROM users WHERE lower(email) = $1")).
		WithArgs("afriza@example.com").
		WillReturnRows(sqlmock.NewRows([]string{"true"})) // empty -> not exists

	mock.ExpectBegin()
	mock.ExpectExec(regexp.QuoteMeta("INSERT INTO users")).
		WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectExec(regexp.QuoteMeta("INSERT INTO settings")).
		WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectExec(regexp.QuoteMeta("INSERT INTO refresh_tokens")).
		WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	req1 := httptest.NewRequest("POST", "/auth/register", bytes.NewReader(rawReg))
	req1.Header.Set("Content-Type", "application/json")
	resp1, err := app.Test(req1)
	if err != nil {
		t.Fatalf("Gagal request register: %v", err)
	}
	if resp1.StatusCode != http.StatusCreated {
		t.Errorf("Ekspektasi 201 Created saat register, didapat %d", resp1.StatusCode)
	}
	var regResp handlers.AuthResponse
	_ = json.NewDecoder(resp1.Body).Decode(&regResp)
	if regResp.AccessToken == "" || regResp.RefreshToken == "" {
		t.Error("Register harus mengembalikan access_token dan refresh_token")
	}

	// 2. Registrasi dengan Password Lemah (< 8 char atau tanpa angka) -> 422
	bodyWeak := map[string]any{
		"name":     "Afriza",
		"email":    "afriza2@example.com",
		"password": "hanyahuruf",
	}
	rawWeak, _ := json.Marshal(bodyWeak)
	req2 := httptest.NewRequest("POST", "/auth/register", bytes.NewReader(rawWeak))
	req2.Header.Set("Content-Type", "application/json")
	resp2, _ := app.Test(req2)
	if resp2.StatusCode != http.StatusUnprocessableEntity {
		t.Errorf("Ekspektasi 422 untuk password lemah, didapat %d", resp2.StatusCode)
	}

	// 3. Registrasi Ditutup saat ALLOW_REGISTRATION=false -> 403
	cfgClosed := &config.Config{
		JWTSecret:         jwtSecret,
		AllowRegistration: false,
	}
	hClosed := handlers.NewHandler(db, cfgClosed)
	appClosed := fiber.New()
	hClosed.RegisterRoutes(appClosed)

	req3 := httptest.NewRequest("POST", "/auth/register", bytes.NewReader(rawReg))
	req3.Header.Set("Content-Type", "application/json")
	resp3, _ := appClosed.Test(req3)
	if resp3.StatusCode != http.StatusForbidden {
		t.Errorf("Ekspektasi 403 saat registrasi ditutup, didapat %d", resp3.StatusCode)
	}

	// 4. Login Sukses
	hashedPwd, _ := auth.HashPassword("Password123")
	mock.ExpectQuery(regexp.QuoteMeta("SELECT id, name, password_hash FROM users WHERE lower(email) = $1")).
		WithArgs("afriza@example.com").
		WillReturnRows(sqlmock.NewRows([]string{"id", "name", "password_hash"}).AddRow("user-uuid-1", "Afriza", hashedPwd))
	mock.ExpectExec(regexp.QuoteMeta("INSERT INTO refresh_tokens")).
		WillReturnResult(sqlmock.NewResult(1, 1))

	bodyLogin := map[string]any{
		"email":    "afriza@example.com",
		"password": "Password123",
	}
	rawLogin, _ := json.Marshal(bodyLogin)
	req4 := httptest.NewRequest("POST", "/auth/login", bytes.NewReader(rawLogin))
	req4.Header.Set("Content-Type", "application/json")
	resp4, _ := app.Test(req4)
	if resp4.StatusCode != http.StatusOK {
		t.Errorf("Ekspektasi 200 saat login benar, didapat %d", resp4.StatusCode)
	}

	// 5. Login Password Salah -> 401 ("Email atau password salah")
	mock.ExpectQuery(regexp.QuoteMeta("SELECT id, name, password_hash FROM users WHERE lower(email) = $1")).
		WithArgs("afriza@example.com").
		WillReturnRows(sqlmock.NewRows([]string{"id", "name", "password_hash"}).AddRow("user-uuid-1", "Afriza", hashedPwd))

	bodyWrongLogin := map[string]any{
		"email":    "afriza@example.com",
		"password": "PasswordSalah123",
	}
	rawWrongLogin, _ := json.Marshal(bodyWrongLogin)
	req5 := httptest.NewRequest("POST", "/auth/login", bytes.NewReader(rawWrongLogin))
	req5.Header.Set("Content-Type", "application/json")
	resp5, _ := app.Test(req5)
	if resp5.StatusCode != http.StatusUnauthorized {
		t.Errorf("Ekspektasi 401 saat login salah, didapat %d", resp5.StatusCode)
	}

	// 6. Refresh Token dengan Rotasi
	rawRefresh := "valid-refresh-token-sample-12345"
	hashRefresh := auth.HashToken(rawRefresh)

	mock.ExpectQuery(regexp.QuoteMeta("SELECT id, user_id, expires_at, revoked FROM refresh_tokens WHERE token_hash = $1")).
		WithArgs(hashRefresh).
		WillReturnRows(sqlmock.NewRows([]string{"id", "user_id", "expires_at", "revoked"}).
			AddRow("token-uuid-1", "user-uuid-1", time.Now().Add(24*time.Hour), false))

	mock.ExpectQuery(regexp.QuoteMeta("SELECT name, email FROM users WHERE id = $1")).
		WithArgs("user-uuid-1").
		WillReturnRows(sqlmock.NewRows([]string{"name", "email"}).AddRow("Afriza", "afriza@example.com"))

	mock.ExpectBegin()
	mock.ExpectExec(regexp.QuoteMeta("UPDATE refresh_tokens SET revoked = true WHERE id = $1")).
		WithArgs("token-uuid-1").
		WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectExec(regexp.QuoteMeta("INSERT INTO refresh_tokens")).
		WillReturnResult(sqlmock.NewResult(1, 1))
	mock.ExpectCommit()

	bodyRefresh := map[string]any{"refresh_token": rawRefresh}
	rawRefreshBody, _ := json.Marshal(bodyRefresh)
	req6 := httptest.NewRequest("POST", "/auth/refresh", bytes.NewReader(rawRefreshBody))
	req6.Header.Set("Content-Type", "application/json")
	resp6, _ := app.Test(req6)
	if resp6.StatusCode != http.StatusOK {
		t.Errorf("Ekspektasi 200 saat refresh token valid, didapat %d", resp6.StatusCode)
	}

	// 7. Refresh Token Bekas Digunakan Kembali (Token Reuse) -> Cabut semua sesi user
	mock.ExpectQuery(regexp.QuoteMeta("SELECT id, user_id, expires_at, revoked FROM refresh_tokens WHERE token_hash = $1")).
		WithArgs(hashRefresh).
		WillReturnRows(sqlmock.NewRows([]string{"id", "user_id", "expires_at", "revoked"}).
			AddRow("token-uuid-1", "user-uuid-1", time.Now().Add(24*time.Hour), true)) // revoked = true!

	mock.ExpectExec(regexp.QuoteMeta("UPDATE refresh_tokens SET revoked = true WHERE user_id = $1")).
		WithArgs("user-uuid-1").
		WillReturnResult(sqlmock.NewResult(1, 2))

	req7 := httptest.NewRequest("POST", "/auth/refresh", bytes.NewReader(rawRefreshBody))
	req7.Header.Set("Content-Type", "application/json")
	resp7, _ := app.Test(req7)
	if resp7.StatusCode != http.StatusUnauthorized {
		t.Errorf("Ekspektasi 401 saat refresh token bekas dipakai ulang, didapat %d", resp7.StatusCode)
	}
}

func TestDataIsolationBetweenUsers(t *testing.T) {
	jwtSecret := "kasku_jwt_secret_key_minimum_32_characters_random_string"
	cfg := &config.Config{
		JWTSecret:         jwtSecret,
		AllowRegistration: true,
		AccessTTL:         15 * time.Minute,
		RefreshTTL:        720 * time.Hour,
	}

	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("Gagal inisialisasi sqlmock: %v", err)
	}
	defer db.Close()

	h := handlers.NewHandler(db, cfg)
	app := fiber.New()
	h.RegisterRoutes(app)

	// User B login dengan tokennya sendiri
	userBID := "11111111-2222-3333-4444-555555555555"
	tokenB, _ := auth.GenerateAccessToken(userBID, jwtSecret, 15*time.Minute)
	authHeaderB := "Bearer " + tokenB

	txIDA := "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"

	// 1. User B mencoba GET transaksi milik User A -> Harus 404!
	mock.ExpectQuery(regexp.QuoteMeta("SELECT true FROM users WHERE id = $1")).
		WithArgs(userBID).
		WillReturnRows(sqlmock.NewRows([]string{"true"}).AddRow(true))

	// GetOpeningBalance User B
	mock.ExpectQuery(regexp.QuoteMeta("SELECT value FROM settings WHERE user_id = $1 AND key = 'opening_balance'")).
		WithArgs(userBID).
		WillReturnRows(sqlmock.NewRows([]string{"value"}).AddRow("0"))

	// Query transaksi dengan user_id = userB dan id = txIDA -> tidak ada baris (karena milik user A)
	mock.ExpectQuery(regexp.QuoteMeta("WHERE id = $2")).
		WithArgs(userBID, txIDA).
		WillReturnRows(sqlmock.NewRows([]string{"id"})) // empty

	req1 := httptest.NewRequest("GET", "/api/transactions/"+txIDA, nil)
	req1.Header.Set("Authorization", authHeaderB)
	resp1, err := app.Test(req1)
	if err != nil {
		t.Fatalf("Gagal request: %v", err)
	}
	if resp1.StatusCode != http.StatusNotFound {
		t.Errorf("Ekspektasi 404 saat User B mengakses transaksi User A, didapat %d", resp1.StatusCode)
	}

	// 2. User B mencoba DELETE transaksi milik User A -> Harus 404!
	mock.ExpectQuery(regexp.QuoteMeta("SELECT true FROM users WHERE id = $1")).
		WithArgs(userBID).
		WillReturnRows(sqlmock.NewRows([]string{"true"}).AddRow(true))

	// DELETE WHERE id = $1 AND user_id = $2 -> rowsAffected = 0
	mock.ExpectExec(regexp.QuoteMeta("DELETE FROM transactions WHERE id = $1 AND user_id = $2")).
		WithArgs(txIDA, userBID).
		WillReturnResult(sqlmock.NewResult(0, 0))

	req2 := httptest.NewRequest("DELETE", "/api/transactions/"+txIDA, nil)
	req2.Header.Set("Authorization", authHeaderB)
	resp2, _ := app.Test(req2)
	if resp2.StatusCode != http.StatusNotFound {
		t.Errorf("Ekspektasi 404 saat User B menghapus transaksi User A, didapat %d", resp2.StatusCode)
	}

	// 3. User B mencoba bayar langganan milik User A -> Harus 404!
	subIDA := "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"
	mock.ExpectQuery(regexp.QuoteMeta("SELECT true FROM users WHERE id = $1")).
		WithArgs(userBID).
		WillReturnRows(sqlmock.NewRows([]string{"true"}).AddRow(true))

	mock.ExpectBegin()
	mock.ExpectQuery(regexp.QuoteMeta("SELECT name, amount, active FROM subscriptions WHERE id = $1 AND user_id = $2")).
		WithArgs(subIDA, userBID).
		WillReturnRows(sqlmock.NewRows([]string{"name"})) // empty -> not found
	mock.ExpectRollback()

	req3 := httptest.NewRequest("POST", "/api/subscriptions/"+subIDA+"/pay", nil)
	req3.Header.Set("Authorization", authHeaderB)
	resp3, _ := app.Test(req3)
	if resp3.StatusCode != http.StatusNotFound {
		t.Errorf("Ekspektasi 404 saat User B membayar langganan User A, didapat %d", resp3.StatusCode)
	}

	// 4. User B mencoba bayar tagihan milik User A -> Harus 404!
	billIDA := "cccccccc-cccc-cccc-cccc-cccccccccccc"
	mock.ExpectQuery(regexp.QuoteMeta("SELECT true FROM users WHERE id = $1")).
		WithArgs(userBID).
		WillReturnRows(sqlmock.NewRows([]string{"true"}).AddRow(true))

	mock.ExpectBegin()
	mock.ExpectQuery(regexp.QuoteMeta("SELECT title, amount, paid, note FROM bills WHERE id = $1 AND user_id = $2")).
		WithArgs(billIDA, userBID).
		WillReturnRows(sqlmock.NewRows([]string{"title"})) // empty -> not found
	mock.ExpectRollback()

	req4 := httptest.NewRequest("POST", "/api/bills/"+billIDA+"/pay", nil)
	req4.Header.Set("Authorization", authHeaderB)
	resp4, _ := app.Test(req4)
	if resp4.StatusCode != http.StatusNotFound {
		t.Errorf("Ekspektasi 404 saat User B membayar tagihan User A, didapat %d", resp4.StatusCode)
	}
}
