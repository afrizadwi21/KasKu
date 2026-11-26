package handlers

import (
	"context"
	"database/sql"
	"fmt"
	"math"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"kasku-backend/internal/calc"
	"kasku-backend/internal/middleware"
)

// SavingsPotResponse model respons data pos tabungan
type SavingsPotResponse struct {
	ID                 string  `json:"id"`
	Name               string  `json:"name"`
	Saldo              int64   `json:"saldo"`
	Target             *int64  `json:"target"`
	PersenTarget       float64 `json:"persen_target"`
	SisaTarget         int64   `json:"sisa_target"`
	Deadline           *string `json:"deadline"`
	SisaHari           *int    `json:"sisa_hari"`
	PerluSetorPerBulan *int64  `json:"perlu_setor_per_bulan"`
	Note               string  `json:"note"`
	Archived           bool    `json:"archived"`
	CreatedAt          string  `json:"created_at"`
}

// SavingsMovementResponse model respons mutasi tabungan
type SavingsMovementResponse struct {
	ID            string    `json:"id"`
	PotID         string    `json:"pot_id"`
	PotName       string    `json:"pot_name,omitempty"`
	Type          string    `json:"type"`
	Amount        int64     `json:"amount"`
	Date          string    `json:"date"`
	Note          string    `json:"note"`
	TransactionID *string   `json:"transaction_id"`
	CreatedAt     time.Time `json:"created_at"`
}

// Helper untuk menghitung saldo_total dan total_tersimpan seorang user
// Jika tx != nil, eksekusi dalam transaksi DB tersebut
func (h *Handler) GetBalances(ctx context.Context, tx *sql.Tx, userID string) (saldoTotal int64, totalTersimpan int64, saldoBebas int64, err error) {
	openingBalance, err := h.GetOpeningBalance(userID)
	if err != nil {
		return 0, 0, 0, err
	}

	var sumMasuk, sumKeluar int64
	var sumSetor, sumTarikPakai int64

	if tx != nil {
		err = tx.QueryRowContext(ctx, `
			SELECT 
				COALESCE(SUM(CASE WHEN type = 'masuk' THEN amount ELSE 0 END), 0),
				COALESCE(SUM(CASE WHEN type = 'keluar' THEN amount ELSE 0 END), 0)
			FROM transactions
			WHERE user_id = $1
		`, userID).Scan(&sumMasuk, &sumKeluar)
		if err != nil {
			return 0, 0, 0, err
		}

		// Hitung total_tersimpan hanya dari pos yang aktif (archived = false) atau seluruh saldo pos?
		// Sesuai prinsip: total_tersimpan = jumlah saldo semua pos tabungan aktif.
		err = tx.QueryRowContext(ctx, `
			SELECT 
				COALESCE(SUM(CASE WHEN sm.type = 'setor' THEN sm.amount ELSE 0 END), 0),
				COALESCE(SUM(CASE WHEN sm.type IN ('tarik', 'pakai') THEN sm.amount ELSE 0 END), 0)
			FROM savings_movements sm
			JOIN savings_pots sp ON sm.pot_id = sp.id
			WHERE sm.user_id = $1 AND sp.archived = false
		`, userID).Scan(&sumSetor, &sumTarikPakai)
		if err != nil {
			return 0, 0, 0, err
		}
	} else {
		err = h.DB.QueryRowContext(ctx, `
			SELECT 
				COALESCE(SUM(CASE WHEN type = 'masuk' THEN amount ELSE 0 END), 0),
				COALESCE(SUM(CASE WHEN type = 'keluar' THEN amount ELSE 0 END), 0)
			FROM transactions
			WHERE user_id = $1
		`, userID).Scan(&sumMasuk, &sumKeluar)
		if err != nil {
			return 0, 0, 0, err
		}

		err = h.DB.QueryRowContext(ctx, `
			SELECT 
				COALESCE(SUM(CASE WHEN sm.type = 'setor' THEN sm.amount ELSE 0 END), 0),
				COALESCE(SUM(CASE WHEN sm.type IN ('tarik', 'pakai') THEN sm.amount ELSE 0 END), 0)
			FROM savings_movements sm
			JOIN savings_pots sp ON sm.pot_id = sp.id
			WHERE sm.user_id = $1 AND sp.archived = false
		`, userID).Scan(&sumSetor, &sumTarikPakai)
		if err != nil {
			return 0, 0, 0, err
		}
	}

	saldoTotal = openingBalance + sumMasuk - sumKeluar
	totalTersimpan = sumSetor - sumTarikPakai
	saldoBebas = calc.CalculateSaldoBebas(saldoTotal, totalTersimpan)
	return saldoTotal, totalTersimpan, saldoBebas, nil
}

