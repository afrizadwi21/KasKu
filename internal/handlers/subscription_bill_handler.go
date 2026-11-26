package handlers

import (
	"context"
	"database/sql"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"kasku-backend/internal/calc"
	"kasku-backend/internal/middleware"
)

type SubscriptionInput struct {
	Name     string `json:"name"`
	Amount   int64  `json:"amount"`
	Cycle    string `json:"cycle"`
	FirstDue string `json:"first_due"`
	Active   *bool  `json:"active"`
}

type SubscriptionResponse struct {
	ID              string    `json:"id"`
	Name            string    `json:"name"`
	Amount          int64     `json:"amount"`
	Cycle           string    `json:"cycle"`
	FirstDue        string    `json:"first_due"`
	Active          bool      `json:"active"`
	JatuhTempo      string    `json:"jatuh_tempo"`
	SisaHari        int       `json:"sisa_hari"`
	TelatHari       int       `json:"telat_hari"`
	Status          string    `json:"status"` // Belum Dibayar, Segera Jatuh Tempo, Sudah Dibayar
	TerakhirDibayar string    `json:"terakhir_dibayar,omitempty"`
	TotalDibayar    int64     `json:"total_dibayar"`
	TotalKaliBayar  int       `json:"total_kali_bayar"`
	CreatedAt       time.Time `json:"created_at"`
}

// GetSubscriptions menangani GET /api/subscriptions
func (h *Handler) GetSubscriptions(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	today := time.Now()

	rows, err := h.DB.Query(`
		SELECT id, name, amount, cycle, first_due, active, created_at
		FROM subscriptions
		WHERE user_id = $1
		ORDER BY created_at DESC
	`, userID)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal mengambil daftar langganan")
	}
	defer rows.Close()

	results := make([]SubscriptionResponse, 0)
	for rows.Next() {
		var sub SubscriptionResponse
		var firstDueVal time.Time
		if err := rows.Scan(&sub.ID, &sub.Name, &sub.Amount, &sub.Cycle, &firstDueVal, &sub.Active, &sub.CreatedAt); err != nil {
			continue
		}
		sub.FirstDue = firstDueVal.Format("2006-01-02")

		var count int
		var totalAmount int64
		var lastPaid sql.NullTime
		_ = h.DB.QueryRow(`
			SELECT COUNT(*), COALESCE(SUM(amount), 0), MAX(date)
			FROM transactions
			WHERE user_id = $1 AND type = 'keluar' AND category = 'Langganan' AND LOWER(TRIM(party)) = LOWER(TRIM($2))
		`, userID, sub.Name).Scan(&count, &totalAmount, &lastPaid)

		sub.TotalKaliBayar = count
		sub.TotalDibayar = totalAmount
		if lastPaid.Valid {
			sub.TerakhirDibayar = lastPaid.Time.Format("2006-01-02")
		}

		stat := calc.CalculateSubscriptionStatus(firstDueVal, sub.Cycle, count, today)
		sub.JatuhTempo = stat.JatuhTempo.Format("2006-01-02")
		sub.SisaHari = stat.SisaHari
		sub.TelatHari = stat.TelatHari
		sub.Status = stat.Status

		results = append(results, sub)
	}

	return c.JSON(results)
}

// CreateSubscription menangani POST /api/subscriptions
func (h *Handler) CreateSubscription(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)

	var input SubscriptionInput
	if err := c.BodyParser(&input); err != nil {
		return ErrorResponse(c, fiber.StatusBadRequest, "Format JSON tidak valid")
	}

	name := strings.TrimSpace(input.Name)
	if name == "" {
		return ErrorResponse(c, fiber.StatusUnprocessableEntity, "Nama langganan tidak boleh kosong")
	}
	if input.Amount <= 0 {
		return ErrorResponse(c, fiber.StatusUnprocessableEntity, "Nominal langganan harus lebih besar dari 0")
	}
	cycle := strings.TrimSpace(input.Cycle)
	if cycle != "mingguan" && cycle != "bulanan" && cycle != "3_bulanan" && cycle != "tahunan" {
		return ErrorResponse(c, fiber.StatusUnprocessableEntity, "Siklus harus salah satu dari: 'mingguan', 'bulanan', '3_bulanan', 'tahunan'")
	}
	parsedFirstDue, err := ParseDate(input.FirstDue)
	if err != nil {
		return ErrorResponse(c, fiber.StatusUnprocessableEntity, "Format first_due tidak valid (gunakan YYYY-MM-DD)")
	}
	active := true
	if input.Active != nil {
		active = *input.Active
	}

	newID := uuid.New().String()
	_, err = h.DB.Exec(`
		INSERT INTO subscriptions (id, user_id, name, amount, cycle, first_due, active, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, now())
	`, newID, userID, name, input.Amount, cycle, parsedFirstDue.Format("2006-01-02"), active)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal membuat data langganan: "+err.Error())
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message": "Langganan berhasil ditambahkan",
		"id":      newID,
	})
}

