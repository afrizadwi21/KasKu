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

func TestWishlistPreviewAndBuyFlow(t *testing.T) {
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
	itemID := uuid.New().String()
	token, _ := auth.GenerateAccessToken(userID, cfg.JWTSecret, cfg.AccessTTL)

	// 1. Preview Wishlist Item "Headset" 30.000 dengan saldo total 65353, bebas 45353
	mock.ExpectQuery("SELECT true FROM users WHERE id = \\$1").
		WithArgs(userID).
		WillReturnRows(sqlmock.NewRows([]string{"true"}).AddRow(true))

	// Get item
	mock.ExpectQuery("SELECT name, price, saving_pot_id FROM wishlist_items WHERE id = \\$1 AND user_id = \\$2").
		WithArgs(itemID, userID).
		WillReturnRows(sqlmock.NewRows([]string{"name", "price", "saving_pot_id"}).AddRow("Headset", 30000, nil))

	// Get balances
	mock.ExpectQuery("SELECT value FROM settings WHERE user_id = \\$1 AND key = 'opening_balance'").
		WithArgs(userID).
		WillReturnRows(sqlmock.NewRows([]string{"value"}).AddRow("0"))

	mock.ExpectQuery("SELECT COALESCE\\(SUM\\(CASE WHEN type = 'masuk'").
		WithArgs(userID).
		WillReturnRows(sqlmock.NewRows([]string{"masuk", "keluar"}).AddRow(113652, 48299))

	mock.ExpectQuery("SELECT COALESCE\\(SUM\\(CASE WHEN sm.type = 'setor'").
		WithArgs(userID).
		WillReturnRows(sqlmock.NewRows([]string{"setor", "tarik_pakai"}).AddRow(20000, 0))

	// Get tagihan 7 hari
	mock.ExpectQuery("SELECT COALESCE\\(SUM\\(amount\\), 0\\) FROM bills").
		WithArgs(userID, sqlmock.AnyArg()).
		WillReturnRows(sqlmock.NewRows([]string{"sum"}).AddRow(0))

	mock.ExpectQuery("SELECT name, amount, cycle, first_due FROM subscriptions").
		WithArgs(userID).
		WillReturnRows(sqlmock.NewRows([]string{"name", "amount", "cycle", "first_due"}))

	prevReq := httptest.NewRequest("GET", fmt.Sprintf("/api/wishlist/%s/preview?sumber=bebas", itemID), nil)
	prevReq.Header.Set("Authorization", "Bearer "+token)

	prevResp, err := app.Test(prevReq)
	if err != nil {
		t.Fatalf("Request preview gagal: %v", err)
	}
	if prevResp.StatusCode != http.StatusOK {
		t.Fatalf("Ekspektasi 200 OK untuk preview, didapat %d", prevResp.StatusCode)
	}

	var prevData map[string]interface{}
	_ = json.NewDecoder(prevResp.Body).Decode(&prevData)
	if prevData["cukup"] != true {
		t.Errorf("Ekspektasi cukup=true, didapat %v", prevData["cukup"])
	}
	if prevData["saldo_total_setelah"] != float64(35353) {
		t.Errorf("Ekspektasi saldo total setelah 35353, didapat %v", prevData["saldo_total_setelah"])
	}
	if prevData["saldo_bebas_setelah"] != float64(15353) {
		t.Errorf("Ekspektasi saldo bebas setelah 15353, didapat %v", prevData["saldo_bebas_setelah"])
	}

	// 2. Buy Wishlist Item "Headset" 30.000
	mock.ExpectQuery("SELECT true FROM users WHERE id = \\$1").
		WithArgs(userID).
		WillReturnRows(sqlmock.NewRows([]string{"true"}).AddRow(true))

	mock.ExpectBegin()
	mock.ExpectQuery("SELECT id FROM users WHERE id = \\$1 FOR UPDATE").
		WithArgs(userID).
		WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow(userID))

	mock.ExpectQuery("SELECT name, price, category, status, saving_pot_id FROM wishlist_items WHERE id = \\$1 AND user_id = \\$2").
		WithArgs(itemID, userID).
		WillReturnRows(sqlmock.NewRows([]string{"name", "price", "category", "status", "saving_pot_id"}).AddRow("Headset", 30000, "Belanja", "aktif", nil))

	// Get balances di buy
	mock.ExpectQuery("SELECT value FROM settings WHERE user_id = \\$1 AND key = 'opening_balance'").
		WithArgs(userID).
		WillReturnRows(sqlmock.NewRows([]string{"value"}).AddRow("0"))

	mock.ExpectQuery("SELECT COALESCE\\(SUM\\(CASE WHEN type = 'masuk'").
		WithArgs(userID).
		WillReturnRows(sqlmock.NewRows([]string{"masuk", "keluar"}).AddRow(113652, 48299))

	mock.ExpectQuery("SELECT COALESCE\\(SUM\\(CASE WHEN sm.type = 'setor'").
		WithArgs(userID).
		WillReturnRows(sqlmock.NewRows([]string{"setor", "tarik_pakai"}).AddRow(20000, 0))

	// Insert transaction
	mock.ExpectExec("INSERT INTO transactions").
		WithArgs(sqlmock.AnyArg(), userID, sqlmock.AnyArg(), "Belanja", "", "Headset", int64(30000)).
		WillReturnResult(sqlmock.NewResult(1, 1))

	// Insert item
	mock.ExpectExec("INSERT INTO transaction_items").
		WithArgs(sqlmock.AnyArg(), sqlmock.AnyArg(), "Headset", int64(30000)).
		WillReturnResult(sqlmock.NewResult(1, 1))

	// Update wishlist_items
	mock.ExpectExec("UPDATE wishlist_items SET status = 'dibeli'").
		WithArgs(sqlmock.AnyArg(), sqlmock.AnyArg(), itemID, userID).
		WillReturnResult(sqlmock.NewResult(1, 1))

	// Final balances query
	mock.ExpectQuery("SELECT value FROM settings WHERE user_id = \\$1 AND key = 'opening_balance'").
		WithArgs(userID).
		WillReturnRows(sqlmock.NewRows([]string{"value"}).AddRow("0"))

	mock.ExpectQuery("SELECT COALESCE\\(SUM\\(CASE WHEN type = 'masuk'").
		WithArgs(userID).
		WillReturnRows(sqlmock.NewRows([]string{"masuk", "keluar"}).AddRow(113652, 78299)) // keluar +30000

	mock.ExpectQuery("SELECT COALESCE\\(SUM\\(CASE WHEN sm.type = 'setor'").
		WithArgs(userID).
		WillReturnRows(sqlmock.NewRows([]string{"setor", "tarik_pakai"}).AddRow(20000, 0))

	mock.ExpectCommit()

	buyBody := map[string]interface{}{
		"sumber": "bebas",
	}
	bBytes, _ := json.Marshal(buyBody)

	buyReq := httptest.NewRequest("POST", fmt.Sprintf("/api/wishlist/%s/buy", itemID), bytes.NewReader(bBytes))
	buyReq.Header.Set("Authorization", "Bearer "+token)
	buyReq.Header.Set("Content-Type", "application/json")

	buyResp, err := app.Test(buyReq)
	if err != nil {
		t.Fatalf("Request buy gagal: %v", err)
	}
	if buyResp.StatusCode != http.StatusOK {
		var errObj map[string]interface{}
		_ = json.NewDecoder(buyResp.Body).Decode(&errObj)
		t.Fatalf("Ekspektasi buy 200 OK, didapat %d, err: %v", buyResp.StatusCode, errObj)
	}

	var buyData map[string]interface{}
	_ = json.NewDecoder(buyResp.Body).Decode(&buyData)
	if buyData["saldo_total"] != float64(35353) {
		t.Errorf("Ekspektasi saldo total setelah buy 35353, didapat %v", buyData["saldo_total"])
	}
	if buyData["saldo_bebas"] != float64(15353) {
		t.Errorf("Ekspektasi saldo bebas setelah buy 15353, didapat %v", buyData["saldo_bebas"])
	}
}