// GET /api/savings
func (h *Handler) GetSavings(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	ctx := context.Background()

	saldoTotal, totalTersimpan, saldoBebas, err := h.GetBalances(ctx, nil, userID)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal menghitung saldo: "+err.Error())
	}

	rows, err := h.DB.QueryContext(ctx, `
		SELECT 
			p.id, p.name, p.target_amount, p.deadline, p.note, p.archived, p.created_at,
			COALESCE(SUM(CASE WHEN m.type = 'setor' THEN m.amount ELSE 0 END), 0) -
			COALESCE(SUM(CASE WHEN m.type IN ('tarik', 'pakai') THEN m.amount ELSE 0 END), 0) AS saldo
		FROM savings_pots p
		LEFT JOIN savings_movements m ON p.id = m.pot_id
		WHERE p.user_id = $1
		GROUP BY p.id, p.name, p.target_amount, p.deadline, p.note, p.archived, p.created_at
		ORDER BY p.archived ASC, p.created_at DESC
	`, userID)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal mengambil data tabungan")
	}
	defer rows.Close()

	now := time.Now()
	pots := make([]SavingsPotResponse, 0)
	for rows.Next() {
		var p SavingsPotResponse
		var target sql.NullInt64
		var deadline sql.NullTime
		var createdAt time.Time
		if err := rows.Scan(&p.ID, &p.Name, &target, &deadline, &p.Note, &p.Archived, &createdAt, &p.Saldo); err != nil {
			continue
		}
		p.CreatedAt = createdAt.Format(time.RFC3339)
		if target.Valid {
			tVal := target.Int64
			p.Target = &tVal
			if tVal > 0 {
				p.PersenTarget = math.Round((float64(p.Saldo)/float64(tVal))*10000) / 100.0
				if p.Saldo < tVal {
					p.SisaTarget = tVal - p.Saldo
				} else {
					p.SisaTarget = 0
				}
			}
		}

		if deadline.Valid {
			dStr := deadline.Time.Format("2006-01-02")
			p.Deadline = &dStr
			sisaHari := calc.CalculateSisaHariDeadline(&deadline.Time, now)
			p.SisaHari = sisaHari

			if p.Target != nil && *p.Target > 0 {
				perlu := calc.CalculatePerluSetorPerBulan(*p.Target, p.Saldo, &deadline.Time, now)
				p.PerluSetorPerBulan = &perlu
			}
		}

		pots = append(pots, p)
	}

	return c.JSON(fiber.Map{
		"saldo_total":     saldoTotal,
		"total_tersimpan": totalTersimpan,
		"saldo_bebas":     saldoBebas,
		"pos":             pots,
	})
}

// POST /api/savings
func (h *Handler) CreateSavingsPot(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)

	type CreatePotInput struct {
		Name         string  `json:"name"`
		TargetAmount *int64  `json:"target_amount"`
		Deadline     *string `json:"deadline"`
		Note         *string `json:"note"`
	}

	var input CreatePotInput
	if err := c.BodyParser(&input); err != nil {
		return ErrorResponse(c, fiber.StatusBadRequest, "Format JSON tidak valid")
	}

	name := strings.TrimSpace(input.Name)
	if name == "" {
		return ErrorResponse(c, fiber.StatusUnprocessableEntity, "Nama pos tabungan tidak boleh kosong")
	}

	if input.TargetAmount != nil && *input.TargetAmount <= 0 {
		return ErrorResponse(c, fiber.StatusUnprocessableEntity, "Target nominal harus lebih besar dari 0")
	}

	var deadlineVal *time.Time
	if input.Deadline != nil && strings.TrimSpace(*input.Deadline) != "" {
		d, err := ParseDate(*input.Deadline)
		if err != nil {
			return ErrorResponse(c, fiber.StatusUnprocessableEntity, "Format deadline tidak valid (gunakan YYYY-MM-DD)")
		}
		deadlineVal = &d
	}

	noteVal := ""
	if input.Note != nil {
		noteVal = strings.TrimSpace(*input.Note)
	}

	// Cek apakah pos aktif dengan nama serupa sudah ada
	var exists bool
	err := h.DB.QueryRow(`
		SELECT true FROM savings_pots 
		WHERE user_id = $1 AND LOWER(TRIM(name)) = LOWER(TRIM($2)) AND archived = false
	`, userID, name).Scan(&exists)
	if err == nil && exists {
		return ErrorResponse(c, fiber.StatusConflict, "Pos tabungan dengan nama tersebut sudah ada")
	}

	newID := uuid.New().String()
	_, err = h.DB.Exec(`
		INSERT INTO savings_pots (id, user_id, name, target_amount, deadline, note, archived, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, false, now())
	`, newID, userID, name, input.TargetAmount, deadlineVal, noteVal)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal membuat pos tabungan: "+err.Error())
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message": "Pos tabungan berhasil dibuat",
		"id":      newID,
	})
}

