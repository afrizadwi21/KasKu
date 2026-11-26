package handlers

import (
	"fmt"
	"math"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
)

// GetIncomeSources menangani GET /api/income-sources?from=&to=
func (h *Handler) GetIncomeSources(c *fiber.Ctx) error {
	from := c.Query("from")
	to := c.Query("to")

	var conditions []string
	var args []any
	argIndex := 1

	conditions = append(conditions, "type = 'masuk'")

	if from != "" {
		if _, err := ParseDate(from); err != nil {
			return ErrorResponse(c, fiber.StatusUnprocessableEntity, "Format parameter 'from' tidak valid")
		}
		conditions = append(conditions, fmt.Sprintf("date >= $%d", argIndex))
		args = append(args, from)
		argIndex++
	}

	if to != "" {
		if _, err := ParseDate(to); err != nil {
			return ErrorResponse(c, fiber.StatusUnprocessableEntity, "Format parameter 'to' tidak valid")
		}
		conditions = append(conditions, fmt.Sprintf("date <= $%d", argIndex))
		args = append(args, to)
		argIndex++
	}

	whereClause := "WHERE " + strings.Join(conditions, " AND ")

	// Hitung grand total untuk kalkulasi persentase
	totalQuery := fmt.Sprintf("SELECT COALESCE(SUM(amount), 0) FROM transactions %s", whereClause)
	var grandTotal int64
	err := h.DB.QueryRow(totalQuery, args...).Scan(&grandTotal)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal menghitung total pemasukan")
	}

	query := fmt.Sprintf(`
		SELECT 
			CASE WHEN source = '' THEN 'Tanpa Sumber' ELSE source END AS src,
			SUM(amount) AS total,
			COUNT(*) AS jumlah_transaksi,
			MAX(date) AS terakhir_masuk
		FROM transactions
		%s
		GROUP BY src
		ORDER BY total DESC
	`, whereClause)

	rows, err := h.DB.Query(query, args...)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal mengambil data sumber pemasukan")
	}
	defer rows.Close()

	type IncomeSourceDetail struct {
		Sumber          string  `json:"sumber"`
		Total           int64   `json:"total"`
		JumlahTransaksi int     `json:"jumlah_transaksi"`
		TerakhirMasuk   string  `json:"terakhir_masuk"`
		Persen          float64 `json:"persen"`
	}

	results := make([]IncomeSourceDetail, 0)
	for rows.Next() {
		var is IncomeSourceDetail
		var lastDate time.Time
		if err := rows.Scan(&is.Sumber, &is.Total, &is.JumlahTransaksi, &lastDate); err != nil {
			continue
		}
		is.TerakhirMasuk = lastDate.Format("2006-01-02")
		if grandTotal > 0 {
			is.Persen = math.Round((float64(is.Total)/float64(grandTotal))*10000) / 100.0
		}
		results = append(results, is)
	}

	return c.JSON(results)
}

// GetItems menangani GET /api/items?q=&from=&to=
func (h *Handler) GetItems(c *fiber.Ctx) error {
	q := c.Query("q")
	from := c.Query("from")
	to := c.Query("to")

	var conditions []string
	var args []any
	argIndex := 1

	if from != "" {
		if _, err := ParseDate(from); err != nil {
			return ErrorResponse(c, fiber.StatusUnprocessableEntity, "Format parameter 'from' tidak valid")
		}
		conditions = append(conditions, fmt.Sprintf("t.date >= $%d", argIndex))
		args = append(args, from)
		argIndex++
	}

	if to != "" {
		if _, err := ParseDate(to); err != nil {
			return ErrorResponse(c, fiber.StatusUnprocessableEntity, "Format parameter 'to' tidak valid")
		}
		conditions = append(conditions, fmt.Sprintf("t.date <= $%d", argIndex))
		args = append(args, to)
		argIndex++
	}

	if q != "" {
		conditions = append(conditions, fmt.Sprintf("LOWER(ti.name) LIKE $%d", argIndex))
		args = append(args, "%"+strings.ToLower(q)+"%")
		argIndex++
	}

	whereClause := ""
	if len(conditions) > 0 {
		whereClause = "WHERE " + strings.Join(conditions, " AND ")
	}

	query := fmt.Sprintf(`
		WITH ranked_items AS (
			SELECT 
				ti.name,
				ti.unit_price,
				t.date,
				ROW_NUMBER() OVER (PARTITION BY LOWER(ti.name) ORDER BY t.date DESC, t.created_at DESC, ti.id DESC) as rn
			FROM transaction_items ti
			JOIN transactions t ON ti.transaction_id = t.id
			%s
		),
		agg_items AS (
			SELECT 
				ti.name,
				SUM(ti.qty) AS total_qty,
				SUM(ti.subtotal) AS total_uang,
				MAX(t.date) AS terakhir_dibeli
			FROM transaction_items ti
			JOIN transactions t ON ti.transaction_id = t.id
			%s
			GROUP BY ti.name
		)
		SELECT 
			a.name,
			a.total_qty,
			a.total_uang,
			a.terakhir_dibeli,
			r.unit_price AS harga_terakhir
		FROM agg_items a
		JOIN ranked_items r ON LOWER(a.name) = LOWER(r.name) AND r.rn = 1
		ORDER BY a.total_uang DESC
	`, whereClause, whereClause)

	rows, err := h.DB.Query(query, args...)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal mengambil daftar barang: "+err.Error())
	}
	defer rows.Close()

	type ItemStats struct {
		Nama          string  `json:"nama"`
		TotalQty      float64 `json:"total_qty"`
		TotalUang     int64   `json:"total_uang"`
		TerakhirDibeli string  `json:"terakhir_dibeli"`
		HargaTerakhir int64   `json:"harga_terakhir"`
	}

	results := make([]ItemStats, 0)
	for rows.Next() {
		var it ItemStats
		var lastDate time.Time
		if err := rows.Scan(&it.Nama, &it.TotalQty, &it.TotalUang, &lastDate, &it.HargaTerakhir); err != nil {
			continue
		}
		it.TerakhirDibeli = lastDate.Format("2006-01-02")
		results = append(results, it)
	}

	return c.JSON(results)
}
