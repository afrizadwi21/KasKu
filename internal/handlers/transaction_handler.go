package handlers

import (
	"context"
	"database/sql"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"kasku-backend/internal/calc"
)

type ItemInput struct {
	Name      string  `json:"name"`
	Qty       float64 `json:"qty"`
	UnitPrice int64   `json:"unit_price"`
}

type TransactionInput struct {
	Date     string      `json:"date"`
	Type     string      `json:"type"`
	Category string      `json:"category"`
	Party    string      `json:"party"`
	Source   string      `json:"source"`
	Note     string      `json:"note"`
	Amount   int64       `json:"amount"`
	Items    []ItemInput `json:"items"`
}

type ItemResponse struct {
	ID        string  `json:"id"`
	Name      string  `json:"name"`
	Qty       float64 `json:"qty"`
	UnitPrice int64   `json:"unit_price"`
	Subtotal  int64   `json:"subtotal"`
}

type TransactionResponse struct {
	ID           string         `json:"id"`
	Date         string         `json:"date"`
	Type         string         `json:"type"`
	Category     string         `json:"category"`
	Party        string         `json:"party"`
	Source       string         `json:"source"`
	Note         string         `json:"note"`
	Amount       int64          `json:"amount"`
	SaldoSetelah int64          `json:"saldo_setelah"`
	JumlahItem   int            `json:"jumlah_item"`
	CreatedAt    time.Time      `json:"created_at"`
	Items        []ItemResponse `json:"items,omitempty"`
}

// GetTransactions menangani GET /api/transactions
func (h *Handler) GetTransactions(c *fiber.Ctx) error {
	from := c.Query("from")
	to := c.Query("to")
	txType := c.Query("type")
	category := c.Query("category")
	party := c.Query("party")
	source := c.Query("source")
	q := c.Query("q")
	limitStr := c.Query("limit")
	offsetStr := c.Query("offset")

	openingBalance, err := h.GetOpeningBalance()
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal mengambil saldo awal")
	}

	// Hitung saldo berjalan secara kronologis (date ASC, created_at ASC, id ASC)
	// Kemudian baris diurutkan secara tanggal desc untuk hasil client
	baseQuery := fmt.Sprintf(`
		WITH calculated AS (
			SELECT 
				t.id,
				t.date,
				t.type,
				t.category,
				t.party,
				t.source,
				t.note,
				t.amount,
				t.created_at,
				(
					%d + SUM(CASE WHEN t.type = 'masuk' THEN t.amount ELSE -t.amount END) 
					OVER (ORDER BY t.date ASC, t.created_at ASC, t.id ASC)
				) AS saldo_setelah,
				COALESCE((SELECT COUNT(*) FROM transaction_items ti WHERE ti.transaction_id = t.id), 0) AS jumlah_item
			FROM transactions t
		)
		SELECT id, date, type, category, party, source, note, amount, created_at, saldo_setelah, jumlah_item
		FROM calculated
		WHERE 1=1
	`, openingBalance)

	var conditions []string
	var args []any
	argIndex := 1

	if from != "" {
		if _, err := ParseDate(from); err != nil {
			return ErrorResponse(c, fiber.StatusUnprocessableEntity, "Format parameter 'from' tidak valid (gunakan YYYY-MM-DD)")
		}
		conditions = append(conditions, fmt.Sprintf("date >= $%d", argIndex))
		args = append(args, from)
		argIndex++
	}

	if to != "" {
		if _, err := ParseDate(to); err != nil {
			return ErrorResponse(c, fiber.StatusUnprocessableEntity, "Format parameter 'to' tidak valid (gunakan YYYY-MM-DD)")
		}
		conditions = append(conditions, fmt.Sprintf("date <= $%d", argIndex))
		args = append(args, to)
		argIndex++
	}

	if txType != "" {
		if txType != "masuk" && txType != "keluar" {
			return ErrorResponse(c, fiber.StatusUnprocessableEntity, "Parameter 'type' harus 'masuk' atau 'keluar'")
		}
		conditions = append(conditions, fmt.Sprintf("type = $%d", argIndex))
		args = append(args, txType)
		argIndex++
	}

	if category != "" {
		conditions = append(conditions, fmt.Sprintf("category = $%d", argIndex))
		args = append(args, category)
		argIndex++
	}

	if party != "" {
		conditions = append(conditions, fmt.Sprintf("LOWER(TRIM(party)) = LOWER(TRIM($%d))", argIndex))
		args = append(args, party)
		argIndex++
	}

	if source != "" {
		conditions = append(conditions, fmt.Sprintf("LOWER(TRIM(source)) = LOWER(TRIM($%d))", argIndex))
		args = append(args, source)
		argIndex++
	}

	if q != "" {
		likePattern := "%" + strings.ToLower(q) + "%"
		conditions = append(conditions, fmt.Sprintf("(LOWER(party) LIKE $%d OR LOWER(source) LIKE $%d OR LOWER(note) LIKE $%d OR LOWER(category) LIKE $%d)", argIndex, argIndex, argIndex, argIndex))
		args = append(args, likePattern)
		argIndex++
	}

	for _, cond := range conditions {
		baseQuery += " AND " + cond
	}

	baseQuery += " ORDER BY date DESC, created_at DESC, id DESC"

	if limitStr != "" {
		limit, err := strconv.Atoi(limitStr)
		if err == nil && limit > 0 {
			baseQuery += fmt.Sprintf(" LIMIT $%d", argIndex)
			args = append(args, limit)
			argIndex++
		}
	}

	if offsetStr != "" {
		offset, err := strconv.Atoi(offsetStr)
		if err == nil && offset >= 0 {
			baseQuery += fmt.Sprintf(" OFFSET $%d", argIndex)
			args = append(args, offset)
			argIndex++
		}
	}

	rows, err := h.DB.Query(baseQuery, args...)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal mengambil daftar transaksi: "+err.Error())
	}
	defer rows.Close()

	results := make([]TransactionResponse, 0)
	for rows.Next() {
		var item TransactionResponse
		var dateVal time.Time
		err := rows.Scan(
			&item.ID,
			&dateVal,
			&item.Type,
			&item.Category,
			&item.Party,
			&item.Source,
			&item.Note,
			&item.Amount,
			&item.CreatedAt,
			&item.SaldoSetelah,
			&item.JumlahItem,
		)
		if err != nil {
			return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal memproses data transaksi")
		}
		item.Date = dateVal.Format("2006-01-02")
		results = append(results, item)
	}

	return c.JSON(results)
}