// GET /api/savings/:id
func (h *Handler) GetSavingsPotByID(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	potID := c.Params("id")
	if _, err := uuid.Parse(potID); err != nil {
		return ErrorResponse(c, fiber.StatusBadRequest, "Format ID pos tidak valid")
	}

	ctx := context.Background()
	var p SavingsPotResponse
	var target sql.NullInt64
	var deadline sql.NullTime
	var createdAt time.Time

	err := h.DB.QueryRowContext(ctx, `
		SELECT 
			p.id, p.name, p.target_amount, p.deadline, p.note, p.archived, p.created_at,
			COALESCE(SUM(CASE WHEN m.type = 'setor' THEN m.amount ELSE 0 END), 0) -
			COALESCE(SUM(CASE WHEN m.type IN ('tarik', 'pakai') THEN m.amount ELSE 0 END), 0) AS saldo
		FROM savings_pots p
		LEFT JOIN savings_movements m ON p.id = m.pot_id
		WHERE p.id = $1 AND p.user_id = $2
		GROUP BY p.id, p.name, p.target_amount, p.deadline, p.note, p.archived, p.created_at
	`, potID, userID).Scan(&p.ID, &p.Name, &target, &deadline, &p.Note, &p.Archived, &createdAt, &p.Saldo)
	if err != nil {
		if err == sql.ErrNoRows {
			return ErrorResponse(c, fiber.StatusNotFound, "Pos tabungan tidak ditemukan")
		}
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal membaca pos tabungan: "+err.Error())
	}

	now := time.Now()
	p.CreatedAt = createdAt.Format(time.RFC3339)
	if target.Valid {
		tVal := target.Int64
		p.Target = &tVal
		if tVal > 0 {
			p.PersenTarget = math.Round((float64(p.Saldo)/float64(tVal))*10000) / 100.0
			if p.Saldo < tVal {
				p.SisaTarget = tVal - p.Saldo
			} else {
				p.SisaTarget = 0
			}
		}
	}
	if deadline.Valid {
		dStr := deadline.Time.Format("2006-01-02")
		p.Deadline = &dStr
		p.SisaHari = calc.CalculateSisaHariDeadline(&deadline.Time, now)
		if p.Target != nil && *p.Target > 0 {
			perlu := calc.CalculatePerluSetorPerBulan(*p.Target, p.Saldo, &deadline.Time, now)
			p.PerluSetorPerBulan = &perlu
		}
	}

	// Riwayat movements
	rows, err := h.DB.QueryContext(ctx, `
		SELECT id, pot_id, type, amount, date, note, transaction_id, created_at
		FROM savings_movements
		WHERE pot_id = $1 AND user_id = $2
		ORDER BY date DESC, created_at DESC, id DESC
	`, potID, userID)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal membaca riwayat perpindahan tabungan")
	}
	defer rows.Close()

	movements := make([]SavingsMovementResponse, 0)
	for rows.Next() {
		var m SavingsMovementResponse
		var dVal time.Time
		var txID sql.NullString
		if err := rows.Scan(&m.ID, &m.PotID, &m.Type, &m.Amount, &dVal, &m.Note, &txID, &m.CreatedAt); err == nil {
			m.Date = dVal.Format("2006-01-02")
			if txID.Valid {
				m.TransactionID = &txID.String
			}
			movements = append(movements, m)
		}
	}

	return c.JSON(fiber.Map{
		"pos":       p,
		"movements": movements,
	})
}

// PUT /api/savings/:id
func (h *Handler) UpdateSavingsPot(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	potID := c.Params("id")
	if _, err := uuid.Parse(potID); err != nil {
		return ErrorResponse(c, fiber.StatusBadRequest, "Format ID pos tidak valid")
	}

	type UpdatePotInput struct {
		Name         string  `json:"name"`
		TargetAmount *int64  `json:"target_amount"`
		Deadline     *string `json:"deadline"`
		Note         *string `json:"note"`
	}

	var input UpdatePotInput
	if err := c.BodyParser(&input); err != nil {
		return ErrorResponse(c, fiber.StatusBadRequest, "Format JSON tidak valid")
	}

	name := strings.TrimSpace(input.Name)
	if name == "" {
		return ErrorResponse(c, fiber.StatusUnprocessableEntity, "Nama pos tabungan tidak boleh kosong")
	}

	if input.TargetAmount != nil && *input.TargetAmount <= 0 {
		return ErrorResponse(c, fiber.StatusUnprocessableEntity, "Target nominal harus lebih besar dari 0")
	}

	var deadlineVal *time.Time
	if input.Deadline != nil && strings.TrimSpace(*input.Deadline) != "" {
		d, err := ParseDate(*input.Deadline)
		if err != nil {
			return ErrorResponse(c, fiber.StatusUnprocessableEntity, "Format deadline tidak valid (gunakan YYYY-MM-DD)")
		}
		deadlineVal = &d
	}

	noteVal := ""
	if input.Note != nil {
		noteVal = strings.TrimSpace(*input.Note)
	}

	// Cek apakah pos ada dan milik user
	var archived bool
	err := h.DB.QueryRow("SELECT archived FROM savings_pots WHERE id = $1 AND user_id = $2", potID, userID).Scan(&archived)
	if err != nil {
		if err == sql.ErrNoRows {
			return ErrorResponse(c, fiber.StatusNotFound, "Pos tabungan tidak ditemukan")
		}
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal memeriksa pos tabungan")
	}

	// Cek duplikasi nama jika nama berubah
	var duplicate bool
	err = h.DB.QueryRow(`
		SELECT true FROM savings_pots 
		WHERE user_id = $1 AND id <> $2 AND LOWER(TRIM(name)) = LOWER(TRIM($3)) AND archived = false
	`, userID, potID, name).Scan(&duplicate)
	if err == nil && duplicate {
		return ErrorResponse(c, fiber.StatusConflict, "Pos tabungan lain dengan nama tersebut sudah ada")
	}

	_, err = h.DB.Exec(`
		UPDATE savings_pots 
		SET name = $1, target_amount = $2, deadline = $3, note = $4
		WHERE id = $5 AND user_id = $6
	`, name, input.TargetAmount, deadlineVal, noteVal, potID, userID)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal memperbarui pos tabungan")
	}

	return c.JSON(fiber.Map{
		"message": "Pos tabungan berhasil diperbarui",
		"id":      potID,
	})
}

