package handlers

import (
	"context"
	"math"
	"time"

	"github.com/gofiber/fiber/v2"

	"kasku-backend/internal/calc"
	"kasku-backend/internal/middleware"
)

// GetToday menangani GET /api/today
func (h *Handler) GetToday(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	todayStr := time.Now().Format("2006-01-02")
	if customDate := c.Query("date"); customDate != "" {
		if _, err := ParseDate(customDate); err == nil {
			todayStr = customDate
		}
	}

	openingBalance, err := h.GetOpeningBalance(userID)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal mengambil saldo awal")
	}

	// 1. Saldo akhir kemarin (user_id terisolasi)
	var masukKemarin, keluarKemarin int64
	err = h.DB.QueryRow(`
		SELECT 
			COALESCE(SUM(CASE WHEN type = 'masuk' THEN amount ELSE 0 END), 0),
			COALESCE(SUM(CASE WHEN type = 'keluar' THEN amount ELSE 0 END), 0)
		FROM transactions
		WHERE user_id = $1 AND date < $2
	`, userID, todayStr).Scan(&masukKemarin, &keluarKemarin)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal menghitung saldo kemarin")
	}
	saldoAwalHari := openingBalance + masukKemarin - keluarKemarin

	// 2. Transaksi hari ini
	rows, err := h.DB.Query(`
		SELECT id, date, type, category, party, source, note, amount, created_at,
		       COALESCE((SELECT COUNT(*) FROM transaction_items ti WHERE ti.transaction_id = transactions.id), 0) as jumlah_item
		FROM transactions
		WHERE user_id = $1 AND date = $2
		ORDER BY created_at ASC, id ASC
	`, userID, todayStr)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal mengambil transaksi hari ini")
	}
	defer rows.Close()

	var masukHariIni, keluarHariIni int64
	transaksiList := make([]TransactionResponse, 0)
	type srcSummary struct {
		Sumber string `json:"sumber"`
		Total  int64  `json:"total"`
	}
	sumberMap := make(map[string]int64)

	for rows.Next() {
		var t TransactionResponse
		var dateVal time.Time
		if err := rows.Scan(&t.ID, &dateVal, &t.Type, &t.Category, &t.Party, &t.Source, &t.Note, &t.Amount, &t.CreatedAt, &t.JumlahItem); err != nil {
			return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal membaca data transaksi hari ini")
		}
		t.Date = dateVal.Format("2006-01-02")
		transaksiList = append(transaksiList, t)

		if t.Type == "masuk" {
			masukHariIni += t.Amount
			srcName := t.Source
			if srcName == "" {
				srcName = "Tanpa Sumber"
			}
			sumberMap[srcName] += t.Amount
		} else if t.Type == "keluar" {
			keluarHariIni += t.Amount
		}
	}

	selisihHariIni := masukHariIni - keluarHariIni
	saldoSekarang := saldoAwalHari + selisihHariIni

	// Hitung total_tersimpan dan mutasi tabungan hari ini
	var setoranTabunganHariIni, penarikanTabunganHariIni int64
	_ = h.DB.QueryRow(`
		SELECT 
			COALESCE(SUM(CASE WHEN type = 'setor' THEN amount ELSE 0 END), 0),
			COALESCE(SUM(CASE WHEN type = 'tarik' THEN amount ELSE 0 END), 0)
		FROM savings_movements
		WHERE user_id = $1 AND date = $2
	`, userID, todayStr).Scan(&setoranTabunganHariIni, &penarikanTabunganHariIni)

	_, totalTersimpan, saldoBebasSekarang, _ := h.GetBalances(context.Background(), nil, userID)

	pemasukanPerSumber := make([]srcSummary, 0)
	for s, tot := range sumberMap {
		pemasukanPerSumber = append(pemasukanPerSumber, srcSummary{
			Sumber: s,
			Total:  tot,
		})
	}

	return c.JSON(fiber.Map{
		"tanggal":                       todayStr,
		"masuk_hari_ini":                masukHariIni,
		"keluar_hari_ini":               keluarHariIni,
		"jumlah_transaksi":              len(transaksiList),
		"saldo_awal_hari":               saldoAwalHari,
		"saldo_sekarang":                saldoSekarang,
		"saldo_bebas_sekarang":          saldoBebasSekarang,
		"total_tersimpan":               totalTersimpan,
		"setoran_tabungan_hari_ini":     setoranTabunganHariIni,
		"penarikan_tabungan_hari_ini":   penarikanTabunganHariIni,
		"selisih_hari_ini":              selisihHariIni,
		"pemasukan_per_sumber_hari_ini": pemasukanPerSumber,
		"transaksi":                     transaksiList,
	})
}