// GetTransactionByID menangani GET /api/transactions/:id
func (h *Handler) GetTransactionByID(c *fiber.Ctx) error {
	id := c.Params("id")
	if _, err := uuid.Parse(id); err != nil {
		return ErrorResponse(c, fiber.StatusBadRequest, "Format ID transaksi tidak valid")
	}

	openingBalance, err := h.GetOpeningBalance()
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal mengambil saldo awal")
	}

	query := fmt.Sprintf(`
		WITH calculated AS (
			SELECT 
				t.id,
				t.date,
				t.type,
				t.category,
				t.party,
				t.source,
				t.note,
				t.amount,
				t.created_at,
				(
					%d + SUM(CASE WHEN t.type = 'masuk' THEN t.amount ELSE -t.amount END) 
					OVER (ORDER BY t.date ASC, t.created_at ASC, t.id ASC)
				) AS saldo_setelah,
				COALESCE((SELECT COUNT(*) FROM transaction_items ti WHERE ti.transaction_id = t.id), 0) AS jumlah_item
			FROM transactions t
		)
		SELECT id, date, type, category, party, source, note, amount, created_at, saldo_setelah, jumlah_item
		FROM calculated
		WHERE id = $1
	`, openingBalance)

	var txResp TransactionResponse
	var dateVal time.Time
	err = h.DB.QueryRow(query, id).Scan(
		&txResp.ID,
		&dateVal,
		&txResp.Type,
		&txResp.Category,
		&txResp.Party,
		&txResp.Source,
		&txResp.Note,
		&txResp.Amount,
		&txResp.CreatedAt,
		&txResp.SaldoSetelah,
		&txResp.JumlahItem,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return ErrorResponse(c, fiber.StatusNotFound, "Transaksi tidak ditemukan")
		}
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal mengambil data transaksi")
	}
	txResp.Date = dateVal.Format("2006-01-02")

	// Ambil rincian items
	itemRows, err := h.DB.Query("SELECT id, name, qty, unit_price, subtotal FROM transaction_items WHERE transaction_id = $1 ORDER BY id ASC", id)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal mengambil rincian item")
	}
	defer itemRows.Close()

	items := make([]ItemResponse, 0)
	for itemRows.Next() {
		var it ItemResponse
		if err := itemRows.Scan(&it.ID, &it.Name, &it.Qty, &it.UnitPrice, &it.Subtotal); err != nil {
			return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal memproses item transaksi")
		}
		items = append(items, it)
	}
	txResp.Items = items

	return c.JSON(txResp)
}