// POST /api/savings/:id/deposit
func (h *Handler) DepositSavings(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	potID := c.Params("id")
	if _, err := uuid.Parse(potID); err != nil {
		return ErrorResponse(c, fiber.StatusBadRequest, "Format ID pos tidak valid")
	}

	type DepositInput struct {
		Amount int64   `json:"amount"`
		Date   *string `json:"date"`
		Note   *string `json:"note"`
	}

	var input DepositInput
	if err := c.BodyParser(&input); err != nil {
		return ErrorResponse(c, fiber.StatusBadRequest, "Format JSON tidak valid")
	}

	if input.Amount <= 0 {
		return ErrorResponse(c, fiber.StatusUnprocessableEntity, "Nominal setor harus lebih besar dari 0")
	}

	txDate := time.Now().Format("2006-01-02")
	if input.Date != nil && strings.TrimSpace(*input.Date) != "" {
		d, err := ParseDate(*input.Date)
		if err != nil {
			return ErrorResponse(c, fiber.StatusUnprocessableEntity, "Format tanggal tidak valid (gunakan YYYY-MM-DD)")
		}
		txDate = d.Format("2006-01-02")
	}

	note := ""
	if input.Note != nil {
		note = strings.TrimSpace(*input.Note)
	}

	ctx := context.Background()
	tx, err := h.DB.BeginTx(ctx, nil)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal memulai transaksi database")
	}
	defer tx.Rollback()

	// Kunci row user untuk serialisasi race condition saldo bebas
	var lockedUserID string
	err = tx.QueryRowContext(ctx, "SELECT id FROM users WHERE id = $1 FOR UPDATE", userID).Scan(&lockedUserID)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal mengunci sesi pengguna")
	}

	// Periksa pos tabungan
	var archived bool
	var potName string
	err = tx.QueryRowContext(ctx, "SELECT name, archived FROM savings_pots WHERE id = $1 AND user_id = $2", potID, userID).Scan(&potName, &archived)
	if err != nil {
		if err == sql.ErrNoRows {
			return ErrorResponse(c, fiber.StatusNotFound, "Pos tabungan tidak ditemukan")
		}
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal memeriksa pos tabungan")
	}
	if archived {
		return ErrorResponse(c, fiber.StatusUnprocessableEntity, "Tidak dapat menyetor ke pos tabungan yang sudah diarsipkan")
	}

	// Hitung saldo bebas saat ini
	_, _, saldoBebas, err := h.GetBalances(ctx, tx, userID)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal menghitung saldo: "+err.Error())
	}

	if input.Amount > saldoBebas {
		return ErrorResponse(c, fiber.StatusUnprocessableEntity, "Saldo bebas tidak cukup")
	}

	// Simpan movement 'setor'
	movID := uuid.New().String()
	_, err = tx.ExecContext(ctx, `
		INSERT INTO savings_movements (id, user_id, pot_id, type, amount, date, note, created_at)
		VALUES ($1, $2, $3, 'setor', $4, $5, $6, now())
	`, movID, userID, potID, input.Amount, txDate, note)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal menyimpan setoran tabungan: "+err.Error())
	}

	// Ambil saldo pos yang baru
	var saldoPosBaru int64
	err = tx.QueryRowContext(ctx, `
		SELECT 
			COALESCE(SUM(CASE WHEN type = 'setor' THEN amount ELSE 0 END), 0) -
			COALESCE(SUM(CASE WHEN type IN ('tarik', 'pakai') THEN amount ELSE 0 END), 0)
		FROM savings_movements
		WHERE pot_id = $1 AND user_id = $2
	`, potID, userID).Scan(&saldoPosBaru)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal menghitung saldo pos baru")
	}

	saldoBebasBaru := saldoBebas - input.Amount

	if err := tx.Commit(); err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal menyelesaikan transaksi database")
	}

	return c.JSON(fiber.Map{
		"message":     "Setoran tabungan berhasil",
		"id":          movID,
		"pot_id":      potID,
		"pot_name":    potName,
		"saldo_pos":   saldoPosBaru,
		"saldo_bebas": saldoBebasBaru,
	})
}