// UpdateSubscription menangani PUT /api/subscriptions/:id
func (h *Handler) UpdateSubscription(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	id := c.Params("id")
	if _, err := uuid.Parse(id); err != nil {
		return ErrorResponse(c, fiber.StatusBadRequest, "Format ID langganan tidak valid")
	}

	var input SubscriptionInput
	if err := c.BodyParser(&input); err != nil {
		return ErrorResponse(c, fiber.StatusBadRequest, "Format JSON tidak valid")
	}

	name := strings.TrimSpace(input.Name)
	if name == "" {
		return ErrorResponse(c, fiber.StatusUnprocessableEntity, "Nama langganan tidak boleh kosong")
	}
	if input.Amount <= 0 {
		return ErrorResponse(c, fiber.StatusUnprocessableEntity, "Nominal langganan harus lebih besar dari 0")
	}
	cycle := strings.TrimSpace(input.Cycle)
	if cycle != "mingguan" && cycle != "bulanan" && cycle != "3_bulanan" && cycle != "tahunan" {
		return ErrorResponse(c, fiber.StatusUnprocessableEntity, "Siklus harus salah satu dari: 'mingguan', 'bulanan', '3_bulanan', 'tahunan'")
	}
	parsedFirstDue, err := ParseDate(input.FirstDue)
	if err != nil {
		return ErrorResponse(c, fiber.StatusUnprocessableEntity, "Format first_due tidak valid (gunakan YYYY-MM-DD)")
	}

	active := true
	if input.Active != nil {
		active = *input.Active
	}

	result, err := h.DB.Exec(`
		UPDATE subscriptions
		SET name = $1, amount = $2, cycle = $3, first_due = $4, active = $5
		WHERE id = $6 AND user_id = $7
	`, name, input.Amount, cycle, parsedFirstDue.Format("2006-01-02"), active, id, userID)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal memperbarui langganan")
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		return ErrorResponse(c, fiber.StatusNotFound, "Data langganan tidak ditemukan")
	}

	return c.JSON(fiber.Map{
		"message": "Langganan berhasil diperbarui",
		"id":      id,
	})
}

// DeleteSubscription menangani DELETE /api/subscriptions/:id (DELETE = nonaktifkan)
func (h *Handler) DeleteSubscription(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	id := c.Params("id")
	if _, err := uuid.Parse(id); err != nil {
		return ErrorResponse(c, fiber.StatusBadRequest, "Format ID langganan tidak valid")
	}

	result, err := h.DB.Exec("UPDATE subscriptions SET active = false WHERE id = $1 AND user_id = $2", id, userID)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal menonaktifkan langganan")
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		return ErrorResponse(c, fiber.StatusNotFound, "Data langganan tidak ditemukan")
	}

	return c.JSON(fiber.Map{
		"message": "Langganan berhasil dinonaktifkan",
	})
}

