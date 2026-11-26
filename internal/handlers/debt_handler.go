package handlers

import (
	"context"
	"sort"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"

	"kasku-backend/internal/calc"
	"kasku-backend/internal/middleware"
)

// GetDebts menangani GET /api/debts
func (h *Handler) GetDebts(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)

	rows, err := h.DB.Query("SELECT date, type, category, party, source, amount FROM transactions WHERE user_id = $1", userID)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal membaca data transaksi")
	}
	defer rows.Close()

	var allTxs []calc.TransactionMinimal
	for rows.Next() {
		var tx calc.TransactionMinimal
		if err := rows.Scan(&tx.Date, &tx.Type, &tx.Category, &tx.Party, &tx.Source, &tx.Amount); err == nil {
			allTxs = append(allTxs, tx)
		}
	}

	piutang := calc.CalculatePiutang(allTxs)
	hutangSaya := calc.CalculateHutangSaya(allTxs)

	return c.JSON(fiber.Map{
		"piutang":     piutang,
		"hutang_saya": hutangSaya,
	})
}

// GetDebtsByPerson menangani GET /api/debts/:nama
func (h *Handler) GetDebtsByPerson(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	nama := c.Params("nama")
	if strings.TrimSpace(nama) == "" {
		return ErrorResponse(c, fiber.StatusBadRequest, "Parameter nama tidak boleh kosong")
	}

	rows, err := h.DB.Query(`
		SELECT id, date, type, category, party, source, note, amount, created_at,
		       COALESCE((SELECT COUNT(*) FROM transaction_items ti WHERE ti.transaction_id = transactions.id), 0) AS jumlah_item
		FROM transactions
		WHERE user_id = $1 AND LOWER(TRIM(party)) = LOWER(TRIM($2))
		ORDER BY date DESC, created_at DESC, id DESC
	`, userID, nama)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal mengambil riwayat transaksi")
	}
	defer rows.Close()

	var txResponses []TransactionResponse
	var personTxs []calc.TransactionMinimal

	for rows.Next() {
		var t TransactionResponse
		var dVal time.Time
		if err := rows.Scan(&t.ID, &dVal, &t.Type, &t.Category, &t.Party, &t.Source, &t.Note, &t.Amount, &t.CreatedAt, &t.JumlahItem); err == nil {
			t.Date = dVal.Format("2006-01-02")
			txResponses = append(txResponses, t)
			personTxs = append(personTxs, calc.TransactionMinimal{
				Date:     dVal,
				Type:     t.Type,
				Category: t.Category,
				Party:    t.Party,
				Source:   t.Source,
				Amount:   t.Amount,
			})
		}
	}

	piutangList := calc.CalculatePiutang(personTxs)
	hutangSayaList := calc.CalculateHutangSaya(personTxs)

	var ringkasanPiutang *calc.DebtSummary
	if len(piutangList) > 0 {
		ringkasanPiutang = &piutangList[0]
	}

	var ringkasanHutangSaya *calc.DebtSummary
	if len(hutangSayaList) > 0 {
		ringkasanHutangSaya = &hutangSayaList[0]
	}

	return c.JSON(fiber.Map{
		"nama":               nama,
		"piutang":            ringkasanPiutang,
		"hutang_saya":        ringkasanHutangSaya,
		"riwayat_transaksi":  txResponses,
	})
}

// UnpaidItem item kewajiban yang belum dibayar
type UnpaidItem struct {
	Jenis      string `json:"jenis"`       // piutang, langganan, tagihan, hutang_saya
	Nama       string `json:"nama"`
	Jumlah     int64  `json:"jumlah"`
	JatuhTempo string `json:"jatuh_tempo"` // format YYYY-MM-DD atau kosong jika n/a
	Status     string `json:"status"`      // Belum Dibayar, Segera Jatuh Tempo, Terlambat, Dicicil
	TelatHari  int    `json:"telat_hari"`
}