// POST /api/savings/:id/withdraw
func (h *Handler) WithdrawSavings(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	potID := c.Params("id")
	if _, err := uuid.Parse(potID); err != nil {
		return ErrorResponse(c, fiber.StatusBadRequest, "Format ID pos tidak valid")
	}

	type WithdrawInput struct {
		Amount int64   `json:"amount"`
		Date   *string `json:"date"`
		Note   *string `json:"note"`
	}

	var input WithdrawInput
	if err := c.BodyParser(&input); err != nil {
		return ErrorResponse(c, fiber.StatusBadRequest, "Format JSON tidak valid")
	}

	if input.Amount <= 0 {
		return ErrorResponse(c, fiber.StatusUnprocessableEntity, "Nominal tarik harus lebih besar dari 0")
	}

	txDate := time.Now().Format("2006-01-02")
	if input.Date != nil && strings.TrimSpace(*input.Date) != "" {
		d, err := ParseDate(*input.Date)
		if err != nil {
			return ErrorResponse(c, fiber.StatusUnprocessableEntity, "Format tanggal tidak valid (gunakan YYYY-MM-DD)")
		}
		txDate = d.Format("2006-01-02")
	}

	note := ""
	if input.Note != nil {
		note = strings.TrimSpace(*input.Note)
	}

	ctx := context.Background()
	tx, err := h.DB.BeginTx(ctx, nil)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal memulai transaksi database")
	}
	defer tx.Rollback()

	// Kunci row user
	var lockedUserID string
	err = tx.QueryRowContext(ctx, "SELECT id FROM users WHERE id = $1 FOR UPDATE", userID).Scan(&lockedUserID)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal mengunci sesi pengguna")
	}

	// Periksa pos tabungan dan saldo pos saat ini
	var potName string
	var saldoPos int64
	err = tx.QueryRowContext(ctx, `
		SELECT 
			p.name,
			COALESCE(SUM(CASE WHEN m.type = 'setor' THEN m.amount ELSE 0 END), 0) -
			COALESCE(SUM(CASE WHEN m.type IN ('tarik', 'pakai') THEN m.amount ELSE 0 END), 0) AS saldo
		FROM savings_pots p
		LEFT JOIN savings_movements m ON p.id = m.pot_id
		WHERE p.id = $1 AND p.user_id = $2
		GROUP BY p.id, p.name
	`, potID, userID).Scan(&potName, &saldoPos)
	if err != nil {
		if err == sql.ErrNoRows {
			return ErrorResponse(c, fiber.StatusNotFound, "Pos tabungan tidak ditemukan")
		}
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal memeriksa pos tabungan")
	}

	if input.Amount > saldoPos {
		return ErrorResponse(c, fiber.StatusUnprocessableEntity, "Nominal penarikan melebihi saldo tabungan")
	}

	// Simpan movement 'tarik'
	movID := uuid.New().String()
	_, err = tx.ExecContext(ctx, `
		INSERT INTO savings_movements (id, user_id, pot_id, type, amount, date, note, created_at)
		VALUES ($1, $2, $3, 'tarik', $4, $5, $6, now())
	`, movID, userID, potID, input.Amount, txDate, note)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal menyimpan penarikan tabungan: "+err.Error())
	}

	// Hitung saldo bebas baru
	_, _, saldoBebasBaru, err := h.GetBalances(ctx, tx, userID)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal menghitung saldo bebas: "+err.Error())
	}

	saldoPosBaru := saldoPos - input.Amount

	if err := tx.Commit(); err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal menyelesaikan transaksi database")
	}

	return c.JSON(fiber.Map{
		"message":     "Penarikan tabungan berhasil",
		"id":          movID,
		"pot_id":      potID,
		"pot_name":    potName,
		"saldo_pos":   saldoPosBaru,
		"saldo_bebas": saldoBebasBaru,
	})
}

