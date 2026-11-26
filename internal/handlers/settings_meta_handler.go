package handlers

import (
	"bytes"
	"encoding/csv"
	"strconv"

	"github.com/gofiber/fiber/v2"

	"kasku-backend/internal/calc"
)

// GetOpeningBalanceSetting menangani GET /api/settings/opening-balance
func (h *Handler) GetOpeningBalanceSetting(c *fiber.Ctx) error {
	balance, err := h.GetOpeningBalance()
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal membaca saldo awal")
	}
	return c.JSON(fiber.Map{
		"opening_balance": balance,
	})
}

// UpdateOpeningBalanceSetting menangani PUT /api/settings/opening-balance
func (h *Handler) UpdateOpeningBalanceSetting(c *fiber.Ctx) error {
	type inputBody struct {
		OpeningBalance *int64 `json:"opening_balance"`
	}
	var body inputBody
	if err := c.BodyParser(&body); err != nil || body.OpeningBalance == nil {
		return ErrorResponse(c, fiber.StatusBadRequest, "Format JSON tidak valid atau 'opening_balance' tidak disediakan")
	}

	valStr := strconv.FormatInt(*body.OpeningBalance, 10)
	_, err := h.DB.Exec(`
		INSERT INTO settings (key, value)
		VALUES ('opening_balance', $1)
		ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
	`, valStr)
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
	rows, err := h.DB.Query(`
		SELECT t.id, t.date, t.type, t.category, t.party, t.source, t.note, t.amount,
		       COALESCE(
		           (SELECT string_agg(ti.name || ' (' || ti.qty || 'x' || ti.unit_price || '=' || ti.subtotal || ')', '; ')
		            FROM transaction_items ti WHERE ti.transaction_id = t.id), ''
		       ) AS rincian_item
		FROM transactions t
		ORDER BY t.date ASC, t.created_at ASC, t.id ASC
	`)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal menyiapkan data ekspor CSV")
	}
	defer rows.Close()

	var buf bytes.Buffer
	writer := csv.NewWriter(&buf)

	// Header CSV
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
	// Ambil daftar party unik
	partyRows, err := h.DB.Query("SELECT DISTINCT TRIM(party) FROM transactions WHERE TRIM(party) <> '' ORDER BY TRIM(party) ASC")
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

	// Ambil daftar source unik
	sourceRows, err := h.DB.Query("SELECT DISTINCT TRIM(source) FROM transactions WHERE TRIM(source) <> '' ORDER BY TRIM(source) ASC")
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

	return c.JSON(fiber.Map{
		"kategori": fiber.Map{
			"masuk":  calc.ValidMasukCategories,
			"keluar": calc.ValidKeluarCategories,
		},
		"party":  parties,
		"source": sources,
	})
}

// Healthz menangani GET /healthz
func (h *Handler) Healthz(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{
		"status": "ok",
	})
}