// GetUnpaid menangani GET /api/unpaid
func (h *Handler) GetUnpaid(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	today := time.Now()

	// 1. Transaksi untuk piutang dan hutang_saya
	rows, err := h.DB.Query("SELECT date, type, category, party, source, amount FROM transactions WHERE user_id = $1", userID)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal membaca transaksi")
	}
	defer rows.Close()

	var allTxs []calc.TransactionMinimal
	for rows.Next() {
		var tx calc.TransactionMinimal
		if err := rows.Scan(&tx.Date, &tx.Type, &tx.Category, &tx.Party, &tx.Source, &tx.Amount); err == nil {
			allTxs = append(allTxs, tx)
		}
	}

	unpaidItems := make([]UnpaidItem, 0)

	for _, p := range calc.CalculatePiutang(allTxs) {
		if p.Sisa > 0 {
			unpaidItems = append(unpaidItems, UnpaidItem{
				Jenis:      "piutang",
				Nama:       p.Nama,
				Jumlah:     p.Sisa,
				JatuhTempo: "",
				Status:     p.Status,
				TelatHari:  0,
			})
		}
	}

	for _, hs := range calc.CalculateHutangSaya(allTxs) {
		if hs.Sisa > 0 {
			unpaidItems = append(unpaidItems, UnpaidItem{
				Jenis:      "hutang_saya",
				Nama:       hs.Nama,
				Jumlah:     hs.Sisa,
				JatuhTempo: "",
				Status:     hs.Status,
				TelatHari:  0,
			})
		}
	}

	// 2. Langganan aktif yang belum dibayar / segera jatuh tempo
	subRows, err := h.DB.Query("SELECT id, name, amount, cycle, first_due FROM subscriptions WHERE user_id = $1 AND active = true", userID)
	if err == nil {
		defer subRows.Close()
		for subRows.Next() {
			var id, name, cycle string
			var amount int64
			var firstDue time.Time
			if err := subRows.Scan(&id, &name, &amount, &cycle, &firstDue); err == nil {
				var count int
				_ = h.DB.QueryRow(`
					SELECT COUNT(*) FROM transactions 
					WHERE user_id = $1 AND type = 'keluar' AND category = 'Langganan' AND LOWER(TRIM(party)) = LOWER(TRIM($2))
				`, userID, name).Scan(&count)

				stat := calc.CalculateSubscriptionStatus(firstDue, cycle, count, today)
				if stat.Status == "Belum Dibayar" || stat.Status == "Segera Jatuh Tempo" {
					unpaidItems = append(unpaidItems, UnpaidItem{
						Jenis:      "langganan",
						Nama:       name,
						Jumlah:     amount,
						JatuhTempo: stat.JatuhTempo.Format("2006-01-02"),
						Status:     stat.Status,
						TelatHari:  stat.TelatHari,
					})
				}
			}
		}
	}

	// 3. Tagihan belum dibayar
	billRows, err := h.DB.Query("SELECT title, amount, due_date FROM bills WHERE user_id = $1 AND paid = false", userID)
	if err == nil {
		defer billRows.Close()
		for billRows.Next() {
			var title string
			var amount int64
			var dueDate time.Time
			if err := billRows.Scan(&title, &amount, &dueDate); err == nil {
				stat := calc.CalculateBillStatus(false, dueDate, today)
				unpaidItems = append(unpaidItems, UnpaidItem{
					Jenis:      "tagihan",
					Nama:       title,
					Jumlah:     amount,
					JatuhTempo: dueDate.Format("2006-01-02"),
					Status:     stat.Status,
					TelatHari:  stat.TelatHari,
				})
			}
		}
	}

	sort.SliceStable(unpaidItems, func(i, j int) bool {
		if unpaidItems[i].TelatHari != unpaidItems[j].TelatHari {
			return unpaidItems[i].TelatHari > unpaidItems[j].TelatHari
		}
		if unpaidItems[i].JatuhTempo != "" && unpaidItems[j].JatuhTempo != "" {
			return unpaidItems[i].JatuhTempo < unpaidItems[j].JatuhTempo
		}
		return unpaidItems[i].Jumlah > unpaidItems[j].Jumlah
	})

	// Hitung total belum dibayar (langganan + tagihan jatuh tempo / belum dibayar)
	var totalBelumDibayarLanggananTagihan int64
	for _, it := range unpaidItems {
		if it.Jenis == "langganan" || it.Jenis == "tagihan" {
			totalBelumDibayarLanggananTagihan += it.Jumlah
		}
	}

	_, _, saldoBebas, _ := h.GetBalances(context.Background(), nil, userID)
	var peringatan string
	if totalBelumDibayarLanggananTagihan > saldoBebas {
		peringatan = "Peringatan: Total kewajiban belum dibayar (langganan & tagihan) melebihi saldo bebas Anda saat ini."
	}

	return c.JSON(fiber.Map{
		"items":                                 unpaidItems,
		"total_belum_dibayar_langganan_tagihan": totalBelumDibayarLanggananTagihan,
		"saldo_bebas":                           saldoBebas,
		"peringatan":                            peringatan,
	})
}