// GetOverview menangani GET /api/overview
func (h *Handler) GetOverview(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)

	openingBalance, err := h.GetOpeningBalance(userID)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal mengambil saldo awal")
	}

	// 1. Saldo kas total
	var totalMasuk, totalKeluar int64
	err = h.DB.QueryRow(`
		SELECT 
			COALESCE(SUM(CASE WHEN type = 'masuk' THEN amount ELSE 0 END), 0),
			COALESCE(SUM(CASE WHEN type = 'keluar' THEN amount ELSE 0 END), 0)
		FROM transactions
		WHERE user_id = $1
	`, userID).Scan(&totalMasuk, &totalKeluar)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal menghitung saldo kas")
	}
	saldo := openingBalance + totalMasuk - totalKeluar

	// 2. Piutang dan Hutang Saya
	txRows, err := h.DB.Query(`SELECT date, type, category, party, source, amount FROM transactions WHERE user_id = $1`, userID)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal membaca transaksi")
	}
	defer txRows.Close()

	var allTxs []calc.TransactionMinimal
	for txRows.Next() {
		var tx calc.TransactionMinimal
		if err := txRows.Scan(&tx.Date, &tx.Type, &tx.Category, &tx.Party, &tx.Source, &tx.Amount); err == nil {
			allTxs = append(allTxs, tx)
		}
	}

	piutangList := calc.CalculatePiutang(allTxs)
	var piutangTotal int64
	for _, p := range piutangList {
		if p.Sisa > 0 {
			piutangTotal += p.Sisa
		}
	}

	hutangSayaList := calc.CalculateHutangSaya(allTxs)
	var hutangSayaTotal int64
	for _, hs := range hutangSayaList {
		if hs.Sisa > 0 {
			hutangSayaTotal += hs.Sisa
		}
	}

	// 3. Langganan belum dibayar
	subRows, err := h.DB.Query(`
		SELECT id, name, amount, cycle, first_due, active 
		FROM subscriptions 
		WHERE user_id = $1 AND active = true
	`, userID)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal membaca langganan")
	}
	defer subRows.Close()

	today := time.Now()
	var langgananBelumDibayarTotal int64
	var belumDibayarJumlah int

	for subRows.Next() {
		var subID, name, cycle string
		var amount int64
		var firstDue time.Time
		var active bool
		if err := subRows.Scan(&subID, &name, &amount, &cycle, &firstDue, &active); err != nil {
			continue
		}

		var paidCount int
		_ = h.DB.QueryRow(`
			SELECT COUNT(*) 
			FROM transactions 
			WHERE user_id = $1 AND type = 'keluar' AND category = 'Langganan' AND LOWER(TRIM(party)) = LOWER(TRIM($2))
		`, userID, name).Scan(&paidCount)

		status := calc.CalculateSubscriptionStatus(firstDue, cycle, paidCount, today)
		if status.Status == "Belum Dibayar" {
			langgananBelumDibayarTotal += amount
			belumDibayarJumlah++
		}
	}

	// 4. Tagihan belum dibayar
	var tagihanBelumDibayarTotal int64
	var countUnpaidBills int
	err = h.DB.QueryRow(`
		SELECT COALESCE(SUM(amount), 0), COUNT(*) 
		FROM bills 
		WHERE user_id = $1 AND paid = false
	`, userID).Scan(&tagihanBelumDibayarTotal, &countUnpaidBills)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal membaca tagihan")
	}
	belumDibayarJumlah += countUnpaidBills

	belumDibayarTotal := langgananBelumDibayarTotal + tagihanBelumDibayarTotal

	// 5. Kekayaan Bersih
	kekayaanBersih := calc.CalculateKekayaanBersih(saldo, piutangTotal, hutangSayaTotal, langgananBelumDibayarTotal, tagihanBelumDibayarTotal)

	// Hitung saldo total, total tersimpan, saldo bebas, dan jatah harian
	saldoTotal, totalTersimpan, saldoBebas, _ := h.GetBalances(context.Background(), nil, userID)
	sisaHariBulanIni := calc.SisaHariBulanIni(today)
	jatahHarian := calc.CalculateJatahHarian(saldoBebas, sisaHariBulanIni)

	// Hitung wishlist aktif
	var wishlistAktifJumlah, wishlistBisaDibeliJumlah int
	var wishlistTotalHarga int64
	wRows, err := h.DB.QueryContext(context.Background(), `
		SELECT price FROM wishlist_items WHERE user_id = $1 AND status = 'aktif'
	`, userID)
	if err == nil {
		defer wRows.Close()
		for wRows.Next() {
			var p int64
			if err := wRows.Scan(&p); err == nil {
				wishlistAktifJumlah++
				wishlistTotalHarga += p
				if p <= saldoBebas {
					wishlistBisaDibeliJumlah++
				}
			}
		}
	}

	return c.JSON(fiber.Map{
		"saldo":                       saldoTotal,
		"saldo_total":                 saldoTotal,
		"total_tersimpan":             totalTersimpan,
		"saldo_bebas":                 saldoBebas,
		"sisa_hari_bulan_ini":         sisaHariBulanIni,
		"jatah_harian":                jatahHarian,
		"piutang_total":               piutangTotal,
		"hutang_saya_total":           hutangSayaTotal,
		"belum_dibayar_total":         belumDibayarTotal,
		"belum_dibayar_jumlah":        belumDibayarJumlah,
		"kekayaan_bersih":             kekayaanBersih,
		"wishlist_aktif_jumlah":       wishlistAktifJumlah,
		"wishlist_total_harga":        wishlistTotalHarga,
		"wishlist_bisa_dibeli_jumlah": wishlistBisaDibeliJumlah,
	})
}

