package handlers

import (
	"bytes"
	"encoding/csv"
	"strconv"

	"github.com/gofiber/fiber/v2"

	"kasku-backend/internal/calc"
	"kasku-backend/internal/middleware"
)

// GetOpeningBalanceSetting menangani GET /api/settings/opening-balance
func (h *Handler) GetOpeningBalanceSetting(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	balance, err := h.GetOpeningBalance(userID)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal membaca saldo awal")
	}
	return c.JSON(fiber.Map{
		"opening_balance": balance,
	})
}

// UpdateOpeningBalanceSetting menangani PUT /api/settings/opening-balance
func (h *Handler) UpdateOpeningBalanceSetting(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	type inputBody struct {
		OpeningBalance *int64 `json:"opening_balance"`
	}
	var body inputBody
	if err := c.BodyParser(&body); err != nil || body.OpeningBalance == nil {
		return ErrorResponse(c, fiber.StatusBadRequest, "Format JSON tidak valid atau 'opening_balance' tidak disediakan")
	}

	valStr := strconv.FormatInt(*body.OpeningBalance, 10)
	_, err := h.DB.Exec(`
		INSERT INTO settings (user_id, key, value)
		VALUES ($1, 'opening_balance', $2)
		ON CONFLICT (user_id, key) DO UPDATE SET value = EXCLUDED.value
	`, userID, valStr)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal menyimpan saldo awal")
	}

	return c.JSON(fiber.Map{
		"message":         "Saldo awal berhasil diperbarui",
		"opening_balance": *body.OpeningBalance,
	})
}

// ExportCSV menangani GET /api/export.csv
func (h *Handler) ExportCSV(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	rows, err := h.DB.Query(`
		SELECT t.id, t.date, t.type, t.category, t.party, t.source, t.note, t.amount,
		       COALESCE(
		           (SELECT string_agg(ti.name || ' (' || ti.qty || 'x' || ti.unit_price || '=' || ti.subtotal || ')', '; ')
		            FROM transaction_items ti WHERE ti.transaction_id = t.id), ''
		       ) AS rincian_item
		FROM transactions t
		WHERE t.user_id = $1
		ORDER BY t.date ASC, t.created_at ASC, t.id ASC
	`, userID)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal menyiapkan data ekspor CSV")
	}
	defer rows.Close()

	var buf bytes.Buffer
	writer := csv.NewWriter(&buf)

	header := []string{"ID", "Tanggal", "Jenis", "Kategori", "Pihak (Party)", "Sumber (Source)", "Keterangan (Note)", "Nominal (Amount)", "Rincian Item"}
	if err := writer.Write(header); err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal menulis header CSV")
	}

	for rows.Next() {
		var id, txType, category, party, source, note, rincianItem string
		var dateVal string
		var amount int64
		if err := rows.Scan(&id, &dateVal, &txType, &category, &party, &source, &note, &amount, &rincianItem); err != nil {
			continue
		}
		record := []string{
			id,
			dateVal[:10],
			txType,
			category,
			party,
			source,
			note,
			strconv.FormatInt(amount, 10),
			rincianItem,
		}
		_ = writer.Write(record)
	}

	writer.Flush()
	if err := writer.Error(); err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal menghasilkan konten CSV")
	}

	c.Set("Content-Type", "text/csv; charset=utf-8")
	c.Set("Content-Disposition", "attachment; filename=kasku_transaksi.csv")
	return c.Send(buf.Bytes())
}

// GetMeta menangani GET /api/meta
func (h *Handler) GetMeta(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)

	partyRows, err := h.DB.Query("SELECT DISTINCT TRIM(party) FROM transactions WHERE user_id = $1 AND TRIM(party) <> '' ORDER BY TRIM(party) ASC", userID)
	parties := make([]string, 0)
	if err == nil {
		defer partyRows.Close()
		for partyRows.Next() {
			var p string
			if err := partyRows.Scan(&p); err == nil && p != "" {
				parties = append(parties, p)
			}
		}
	}

	sourceRows, err := h.DB.Query("SELECT DISTINCT TRIM(source) FROM transactions WHERE user_id = $1 AND TRIM(source) <> '' ORDER BY TRIM(source) ASC", userID)
	sources := make([]string, 0)
	if err == nil {
		defer sourceRows.Close()
		for sourceRows.Next() {
			var s string
			if err := sourceRows.Scan(&s); err == nil && s != "" {
				sources = append(sources, s)
			}
		}
	}

	// Pos tabungan
	potRows, err := h.DB.Query("SELECT DISTINCT TRIM(name) FROM savings_pots WHERE user_id = $1 AND archived = false ORDER BY TRIM(name) ASC", userID)
	posTabungan := make([]string, 0)
	if err == nil {
		defer potRows.Close()
		for potRows.Next() {
			var p string
			if err := potRows.Scan(&p); err == nil && p != "" {
				posTabungan = append(posTabungan, p)
			}
		}
	}

	return c.JSON(fiber.Map{
		"kategori": fiber.Map{
			"masuk":  calc.ValidMasukCategories,
			"keluar": calc.ValidKeluarCategories,
		},
		"party":        parties,
		"source":       sources,
		"pos_tabungan": posTabungan,
	})
}

// ExportSavingsCSV menangani GET /api/export-savings.csv
func (h *Handler) ExportSavingsCSV(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	rows, err := h.DB.Query(`
		SELECT sm.id, sm.date, sp.name, sm.type, sm.amount, sm.note, COALESCE(sm.transaction_id::text, '')
		FROM savings_movements sm
		JOIN savings_pots sp ON sm.pot_id = sp.id
		WHERE sm.user_id = $1
		ORDER BY sm.date ASC, sm.created_at ASC, sm.id ASC
	`, userID)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal menyiapkan data ekspor CSV tabungan")
	}
	defer rows.Close()

	var buf bytes.Buffer
	writer := csv.NewWriter(&buf)

	header := []string{"ID Mutasi", "Tanggal", "Pos Tabungan", "Jenis Mutasi", "Nominal", "Keterangan", "ID Transaksi Belanja"}
	if err := writer.Write(header); err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal menulis header CSV")
	}

	for rows.Next() {
		var id, dateVal, potName, movType, note, txID string
		var amount int64
		if err := rows.Scan(&id, &dateVal, &potName, &movType, &amount, &note, &txID); err != nil {
			continue
		}
		record := []string{
			id,
			dateVal[:10],
			potName,
			movType,
			strconv.FormatInt(amount, 10),
			note,
			txID,
		}
		_ = writer.Write(record)
	}

	writer.Flush()
	if err := writer.Error(); err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal menghasilkan konten CSV")
	}

	c.Set("Content-Type", "text/csv; charset=utf-8")
	c.Set("Content-Disposition", "attachment; filename=kasku_tabungan.csv")
	return c.Send(buf.Bytes())
}

// Healthz menangani GET /healthz
func (h *Handler) Healthz(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{
		"status": "ok",
	})
}