// POST /api/savings/:id/spend
func (h *Handler) SpendSavings(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	potID := c.Params("id")
	if _, err := uuid.Parse(potID); err != nil {
		return ErrorResponse(c, fiber.StatusBadRequest, "Format ID pos tidak valid")
	}

	type SpendInput struct {
		Amount   int64       `json:"amount"`
		Date     *string     `json:"date"`
		Category string      `json:"category"`
		Party    *string     `json:"party"`
		Note     *string     `json:"note"`
		Items    []ItemInput `json:"items"`
	}

	var input SpendInput
	if err := c.BodyParser(&input); err != nil {
		return ErrorResponse(c, fiber.StatusBadRequest, "Format JSON tidak valid")
	}

	category := strings.TrimSpace(input.Category)
	if !calc.IsValidCategory("keluar", category) {
		return ErrorResponse(c, fiber.StatusUnprocessableEntity, "Kategori pengeluaran tidak valid")
	}

	txDate := time.Now().Format("2006-01-02")
	if input.Date != nil && strings.TrimSpace(*input.Date) != "" {
		d, err := ParseDate(*input.Date)
		if err != nil {
			return ErrorResponse(c, fiber.StatusUnprocessableEntity, "Format tanggal tidak valid (gunakan YYYY-MM-DD)")
		}
		txDate = d.Format("2006-01-02")
	}

	party := ""
	if input.Party != nil {
		party = strings.TrimSpace(*input.Party)
	}

	note := ""
	if input.Note != nil {
		note = strings.TrimSpace(*input.Note)
	}

	// Persiapkan item jika ada
	var finalAmount int64
	var preparedItems []ItemResponse

	if len(input.Items) > 0 {
		var sumSubtotal int64
		for _, item := range input.Items {
			name := strings.TrimSpace(item.Name)
			if name == "" {
				return ErrorResponse(c, fiber.StatusUnprocessableEntity, "Nama item tidak boleh kosong")
			}
			if item.Qty <= 0 {
				return ErrorResponse(c, fiber.StatusUnprocessableEntity, "Qty item harus lebih besar dari 0")
			}
			if item.UnitPrice < 0 {
				return ErrorResponse(c, fiber.StatusUnprocessableEntity, "Harga satuan item tidak boleh negatif")
			}
			sub := calc.CalculateItemSubtotal(item.Qty, item.UnitPrice)
			sumSubtotal += sub
			preparedItems = append(preparedItems, ItemResponse{
				Name:      name,
				Qty:       item.Qty,
				UnitPrice: item.UnitPrice,
				Subtotal:  sub,
			})
		}
		finalAmount = sumSubtotal
	} else {
		finalAmount = input.Amount
	}

	if finalAmount <= 0 {
		return ErrorResponse(c, fiber.StatusUnprocessableEntity, "Nominal belanja harus lebih besar dari 0")
	}

	ctx := context.Background()
	tx, err := h.DB.BeginTx(ctx, nil)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal memulai transaksi database")
	}
	defer tx.Rollback()

	// Kunci row user
	var lockedUserID string
	err = tx.QueryRowContext(ctx, "SELECT id FROM users WHERE id = $1 FOR UPDATE", userID).Scan(&lockedUserID)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal mengunci sesi pengguna")
	}

	// Periksa pos tabungan dan saldo pos saat ini
	var archived bool
	var potName string
	var saldoPos int64
	err = tx.QueryRowContext(ctx, `
		SELECT 
			p.name, p.archived,
			COALESCE(SUM(CASE WHEN m.type = 'setor' THEN m.amount ELSE 0 END), 0) -
			COALESCE(SUM(CASE WHEN m.type IN ('tarik', 'pakai') THEN m.amount ELSE 0 END), 0) AS saldo
		FROM savings_pots p
		LEFT JOIN savings_movements m ON p.id = m.pot_id
		WHERE p.id = $1 AND p.user_id = $2
		GROUP BY p.id, p.name, p.archived
	`, potID, userID).Scan(&potName, &archived, &saldoPos)
	if err != nil {
		if err == sql.ErrNoRows {
			return ErrorResponse(c, fiber.StatusNotFound, "Pos tabungan tidak ditemukan")
		}
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal memeriksa pos tabungan")
	}

	if archived {
		return ErrorResponse(c, fiber.StatusUnprocessableEntity, "Tidak dapat menggunakan uang dari pos tabungan yang sudah diarsipkan")
	}

	if finalAmount > saldoPos {
		return ErrorResponse(c, fiber.StatusUnprocessableEntity, "Nominal belanja melebihi saldo tabungan")
	}

	// 1. Buat transaksi keluar di tabel transactions
	txID := uuid.New().String()
	txNote := note
	if txNote == "" {
		txNote = fmt.Sprintf("Belanja dari tabungan %s", potName)
	}

	_, err = tx.ExecContext(ctx, `
		INSERT INTO transactions (id, user_id, date, type, category, party, source, note, amount, created_at)
		VALUES ($1, $2, $3, 'keluar', $4, $5, '', $6, $7, now())
	`, txID, userID, txDate, category, party, txNote, finalAmount)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal membuat transaksi: "+err.Error())
	}

	// Simpan items jika ada
	for _, it := range preparedItems {
		itID := uuid.New().String()
		_, err = tx.ExecContext(ctx, `
			INSERT INTO transaction_items (id, transaction_id, name, qty, unit_price, subtotal)
			VALUES ($1, $2, $3, $4, $5, $6)
		`, itID, txID, it.Name, it.Qty, it.UnitPrice, it.Subtotal)
		if err != nil {
			return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal menyimpan rincian item belanja")
		}
	}

	// 2. Buat movement type 'pakai' terhubung lewat transaction_id
	movID := uuid.New().String()
	_, err = tx.ExecContext(ctx, `
		INSERT INTO savings_movements (id, user_id, pot_id, type, amount, date, note, transaction_id, created_at)
		VALUES ($1, $2, $3, 'pakai', $4, $5, $6, $7, now())
	`, movID, userID, potID, finalAmount, txDate, note, txID)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal mencatat mutasi tabungan: "+err.Error())
	}

	// Ambil saldo total dan saldo bebas baru
	saldoTotalBaru, _, saldoBebasBaru, err := h.GetBalances(ctx, tx, userID)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal menghitung saldo: "+err.Error())
	}

	saldoPosBaru := saldoPos - finalAmount

	if err := tx.Commit(); err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal menyelesaikan transaksi database")
	}

	return c.JSON(fiber.Map{
		"message":        "Belanja menggunakan uang tabungan berhasil",
		"movement_id":    movID,
		"transaction_id": txID,
		"pot_id":         potID,
		"pot_name":       potName,
		"saldo_pos":      saldoPosBaru,
		"saldo_total":    saldoTotalBaru,
		"saldo_bebas":    saldoBebasBaru,
	})
}