// GetSummary menangani GET /api/summary?from=&to=
func (h *Handler) GetSummary(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	now := time.Now()
	firstOfMonth := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)
	lastOfMonth := firstOfMonth.AddDate(0, 1, -1)

	fromStr := c.Query("from")
	toStr := c.Query("to")

	var fromDate, toDate time.Time
	var err error

	if fromStr != "" {
		fromDate, err = ParseDate(fromStr)
		if err != nil {
			return ErrorResponse(c, fiber.StatusUnprocessableEntity, "Format parameter 'from' tidak valid")
		}
	} else {
		fromDate = firstOfMonth
		fromStr = fromDate.Format("2006-01-02")
	}

	if toStr != "" {
		toDate, err = ParseDate(toStr)
		if err != nil {
			return ErrorResponse(c, fiber.StatusUnprocessableEntity, "Format parameter 'to' tidak valid")
		}
	} else {
		toDate = lastOfMonth
		toStr = toDate.Format("2006-01-02")
	}

	openingBalance, err := h.GetOpeningBalance(userID)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal mengambil saldo awal")
	}

	// 1. Saldo awal periode
	var masukSebelum, keluarSebelum int64
	err = h.DB.QueryRow(`
		SELECT 
			COALESCE(SUM(CASE WHEN type = 'masuk' THEN amount ELSE 0 END), 0),
			COALESCE(SUM(CASE WHEN type = 'keluar' THEN amount ELSE 0 END), 0)
		FROM transactions
		WHERE user_id = $1 AND date < $2
	`, userID, fromStr).Scan(&masukSebelum, &keluarSebelum)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal menghitung saldo awal periode")
	}
	saldoAwalPeriode := openingBalance + masukSebelum - keluarSebelum

	// 2. Transaksi periode
	var totalMasuk, totalKeluar int64
	err = h.DB.QueryRow(`
		SELECT 
			COALESCE(SUM(CASE WHEN type = 'masuk' THEN amount ELSE 0 END), 0),
			COALESCE(SUM(CASE WHEN type = 'keluar' THEN amount ELSE 0 END), 0)
		FROM transactions
		WHERE user_id = $1 AND date >= $2 AND date <= $3
	`, userID, fromStr, toStr).Scan(&totalMasuk, &totalKeluar)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal menghitung ringkasan periode")
	}
	selisih := totalMasuk - totalKeluar
	saldoAkhirPeriode := saldoAwalPeriode + selisih

	// 3. Pengeluaran per kategori
	type CategorySummary struct {
		Kategori string  `json:"kategori"`
		Total    int64   `json:"total"`
		Persen   float64 `json:"persen"`
	}
	catRows, err := h.DB.Query(`
		SELECT category, SUM(amount) AS total
		FROM transactions
		WHERE user_id = $1 AND type = 'keluar' AND date >= $2 AND date <= $3
		GROUP BY category
		ORDER BY total DESC
	`, userID, fromStr, toStr)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal menghitung pengeluaran per kategori")
	}
	defer catRows.Close()

	pengeluaranPerKategori := make([]CategorySummary, 0)
	for catRows.Next() {
		var cs CategorySummary
		if err := catRows.Scan(&cs.Kategori, &cs.Total); err != nil {
			continue
		}
		if totalKeluar > 0 {
			cs.Persen = math.Round((float64(cs.Total)/float64(totalKeluar))*10000) / 100.0
		}
		pengeluaranPerKategori = append(pengeluaranPerKategori, cs)
	}

	// 4. Pemasukan per sumber
	srcRows, err := h.DB.Query(`
		SELECT 
			CASE WHEN source = '' THEN 'Tanpa Sumber' ELSE source END AS src,
			SUM(amount) AS total,
			COUNT(*) AS cnt
		FROM transactions
		WHERE user_id = $1 AND type = 'masuk' AND date >= $2 AND date <= $3
		GROUP BY src
		ORDER BY total DESC
	`, userID, fromStr, toStr)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal menghitung pemasukan per sumber")
	}
	defer srcRows.Close()

	type IncomeSourceSummary struct {
		Sumber          string  `json:"sumber"`
		Total           int64   `json:"total"`
		JumlahTransaksi int     `json:"jumlah_transaksi"`
		Persen          float64 `json:"persen"`
	}
	pemasukanPerSumber := make([]IncomeSourceSummary, 0)
	for srcRows.Next() {
		var is IncomeSourceSummary
		if err := srcRows.Scan(&is.Sumber, &is.Total, &is.JumlahTransaksi); err != nil {
			continue
		}
		if totalMasuk > 0 {
			is.Persen = math.Round((float64(is.Total)/float64(totalMasuk))*10000) / 100.0
		}
		pemasukanPerSumber = append(pemasukanPerSumber, is)
	}

	// 5. Barang teratas
	type TopItem struct {
		Nama      string  `json:"nama"`
		TotalQty  float64 `json:"total_qty"`
		TotalUang int64   `json:"total_uang"`
	}
	topItemRows, err := h.DB.Query(`
		SELECT ti.name, SUM(ti.qty) AS total_qty, SUM(ti.subtotal) AS total_uang
		FROM transaction_items ti
		JOIN transactions t ON ti.transaction_id = t.id
		WHERE t.user_id = $1 AND t.type = 'keluar' AND t.date >= $2 AND t.date <= $3
		GROUP BY ti.name
		ORDER BY total_uang DESC
		LIMIT 10
	`, userID, fromStr, toStr)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal menghitung barang teratas")
	}
	defer topItemRows.Close()

	barangTeratas := make([]TopItem, 0)
	for topItemRows.Next() {
		var it TopItem
		if err := topItemRows.Scan(&it.Nama, &it.TotalQty, &it.TotalUang); err == nil {
			barangTeratas = append(barangTeratas, it)
		}
	}

	// 6. Tren harian
	trendRows, err := h.DB.Query(`
		SELECT 
			date,
			COALESCE(SUM(CASE WHEN type = 'masuk' THEN amount ELSE 0 END), 0) AS masuk,
			COALESCE(SUM(CASE WHEN type = 'keluar' THEN amount ELSE 0 END), 0) AS keluar
		FROM transactions
		WHERE user_id = $1 AND date >= $2 AND date <= $3
		GROUP BY date
		ORDER BY date ASC
	`, userID, fromStr, toStr)
	if err != nil {
		return ErrorResponse(c, fiber.StatusInternalServerError, "Gagal menghitung tren harian")
	}
	defer trendRows.Close()

	type DailyTrend struct {
		Tanggal string `json:"tanggal"`
		Masuk   int64  `json:"masuk"`
		Keluar  int64  `json:"keluar"`
		Saldo   int64  `json:"saldo"`
	}
	trenHarian := make([]DailyTrend, 0)
	runningSaldo := saldoAwalPeriode
	for trendRows.Next() {
		var dVal time.Time
		var dt DailyTrend
		if err := trendRows.Scan(&dVal, &dt.Masuk, &dt.Keluar); err == nil {
			dt.Tanggal = dVal.Format("2006-01-02")
			runningSaldo += dt.Masuk - dt.Keluar
			dt.Saldo = runningSaldo
			trenHarian = append(trenHarian, dt)
		}
	}

	// 7. Perbandingan
	daysDiff := int(toDate.Sub(fromDate).Hours()/24) + 1
	if daysDiff <= 0 {
		daysDiff = 1
	}

	prevToDate := fromDate.AddDate(0, 0, -1)
	prevFromDate := prevToDate.AddDate(0, 0, -(daysDiff - 1))

	var keluarPeriodeSebelumnya int64
	_ = h.DB.QueryRow(`
		SELECT COALESCE(SUM(amount), 0)
		FROM transactions
		WHERE user_id = $1 AND type = 'keluar' AND date >= $2 AND date <= $3
	`, userID, prevFromDate.Format("2006-01-02"), prevToDate.Format("2006-01-02")).Scan(&keluarPeriodeSebelumnya)

	selisihRp := totalKeluar - keluarPeriodeSebelumnya
	var selisihPersen float64
	if keluarPeriodeSebelumnya > 0 {
		selisihPersen = math.Round((float64(selisihRp)/float64(keluarPeriodeSebelumnya))*10000) / 100.0
	}

	rataRataKeluarPerHari := int64(math.Round(float64(totalKeluar) / float64(daysDiff)))

	// Hitung mutasi tabungan periode dan saldo bebas akhir periode
	var setorPeriode, tarikPeriode, pakaiPeriode int64
	_ = h.DB.QueryRow(`
		SELECT 
			COALESCE(SUM(CASE WHEN type = 'setor' THEN amount ELSE 0 END), 0),
			COALESCE(SUM(CASE WHEN type = 'tarik' THEN amount ELSE 0 END), 0),
			COALESCE(SUM(CASE WHEN type = 'pakai' THEN amount ELSE 0 END), 0)
		FROM savings_movements
		WHERE user_id = $1 AND date >= $2 AND date <= $3
	`, userID, fromStr, toStr).Scan(&setorPeriode, &tarikPeriode, &pakaiPeriode)

	// Total tersimpan s/d toDate
	var totalTersimpanSampaiToDate int64
	_ = h.DB.QueryRow(`
		SELECT 
			COALESCE(SUM(CASE WHEN sm.type = 'setor' THEN sm.amount ELSE 0 END), 0) -
			COALESCE(SUM(CASE WHEN sm.type IN ('tarik', 'pakai') THEN sm.amount ELSE 0 END), 0)
		FROM savings_movements sm
		JOIN savings_pots sp ON sm.pot_id = sp.id
		WHERE sm.user_id = $1 AND sm.date <= $2 AND sp.archived = false
	`, userID, toStr).Scan(&totalTersimpanSampaiToDate)

	saldoBebasAkhirPeriode := saldoAkhirPeriode - totalTersimpanSampaiToDate

	return c.JSON(fiber.Map{
		"total_masuk":              totalMasuk,
		"total_keluar":             totalKeluar,
		"selisih":                  selisih,
		"saldo_awal_periode":       saldoAwalPeriode,
		"saldo_akhir_periode":      saldoAkhirPeriode,
		"saldo_bebas_akhir_periode": saldoBebasAkhirPeriode,
		"perpindahan_tabungan_periode": fiber.Map{
			"setor": setorPeriode,
			"tarik": tarikPeriode,
			"pakai": pakaiPeriode,
		},
		"pengeluaran_per_kategori": pengeluaranPerKategori,
		"pemasukan_per_sumber":     pemasukanPerSumber,
		"barang_teratas":           barangTeratas,
		"tren_harian":              trenHarian,
		"perbandingan": fiber.Map{
			"keluar_periode":            totalKeluar,
			"keluar_periode_sebelumnya": keluarPeriodeSebelumnya,
			"selisih_rp":                selisihRp,
			"selisih_persen":            selisihPersen,
		},
		"rata_rata_keluar_per_hari": rataRataKeluarPerHari,
	})
}