// validateAndPrepareTx validasi dan persiapan data transaksi
func validateAndPrepareTx(input *TransactionInput) (*time.Time, int64, []ItemResponse, error) {
	// Validasi tanggal
	parsedDate, err := ParseDate(input.Date)
	if err != nil {
		return nil, 0, nil, fmt.Errorf("Format tanggal tidak valid (gunakan YYYY-MM-DD)")
	}

	// Validasi type
	input.Type = strings.TrimSpace(input.Type)
	if input.Type != "masuk" && input.Type != "keluar" {
		return nil, 0, nil, fmt.Errorf("Jenis transaksi harus 'masuk' atau 'keluar'")
	}

	// Validasi kategori
	input.Category = strings.TrimSpace(input.Category)
	if !calc.IsValidCategory(input.Type, input.Category) {
		return nil, 0, nil, fmt.Errorf("Kategori tidak valid untuk jenis transaksi '%s'", input.Type)
	}

	input.Party = strings.TrimSpace(input.Party)
	input.Source = strings.TrimSpace(input.Source)
	input.Note = strings.TrimSpace(input.Note)

	// Aturan source:
	if input.Type == "masuk" {
		// Jika kategori "Terima Bayar Hutang" atau "Pinjam dari Orang" dan source kosong, isi otomatis dengan party
		if (input.Category == "Terima Bayar Hutang" || input.Category == "Pinjam dari Orang") && input.Source == "" {
			input.Source = input.Party
		}
		if input.Source == "" {
			return nil, 0, nil, fmt.Errorf("Sumber dana (source) wajib diisi untuk uang masuk")
		}
	} else {
		// Untuk type 'keluar', source dikosongkan
		input.Source = ""
	}

	// Hitung items dan amount
	var finalAmount int64
	var preparedItems []ItemResponse

	if len(input.Items) > 0 {
		var sumSubtotal int64
		for _, item := range input.Items {
			name := strings.TrimSpace(item.Name)
			if name == "" {
				return nil, 0, nil, fmt.Errorf("Nama item tidak boleh kosong")
			}
			if item.Qty <= 0 {
				return nil, 0, nil, fmt.Errorf("Jumlah (qty) item '%s' harus lebih dari 0", name)
			}
			if item.UnitPrice < 0 {
				return nil, 0, nil, fmt.Errorf("Harga satuan item '%s' tidak boleh negatif", name)
			}
			subtotal := calc.CalculateItemSubtotal(item.Qty, item.UnitPrice)
			sumSubtotal += subtotal
			preparedItems = append(preparedItems, ItemResponse{
				Name:      name,
				Qty:       item.Qty,
				UnitPrice: item.UnitPrice,
				Subtotal:  subtotal,
			})
		}
		if sumSubtotal <= 0 {
			return nil, 0, nil, fmt.Errorf("Total nilai transaksi dari rincian item harus lebih dari 0")
		}
		finalAmount = sumSubtotal
	} else {
		if input.Amount <= 0 {
			return nil, 0, nil, fmt.Errorf("Nominal transaksi (amount) harus lebih besar dari 0")
		}
		finalAmount = input.Amount
	}

	return &parsedDate, finalAmount, preparedItems, nil
}