func TestWishlistValidationAndConflict(t *testing.T) {
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
	itemID := uuid.New().String()
	token, _ := auth.GenerateAccessToken(userID, cfg.JWTSecret, cfg.AccessTTL)

	// Test 1: Buy item yang sudah berstatus 'dibeli' menghasilkan 409
	mock.ExpectQuery("SELECT true FROM users WHERE id = \\$1").
		WithArgs(userID).
		WillReturnRows(sqlmock.NewRows([]string{"true"}).AddRow(true))

	mock.ExpectBegin()
	mock.ExpectQuery("SELECT id FROM users WHERE id = \\$1 FOR UPDATE").
		WithArgs(userID).
		WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow(userID))

	mock.ExpectQuery("SELECT name, price, category, status, saving_pot_id FROM wishlist_items WHERE id = \\$1 AND user_id = \\$2").
		WithArgs(itemID, userID).
		WillReturnRows(sqlmock.NewRows([]string{"name", "price", "category", "status", "saving_pot_id"}).AddRow("Headset", 30000, "Belanja", "dibeli", nil))

	mock.ExpectRollback()

	buyReq := httptest.NewRequest("POST", fmt.Sprintf("/api/wishlist/%s/buy", itemID), bytes.NewReader([]byte(`{"sumber":"bebas"}`)))
	buyReq.Header.Set("Authorization", "Bearer "+token)
	buyReq.Header.Set("Content-Type", "application/json")

	buyResp, _ := app.Test(buyReq)
	if buyResp.StatusCode != http.StatusConflict {
		t.Fatalf("Ekspektasi buy kedua kali 409 Conflict, didapat %d", buyResp.StatusCode)
	}

	// Test 2: Hapus transaksi yang berasal dari wishlist ditolak (409)
	txID := uuid.New().String()
	mock.ExpectQuery("SELECT true FROM users WHERE id = \\$1").
		WithArgs(userID).
		WillReturnRows(sqlmock.NewRows([]string{"true"}).AddRow(true))

	mock.ExpectQuery("SELECT true FROM savings_movements WHERE transaction_id = \\$1 AND user_id = \\$2").
		WithArgs(txID, userID).
		WillReturnRows(sqlmock.NewRows([]string{"true"})) // false

	mock.ExpectQuery("SELECT true FROM wishlist_items WHERE bought_transaction_id = \\$1 AND user_id = \\$2").
		WithArgs(txID, userID).
		WillReturnRows(sqlmock.NewRows([]string{"true"}).AddRow(true))

	delTxReq := httptest.NewRequest("DELETE", fmt.Sprintf("/api/transactions/%s", txID), nil)
	delTxReq.Header.Set("Authorization", "Bearer "+token)

	delTxResp, _ := app.Test(delTxReq)
	if delTxResp.StatusCode != http.StatusConflict {
		t.Fatalf("Ekspektasi hapus transaksi wishlist 409 Conflict, didapat %d", delTxResp.StatusCode)
	}
}