// PaySubscription menangani POST /api/subscriptions/:id/pay
func (h *Handler) PaySubscription(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	id := c.Params("id")
	if _, err := uuid.Parse(id); err != nil {
		return ErrorResponse(c, fiber.StatusBadRequest, "Format ID langganan tidak valid")
	}

	ctx := context.Background()
	tx, err := h.DB.BeginTx(ctx, nil)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal memulai transaksi database")
	}
	defer tx.Rollback()

	var name string
	var amount int64
	var active bool
	err = tx.QueryRowContext(ctx, "SELECT name, amount, active FROM subscriptions WHERE id = $1 AND user_id = $2", id, userID).Scan(&name, &amount, &active)
	if err != nil {
		if err == sql.ErrNoRows {
			return ErrorResponse(c, fiber.StatusNotFound, "Langganan tidak ditemukan")
		}
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal mengambil data langganan")
	}

	todayStr := time.Now().Format("2006-01-02")
	txID := uuid.New().String()

	_, err = tx.ExecContext(ctx, `
		INSERT INTO transactions (id, user_id, date, type, category, party, source, note, amount, created_at)
		VALUES ($1, $2, $3, 'keluar', 'Langganan', $4, '', $5, $6, now())
	`, txID, userID, todayStr, name, "Pembayaran rutin langganan "+name, amount)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal membuat transaksi pembayaran langganan: "+err.Error())
	}

	if err := tx.Commit(); err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal memproses pembayaran langganan")
	}

	return c.JSON(fiber.Map{
		"message":        "Pembayaran langganan berhasil dicatat",
		"transaction_id": txID,
		"nama":           name,
		"amount":         amount,
	})
}

type BillInput struct {
	Title   string `json:"title"`
	Amount  int64  `json:"amount"`
	DueDate string `json:"due_date"`
	Note    string `json:"note"`
}

type BillResponse struct {
	ID        string     `json:"id"`
	Title     string     `json:"title"`
	Amount    int64      `json:"amount"`
	DueDate   string     `json:"due_date"`
	Paid      bool       `json:"paid"`
	PaidAt    *time.Time `json:"paid_at,omitempty"`
	Note      string     `json:"note"`
	Status    string     `json:"status"` // Sudah Dibayar, Belum Dibayar, Terlambat
	TelatHari int        `json:"telat_hari"`
	CreatedAt time.Time  `json:"created_at"`
}

// GetBills menangani GET /api/bills
func (h *Handler) GetBills(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	today := time.Now()

	rows, err := h.DB.Query(`
		SELECT id, title, amount, due_date, paid, paid_at, note, created_at
		FROM bills
		WHERE user_id = $1
		ORDER BY paid ASC, due_date ASC, created_at DESC
	`, userID)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal mengambil daftar tagihan")
	}
	defer rows.Close()

	results := make([]BillResponse, 0)
	for rows.Next() {
		var b BillResponse
		var dueVal time.Time
		var paidAtVal sql.NullTime
		if err := rows.Scan(&b.ID, &b.Title, &b.Amount, &dueVal, &b.Paid, &paidAtVal, &b.Note, &b.CreatedAt); err != nil {
			continue
		}
		b.DueDate = dueVal.Format("2006-01-02")
		if paidAtVal.Valid {
			b.PaidAt = &paidAtVal.Time
		}

		stat := calc.CalculateBillStatus(b.Paid, dueVal, today)
		b.Status = stat.Status
		b.TelatHari = stat.TelatHari

		results = append(results, b)
	}

	return c.JSON(results)
}

// CreateBill menangani POST /api/bills
func (h *Handler) CreateBill(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)

	var input BillInput
	if err := c.BodyParser(&input); err != nil {
		return ErrorResponse(c, fiber.StatusBadRequest, "Format JSON tidak valid")
	}

	title := strings.TrimSpace(input.Title)
	if title == "" {
		return ErrorResponse(c, fiber.StatusUnprocessableEntity, "Judul tagihan tidak boleh kosong")
	}
	if input.Amount <= 0 {
		return ErrorResponse(c, fiber.StatusUnprocessableEntity, "Nominal tagihan harus lebih besar dari 0")
	}
	dueDate, err := ParseDate(input.DueDate)
	if err != nil {
		return ErrorResponse(c, fiber.StatusUnprocessableEntity, "Format due_date tidak valid (gunakan YYYY-MM-DD)")
	}

	newID := uuid.New().String()
	_, err = h.DB.Exec(`
		INSERT INTO bills (id, user_id, title, amount, due_date, paid, note, created_at)
		VALUES ($1, $2, $3, $4, $5, false, $6, now())
	`, newID, userID, title, input.Amount, dueDate.Format("2006-01-02"), strings.TrimSpace(input.Note))
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal membuat tagihan: "+err.Error())
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message": "Tagihan berhasil ditambahkan",
		"id":      newID,
	})
}