// CreateTransaction menangani POST /api/transactions
func (h *Handler) CreateTransaction(c *fiber.Ctx) error {
	var input TransactionInput
	if err := c.BodyParser(&input); err != nil {
		return ErrorResponse(c, fiber.StatusBadRequest, "Format JSON tidak valid")
	}

	parsedDate, finalAmount, preparedItems, err := validateAndPrepareTx(&input)
	if err != nil {
		return ErrorResponse(c, fiber.StatusUnprocessableEntity, err.Error())
	}

	ctx := context.Background()
	tx, err := h.DB.BeginTx(ctx, nil)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal memulai transaksi database")
	}
	defer tx.Rollback()

	newID := uuid.New().String()
	now := time.Now()

	_, err = tx.ExecContext(ctx, `
		INSERT INTO transactions (id, date, type, category, party, source, note, amount, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`, newID, parsedDate.Format("2006-01-02"), input.Type, input.Category, input.Party, input.Source, input.Note, finalAmount, now)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal menyimpan transaksi: "+err.Error())
	}

	for i := range preparedItems {
		itemID := uuid.New().String()
		preparedItems[i].ID = itemID
		_, err = tx.ExecContext(ctx, `
			INSERT INTO transaction_items (id, transaction_id, name, qty, unit_price, subtotal)
			VALUES ($1, $2, $3, $4, $5, $6)
		`, itemID, newID, preparedItems[i].Name, preparedItems[i].Qty, preparedItems[i].UnitPrice, preparedItems[i].Subtotal)
		if err != nil {
			return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal menyimpan rincian item")
		}
	}

	if err := tx.Commit(); err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal melakukan commit database")
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message": "Transaksi berhasil dicatat",
		"id":      newID,
	})
}

// UpdateTransaction menangani PUT /api/transactions/:id
func (h *Handler) UpdateTransaction(c *fiber.Ctx) error {
	id := c.Params("id")
	if _, err := uuid.Parse(id); err != nil {
		return ErrorResponse(c, fiber.StatusBadRequest, "Format ID transaksi tidak valid")
	}

	var input TransactionInput
	if err := c.BodyParser(&input); err != nil {
		return ErrorResponse(c, fiber.StatusBadRequest, "Format JSON tidak valid")
	}

	parsedDate, finalAmount, preparedItems, err := validateAndPrepareTx(&input)
	if err != nil {
		return ErrorResponse(c, fiber.StatusUnprocessableEntity, err.Error())
	}

	ctx := context.Background()
	tx, err := h.DB.BeginTx(ctx, nil)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal memulai transaksi database")
	}
	defer tx.Rollback()

	// Pastikan transaksi ada
	var exists bool
	err = tx.QueryRowContext(ctx, "SELECT true FROM transactions WHERE id = $1", id).Scan(&exists)
	if err != nil || !exists {
		return ErrorResponse(c, fiber.StatusNotFound, "Transaksi tidak ditemukan")
	}

	_, err = tx.ExecContext(ctx, `
		UPDATE transactions
		SET date = $1, type = $2, category = $3, party = $4, source = $5, note = $6, amount = $7
		WHERE id = $8
	`, parsedDate.Format("2006-01-02"), input.Type, input.Category, input.Party, input.Source, input.Note, finalAmount, id)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal memperbarui transaksi: "+err.Error())
	}

	// Ganti semua item transaksi (PUT mengganti seluruh item)
	_, err = tx.ExecContext(ctx, "DELETE FROM transaction_items WHERE transaction_id = $1", id)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal memperbarui rincian item")
	}

	for i := range preparedItems {
		itemID := uuid.New().String()
		preparedItems[i].ID = itemID
		_, err = tx.ExecContext(ctx, `
			INSERT INTO transaction_items (id, transaction_id, name, qty, unit_price, subtotal)
			VALUES ($1, $2, $3, $4, $5, $6)
		`, itemID, id, preparedItems[i].Name, preparedItems[i].Qty, preparedItems[i].UnitPrice, preparedItems[i].Subtotal)
		if err != nil {
			return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal menyimpan rincian item baru")
		}
	}

	if err := tx.Commit(); err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal melakukan commit database")
	}

	return c.JSON(fiber.Map{
		"message": "Transaksi berhasil diperbarui",
		"id":      id,
	})
}

// DeleteTransaction menangani DELETE /api/transactions/:id
func (h *Handler) DeleteTransaction(c *fiber.Ctx) error {
	id := c.Params("id")
	if _, err := uuid.Parse(id); err != nil {
		return ErrorResponse(c, fiber.StatusBadRequest, "Format ID transaksi tidak valid")
	}

	result, err := h.DB.Exec("DELETE FROM transactions WHERE id = $1", id)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal menghapus transaksi")
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return ErrorResponse(c, fiber.StatusNotFound, "Transaksi tidak ditemukan")
	}

	return c.JSON(fiber.Map{
		"message": "Transaksi berhasil dihapus",
	})
}