// POST /api/savings/:id/close
func (h *Handler) CloseSavingsPot(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	potID := c.Params("id")
	if _, err := uuid.Parse(potID); err != nil {
		return ErrorResponse(c, fiber.StatusBadRequest, "Format ID pos tidak valid")
	}

	ctx := context.Background()
	tx, err := h.DB.BeginTx(ctx, nil)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal memulai transaksi database")
	}
	defer tx.Rollback()

	// Kunci row user
	var lockedUserID string
	err = tx.QueryRowContext(ctx, "SELECT id FROM users WHERE id = $1 FOR UPDATE", userID).Scan(&lockedUserID)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal mengunci sesi pengguna")
	}

	var potName string
	var archived bool
	var saldoPos int64
	err = tx.QueryRowContext(ctx, `
		SELECT 
			p.name, p.archived,
			COALESCE(SUM(CASE WHEN m.type = 'setor' THEN m.amount ELSE 0 END), 0) -
			COALESCE(SUM(CASE WHEN m.type IN ('tarik', 'pakai') THEN m.amount ELSE 0 END), 0) AS saldo
		FROM savings_pots p
		LEFT JOIN savings_movements m ON p.id = m.pot_id
		WHERE p.id = $1 AND p.user_id = $2
		GROUP BY p.id, p.name, p.archived
	`, potID, userID).Scan(&potName, &archived, &saldoPos)
	if err != nil {
		if err == sql.ErrNoRows {
			return ErrorResponse(c, fiber.StatusNotFound, "Pos tabungan tidak ditemukan")
		}
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal memeriksa pos tabungan")
	}

	if archived {
		return ErrorResponse(c, fiber.StatusBadRequest, "Pos tabungan sudah diarsipkan sebelumnya")
	}

	todayStr := time.Now().Format("2006-01-02")

	// Jika ada sisa saldo, kembalikan otomatis dengan movement 'tarik'
	if saldoPos > 0 {
		movID := uuid.New().String()
		_, err = tx.ExecContext(ctx, `
			INSERT INTO savings_movements (id, user_id, pot_id, type, amount, date, note, created_at)
			VALUES ($1, $2, $3, 'tarik', $4, $5, 'Penutupan pos tabungan', now())
		`, movID, userID, potID, saldoPos, todayStr)
		if err != nil {
			return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal mengembalikan sisa saldo tabungan: "+err.Error())
		}
	}

	// Set archived = true
	_, err = tx.ExecContext(ctx, "UPDATE savings_pots SET archived = true WHERE id = $1 AND user_id = $2", potID, userID)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal mengarsipkan pos tabungan: "+err.Error())
	}

	_, _, saldoBebasBaru, err := h.GetBalances(ctx, tx, userID)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal menghitung saldo: "+err.Error())
	}

	if err := tx.Commit(); err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal menyelesaikan transaksi database")
	}

	return c.JSON(fiber.Map{
		"message":               "Pos tabungan berhasil ditutup dan diarsipkan",
		"id":                    potID,
		"pot_name":              potName,
		"saldo_dikembalikan":    saldoPos,
		"saldo_bebas_sekarang":  saldoBebasBaru,
	})
}

// DELETE /api/savings/:id
func (h *Handler) DeleteSavingsPot(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	potID := c.Params("id")
	if _, err := uuid.Parse(potID); err != nil {
		return ErrorResponse(c, fiber.StatusBadRequest, "Format ID pos tidak valid")
	}

	ctx := context.Background()
	var saldoPos int64
	var countMovements int

	err := h.DB.QueryRowContext(ctx, `
		SELECT 
			COALESCE(SUM(CASE WHEN m.type = 'setor' THEN m.amount ELSE 0 END), 0) -
			COALESCE(SUM(CASE WHEN m.type IN ('tarik', 'pakai') THEN m.amount ELSE 0 END), 0) AS saldo,
			COUNT(m.id) AS count_movements
		FROM savings_pots p
		LEFT JOIN savings_movements m ON p.id = m.pot_id
		WHERE p.id = $1 AND p.user_id = $2
		GROUP BY p.id
	`, potID, userID).Scan(&saldoPos, &countMovements)
	if err != nil {
		if err == sql.ErrNoRows {
			return ErrorResponse(c, fiber.StatusNotFound, "Pos tabungan tidak ditemukan")
		}
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal memeriksa pos tabungan")
	}

	// Aturan: hanya boleh jika saldo pos 0 dan belum pernah dipakai; selain itu 409 dengan saran memakai /close
	if saldoPos != 0 || countMovements > 0 {
		return ErrorResponse(c, fiber.StatusConflict, "Pos tabungan yang memiliki saldo atau riwayat mutasi tidak dapat dihapus permanen. Gunakan POST /api/savings/"+potID+"/close untuk menutup/mengarsipkan pos ini.")
	}

	res, err := h.DB.ExecContext(ctx, "DELETE FROM savings_pots WHERE id = $1 AND user_id = $2", potID, userID)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal menghapus pos tabungan")
	}
	rowsAffected, _ := res.RowsAffected()
	if rowsAffected == 0 {
		return ErrorResponse(c, fiber.StatusNotFound, "Pos tabungan tidak ditemukan")
	}

	return c.JSON(fiber.Map{
		"message": "Pos tabungan berhasil dihapus",
	})
}