// UpdateBill menangani PUT /api/bills/:id
func (h *Handler) UpdateBill(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	id := c.Params("id")
	if _, err := uuid.Parse(id); err != nil {
		return ErrorResponse(c, fiber.StatusBadRequest, "Format ID tagihan tidak valid")
	}

	var input BillInput
	if err := c.BodyParser(&input); err != nil {
		return ErrorResponse(c, fiber.StatusBadRequest, "Format JSON tidak valid")
	}

	title := strings.TrimSpace(input.Title)
	if title == "" {
		return ErrorResponse(c, fiber.StatusUnprocessableEntity, "Judul tagihan tidak boleh kosong")
	}
	if input.Amount <= 0 {
		return ErrorResponse(c, fiber.StatusUnprocessableEntity, "Nominal tagihan harus lebih besar dari 0")
	}
	dueDate, err := ParseDate(input.DueDate)
	if err != nil {
		return ErrorResponse(c, fiber.StatusUnprocessableEntity, "Format due_date tidak valid (gunakan YYYY-MM-DD)")
	}

	result, err := h.DB.Exec(`
		UPDATE bills
		SET title = $1, amount = $2, due_date = $3, note = $4
		WHERE id = $5 AND user_id = $6
	`, title, input.Amount, dueDate.Format("2006-01-02"), strings.TrimSpace(input.Note), id, userID)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal memperbarui tagihan")
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		return ErrorResponse(c, fiber.StatusNotFound, "Tagihan tidak ditemukan")
	}

	return c.JSON(fiber.Map{
		"message": "Tagihan berhasil diperbarui",
		"id":      id,
	})
}

// DeleteBill menangani DELETE /api/bills/:id
func (h *Handler) DeleteBill(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	id := c.Params("id")
	if _, err := uuid.Parse(id); err != nil {
		return ErrorResponse(c, fiber.StatusBadRequest, "Format ID tagihan tidak valid")
	}

	result, err := h.DB.Exec("DELETE FROM bills WHERE id = $1 AND user_id = $2", id, userID)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal menghapus tagihan")
	}

	rows, _ := result.RowsAffected()
	if rows == 0 {
		return ErrorResponse(c, fiber.StatusNotFound, "Tagihan tidak ditemukan")
	}

	return c.JSON(fiber.Map{
		"message": "Tagihan berhasil dihapus",
	})
}

// PayBill menangani POST /api/bills/:id/pay
func (h *Handler) PayBill(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	id := c.Params("id")
	if _, err := uuid.Parse(id); err != nil {
		return ErrorResponse(c, fiber.StatusBadRequest, "Format ID tagihan tidak valid")
	}

	ctx := context.Background()
	tx, err := h.DB.BeginTx(ctx, nil)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal memulai transaksi database")
	}
	defer tx.Rollback()

	var title, note string
	var amount int64
	var paid bool
	err = tx.QueryRowContext(ctx, "SELECT title, amount, paid, note FROM bills WHERE id = $1 AND user_id = $2", id, userID).Scan(&title, &amount, &paid, &note)
	if err != nil {
		if err == sql.ErrNoRows {
			return ErrorResponse(c, fiber.StatusNotFound, "Tagihan tidak ditemukan")
		}
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal mengambil data tagihan")
	}

	if paid {
		return ErrorResponse(c, fiber.StatusConflict, "Tagihan ini sudah pernah dibayar")
	}

	now := time.Now()
	todayStr := now.Format("2006-01-02")
	txID := uuid.New().String()

	_, err = tx.ExecContext(ctx, "UPDATE bills SET paid = true, paid_at = $1 WHERE id = $2 AND user_id = $3", now, id, userID)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal memperbarui status tagihan")
	}

	_, err = tx.ExecContext(ctx, `
		INSERT INTO transactions (id, user_id, date, type, category, party, source, note, amount, created_at)
		VALUES ($1, $2, $3, 'keluar', 'Tagihan', $4, '', $5, $6, $7)
	`, txID, userID, todayStr, title, note, amount, now)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal mencatat transaksi pembayaran tagihan: "+err.Error())
	}

	if err := tx.Commit(); err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal memproses pembayaran tagihan")
	}

	return c.JSON(fiber.Map{
		"message":        "Tagihan berhasil dibayar dan dicatat ke transaksi",
		"bill_id":        id,
		"transaction_id": txID,
	})
}