func TestWishlistUndoBuyAndSpendFromPos(t *testing.T) {
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
	itemID := uuid.New().String()
	potID := uuid.New().String()
	txID := uuid.New().String()

	tokenA, _ := auth.GenerateAccessToken(userA, cfg.JWTSecret, cfg.AccessTTL)
	tokenB, _ := auth.GenerateAccessToken(userB, cfg.JWTSecret, cfg.AccessTTL)

	// Test 1: User B mencoba mengakses wishlist item milik User A -> 404
	mock.ExpectQuery("SELECT true FROM users WHERE id = \\$1").
		WithArgs(userB).
		WillReturnRows(sqlmock.NewRows([]string{"true"}).AddRow(true))

	mock.ExpectQuery("SELECT value FROM settings WHERE user_id = \\$1 AND key = 'opening_balance'").
		WithArgs(userB).
		WillReturnRows(sqlmock.NewRows([]string{"value"}).AddRow("0"))

	mock.ExpectQuery("SELECT COALESCE\\(SUM\\(CASE WHEN type = 'masuk'").
		WithArgs(userB).
		WillReturnRows(sqlmock.NewRows([]string{"masuk", "keluar"}).AddRow(0, 0))

	mock.ExpectQuery("SELECT COALESCE\\(SUM\\(CASE WHEN sm.type = 'setor'").
		WithArgs(userB).
		WillReturnRows(sqlmock.NewRows([]string{"setor", "tarik_pakai"}).AddRow(0, 0))

	mock.ExpectQuery("SELECT w.id, w.name, w.price").
		WithArgs(itemID, userB).
		WillReturnRows(sqlmock.NewRows([]string{"id"})) // Not found

	reqB := httptest.NewRequest("GET", fmt.Sprintf("/api/wishlist/%s", itemID), nil)
	reqB.Header.Set("Authorization", "Bearer "+tokenB)
	respB, _ := app.Test(reqB)
	if respB.StatusCode != http.StatusNotFound {
		t.Fatalf("Ekspektasi User B dapat 404 saat akses item User A, didapat %d", respB.StatusCode)
	}

	// Test 2: Undo Buy wishlist item
	mock.ExpectQuery("SELECT true FROM users WHERE id = \\$1").
		WithArgs(userA).
		WillReturnRows(sqlmock.NewRows([]string{"true"}).AddRow(true))

	mock.ExpectBegin()
	mock.ExpectQuery("SELECT id FROM users WHERE id = \\$1 FOR UPDATE").
		WithArgs(userA).
		WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow(userA))

	mock.ExpectQuery("SELECT status, bought_transaction_id FROM wishlist_items WHERE id = \\$1 AND user_id = \\$2").
		WithArgs(itemID, userA).
		WillReturnRows(sqlmock.NewRows([]string{"status", "bought_transaction_id"}).AddRow("dibeli", txID))

	// Delete savings movement jika ada
	mock.ExpectExec("DELETE FROM savings_movements WHERE transaction_id = \\$1 AND user_id = \\$2").
		WithArgs(txID, userA).
		WillReturnResult(sqlmock.NewResult(1, 0))

	// Delete transaction
	mock.ExpectExec("DELETE FROM transactions WHERE id = \\$1 AND user_id = \\$2").
		WithArgs(txID, userA).
		WillReturnResult(sqlmock.NewResult(1, 1))

	// Update wishlist_items status ke 'aktif'
	mock.ExpectExec("UPDATE wishlist_items SET status = 'aktif'").
		WithArgs(itemID, userA).
		WillReturnResult(sqlmock.NewResult(1, 1))

	// Balances query
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

	undoReq := httptest.NewRequest("POST", fmt.Sprintf("/api/wishlist/%s/undo-buy", itemID), nil)
	undoReq.Header.Set("Authorization", "Bearer "+tokenA)

	undoResp, err := app.Test(undoReq)
	if err != nil {
		t.Fatalf("Request undo-buy gagal: %v", err)
	}
	if undoResp.StatusCode != http.StatusOK {
		t.Fatalf("Ekspektasi undo-buy 200 OK, didapat %d", undoResp.StatusCode)
	}

	// Test 3: Buy dari pos tabungan (15.000 dari saldo pos 20.000)
	mock.ExpectQuery("SELECT true FROM users WHERE id = \\$1").
		WithArgs(userA).
		WillReturnRows(sqlmock.NewRows([]string{"true"}).AddRow(true))

	mock.ExpectBegin()
	mock.ExpectQuery("SELECT id FROM users WHERE id = \\$1 FOR UPDATE").
		WithArgs(userA).
		WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow(userA))

	mock.ExpectQuery("SELECT name, price, category, status, saving_pot_id FROM wishlist_items WHERE id = \\$1 AND user_id = \\$2").
		WithArgs(itemID, userA).
		WillReturnRows(sqlmock.NewRows([]string{"name", "price", "category", "status", "saving_pot_id"}).AddRow("Beli Obat", 15000, "Belanja", "aktif", potID))

	// Query saldo pos
	mock.ExpectQuery("SELECT p.archived, COALESCE\\(SUM").
		WithArgs(potID, userA).
		WillReturnRows(sqlmock.NewRows([]string{"archived", "saldo"}).AddRow(false, 20000))

	// Insert transaction
	mock.ExpectExec("INSERT INTO transactions").
		WithArgs(sqlmock.AnyArg(), userA, sqlmock.AnyArg(), "Belanja", "", "Beli Obat", int64(15000)).
		WillReturnResult(sqlmock.NewResult(1, 1))

	// Insert item
	mock.ExpectExec("INSERT INTO transaction_items").
		WithArgs(sqlmock.AnyArg(), sqlmock.AnyArg(), "Beli Obat", int64(15000)).
		WillReturnResult(sqlmock.NewResult(1, 1))

	// Insert movement type 'pakai'
	mock.ExpectExec("INSERT INTO savings_movements").
		WithArgs(sqlmock.AnyArg(), userA, potID, int64(15000), sqlmock.AnyArg(), "Beli Obat", sqlmock.AnyArg()).
		WillReturnResult(sqlmock.NewResult(1, 1))

	// Update wishlist_items
	mock.ExpectExec("UPDATE wishlist_items SET status = 'dibeli'").
		WithArgs(sqlmock.AnyArg(), sqlmock.AnyArg(), itemID, userA).
		WillReturnResult(sqlmock.NewResult(1, 1))

	// Final balances query: saldo total 100000 - 35000 = 65000, total tersimpan 20000 - 15000 = 5000, saldo bebas 60000
	mock.ExpectQuery("SELECT value FROM settings WHERE user_id = \\$1 AND key = 'opening_balance'").
		WithArgs(userA).
		WillReturnRows(sqlmock.NewRows([]string{"value"}).AddRow("0"))

	mock.ExpectQuery("SELECT COALESCE\\(SUM\\(CASE WHEN type = 'masuk'").
		WithArgs(userA).
		WillReturnRows(sqlmock.NewRows([]string{"masuk", "keluar"}).AddRow(100000, 35000))

	mock.ExpectQuery("SELECT COALESCE\\(SUM\\(CASE WHEN sm.type = 'setor'").
		WithArgs(userA).
		WillReturnRows(sqlmock.NewRows([]string{"setor", "tarik_pakai"}).AddRow(20000, 15000))

	mock.ExpectCommit()

	buyPosBody := map[string]interface{}{
		"sumber": "pos",
		"pos_id": potID,
	}
	bpBytes, _ := json.Marshal(buyPosBody)

	buyPosReq := httptest.NewRequest("POST", fmt.Sprintf("/api/wishlist/%s/buy", itemID), bytes.NewReader(bpBytes))
	buyPosReq.Header.Set("Authorization", "Bearer "+tokenA)
	buyPosReq.Header.Set("Content-Type", "application/json")

	buyPosResp, err := app.Test(buyPosReq)
	if err != nil {
		t.Fatalf("Request buy dari pos gagal: %v", err)
	}
	if buyPosResp.StatusCode != http.StatusOK {
		t.Fatalf("Ekspektasi buy dari pos 200 OK, didapat %d", buyPosResp.StatusCode)
	}

	var buyPosData map[string]interface{}
	_ = json.NewDecoder(buyPosResp.Body).Decode(&buyPosData)
	if buyPosData["saldo_total"] != float64(65000) {
		t.Errorf("Ekspektasi saldo total setelah buy pos 65000, didapat %v", buyPosData["saldo_total"])
	}
	if buyPosData["total_tersimpan"] != float64(5000) {
		t.Errorf("Ekspektasi total tersimpan setelah buy pos 5000, didapat %v", buyPosData["total_tersimpan"])
	}
	if buyPosData["saldo_bebas"] != float64(60000) {
		t.Errorf("Ekspektasi saldo bebas setelah buy pos 60000, didapat %v", buyPosData["saldo_bebas"])
	}
}