// DELETE /api/savings/movements/:id
func (h *Handler) CancelSavingsMovement(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	movID := c.Params("id")
	if _, err := uuid.Parse(movID); err != nil {
		return ErrorResponse(c, fiber.StatusBadRequest, "Format ID mutasi tidak valid")
	}

	ctx := context.Background()
	tx, err := h.DB.BeginTx(ctx, nil)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal memulai transaksi database")
	}
	defer tx.Rollback()

	// Kunci row user
	var lockedUserID string
	err = tx.QueryRowContext(ctx, "SELECT id FROM users WHERE id = $1 FOR UPDATE", userID).Scan(&lockedUserID)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal mengunci sesi pengguna")
	}

	var potID, movType string
	var amount int64
	var txID sql.NullString
	err = tx.QueryRowContext(ctx, `
		SELECT pot_id, type, amount, transaction_id
		FROM savings_movements
		WHERE id = $1 AND user_id = $2
	`, movID, userID).Scan(&potID, &movType, &amount, &txID)
	if err != nil {
		if err == sql.ErrNoRows {
			return ErrorResponse(c, fiber.StatusNotFound, "Riwayat mutasi tabungan tidak ditemukan")
		}
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal memeriksa mutasi tabungan")
	}

	// Jika type == 'pakai', hapus juga transaksi keluar terkait
	if movType == "pakai" && txID.Valid && txID.String != "" {
		_, err = tx.ExecContext(ctx, "DELETE FROM transactions WHERE id = $1 AND user_id = $2", txID.String, userID)
		if err != nil {
			return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal membatalkan transaksi belanja terkait")
		}
	}

	// Hapus movement
	_, err = tx.ExecContext(ctx, "DELETE FROM savings_movements WHERE id = $1 AND user_id = $2", movID, userID)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal menghapus mutasi tabungan")
	}

	// Validasi pasca pembatalan:
	// Saldo pos tidak boleh negatif
	var saldoPosBaru int64
	err = tx.QueryRowContext(ctx, `
		SELECT 
			COALESCE(SUM(CASE WHEN type = 'setor' THEN amount ELSE 0 END), 0) -
			COALESCE(SUM(CASE WHEN type IN ('tarik', 'pakai') THEN amount ELSE 0 END), 0)
		FROM savings_movements
		WHERE pot_id = $1 AND user_id = $2
	`, potID, userID).Scan(&saldoPosBaru)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal memvalidasi saldo pos")
	}
	if saldoPosBaru < 0 {
		return ErrorResponse(c, fiber.StatusUnprocessableEntity, "Pembatalan ditolak karena menyebabkan saldo pos menjadi negatif")
	}

	// Saldo bebas tidak boleh negatif
	_, _, saldoBebasBaru, err := h.GetBalances(ctx, tx, userID)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal menghitung saldo bebas")
	}
	if saldoBebasBaru < 0 {
		return ErrorResponse(c, fiber.StatusUnprocessableEntity, "Pembatalan ditolak karena menyebabkan saldo bebas menjadi negatif")
	}

	if err := tx.Commit(); err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal menyelesaikan transaksi database")
	}

	return c.JSON(fiber.Map{
		"message":     "Mutasi tabungan berhasil dibatalkan",
		"id":          movID,
		"pot_id":      potID,
		"saldo_pos":   saldoPosBaru,
		"saldo_bebas": saldoBebasBaru,
	})
}

// GET /api/savings/movements?pot_id=&from=&to=
func (h *Handler) GetSavingsMovements(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	potID := c.Query("pot_id")
	from := c.Query("from")
	to := c.Query("to")

	var conditions []string
	args := []any{userID}
	argIdx := 2

	if potID != "" {
		if _, err := uuid.Parse(potID); err != nil {
			return ErrorResponse(c, fiber.StatusBadRequest, "Format pot_id tidak valid")
		}
		conditions = append(conditions, fmt.Sprintf("sm.pot_id = $%d", argIdx))
		args = append(args, potID)
		argIdx++
	}

	if from != "" {
		if _, err := ParseDate(from); err != nil {
			return ErrorResponse(c, fiber.StatusUnprocessableEntity, "Format parameter 'from' tidak valid")
		}
		conditions = append(conditions, fmt.Sprintf("sm.date >= $%d", argIdx))
		args = append(args, from)
		argIdx++
	}

	if to != "" {
		if _, err := ParseDate(to); err != nil {
			return ErrorResponse(c, fiber.StatusUnprocessableEntity, "Format parameter 'to' tidak valid")
		}
		conditions = append(conditions, fmt.Sprintf("sm.date <= $%d", argIdx))
		args = append(args, to)
		argIdx++
	}

	whereClause := ""
	if len(conditions) > 0 {
		whereClause = "AND " + strings.Join(conditions, " AND ")
	}

	query := fmt.Sprintf(`
		SELECT sm.id, sm.pot_id, sp.name, sm.type, sm.amount, sm.date, sm.note, sm.transaction_id, sm.created_at
		FROM savings_movements sm
		JOIN savings_pots sp ON sm.pot_id = sp.id
		WHERE sm.user_id = $1 %s
		ORDER BY sm.date DESC, sm.created_at DESC, sm.id DESC
	`, whereClause)

	rows, err := h.DB.Query(query, args...)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal mengambil riwayat mutasi tabungan: "+err.Error())
	}
	defer rows.Close()

	movements := make([]SavingsMovementResponse, 0)
	for rows.Next() {
		var m SavingsMovementResponse
		var dVal time.Time
		var txID sql.NullString
		if err := rows.Scan(&m.ID, &m.PotID, &m.PotName, &m.Type, &m.Amount, &dVal, &m.Note, &txID, &m.CreatedAt); err == nil {
			m.Date = dVal.Format("2006-01-02")
			if txID.Valid {
				m.TransactionID = &txID.String
			}
			movements = append(movements, m)
		}
	}

	return c.JSON(movements)
}
