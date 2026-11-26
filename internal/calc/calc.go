package calc

import (
	"math"
	"strings"
	"time"
)

// Kategori Valid
var ValidMasukCategories = []string{
	"Jual Akun/Barang",
	"Gaji/Penghasilan",
	"Terima Bayar Hutang",
	"Pinjam dari Orang",
	"Pemasukan Lain",
}

var ValidKeluarCategories = []string{
	"Makanan & Minuman",
	"Transport",
	"Belanja",
	"Langganan",
	"Tagihan",
	"Beri Pinjaman",
	"Bayar Hutang Saya",
	"Hiburan/Game",
	"Pengeluaran Lain",
}

// IsValidCategory memeriksa apakah kategori valid untuk jenis transaksi tertentu ('masuk' atau 'keluar')
func IsValidCategory(txType string, category string) bool {
	cleanCat := strings.TrimSpace(category)
	switch txType {
	case "masuk":
		for _, c := range ValidMasukCategories {
			if c == cleanCat {
				return true
			}
		}
	case "keluar":
		for _, c := range ValidKeluarCategories {
			if c == cleanCat {
				return true
			}
		}
	}
	return false
}

// CleanKey normalisasi string untuk pencocokan case-insensitive dan trim spasi
func CleanKey(s string) string {
	return strings.ToLower(strings.TrimSpace(s))
}

// Subtotal item: round(qty * unitPrice)
func CalculateItemSubtotal(qty float64, unitPrice int64) int64 {
	if qty <= 0 || unitPrice < 0 {
		return 0
	}
	return int64(math.Round(qty * float64(unitPrice)))
}

// Saldo: opening_balance + sum(masuk) - sum(keluar)
func CalculateSaldo(openingBalance int64, masuk int64, keluar int64) int64 {
	return openingBalance + masuk - keluar
}

// TransactionMinimal data model untuk perhitungan calc
type TransactionMinimal struct {
	Date     time.Time
	Type     string
	Category string
	Party    string
	Source   string
	Amount   int64
}

// Saldo pada tanggal tertentu (D): transaksi dengan date <= D
func CalculateSaldoOnDate(openingBalance int64, txs []TransactionMinimal, targetDate time.Time) int64 {
	target := TruncateToDay(targetDate)
	var masuk, keluar int64
	for _, tx := range txs {
		txDate := TruncateToDay(tx.Date)
		if !txDate.After(target) {
			if tx.Type == "masuk" {
				masuk += tx.Amount
			} else if tx.Type == "keluar" {
				keluar += tx.Amount
			}
		}
	}
	return openingBalance + masuk - keluar
}

// DebtSummary menyimpan hasil perhitungan hutang/piutang per orang
type DebtSummary struct {
	Nama    string `json:"nama"`
	Total   int64  `json:"total"`
	Dibayar int64  `json:"dibayar"`
	Sisa    int64  `json:"sisa"`
	Persen  int    `json:"persen"`
	Status  string `json:"status"` // Lunas / Dicicil / Belum Dibayar
}

// CalculatePiutang menghitung piutang per orang dari transaksi
// sum("Beri Pinjaman") - sum("Terima Bayar Hutang")
func CalculatePiutang(txs []TransactionMinimal) []DebtSummary {
	type personDebt struct {
		originalName string
		pinjaman     int64
		dibayar      int64
	}
	people := make(map[string]*personDebt)
	var order []string

	for _, tx := range txs {
		cleanParty := CleanKey(tx.Party)
		if cleanParty == "" {
			continue
		}
		if _, exists := people[cleanParty]; !exists {
			people[cleanParty] = &personDebt{originalName: strings.TrimSpace(tx.Party)}
			order = append(order, cleanParty)
		}

		if tx.Type == "keluar" && tx.Category == "Beri Pinjaman" {
			people[cleanParty].pinjaman += tx.Amount
		} else if tx.Type == "masuk" && tx.Category == "Terima Bayar Hutang" {
			people[cleanParty].dibayar += tx.Amount
		}
	}

	var result []DebtSummary
	for _, key := range order {
		p := people[key]
		if p.pinjaman == 0 && p.dibayar == 0 {
			continue
		}
		sisa := p.pinjaman - p.dibayar
		status, persen := EvaluateDebtStatus(p.pinjaman, p.dibayar)
		result = append(result, DebtSummary{
			Nama:    p.originalName,
			Total:   p.pinjaman,
			Dibayar: p.dibayar,
			Sisa:    sisa,
			Persen:  persen,
			Status:  status,
		})
	}
	return result
}

// CalculateHutangSaya menghitung hutang Anda ke orang lain
// sum("Pinjam dari Orang") - sum("Bayar Hutang Saya")
func CalculateHutangSaya(txs []TransactionMinimal) []DebtSummary {
	type personDebt struct {
		originalName string
		pinjaman     int64
		dibayar      int64
	}
	people := make(map[string]*personDebt)
	var order []string

	for _, tx := range txs {
		cleanParty := CleanKey(tx.Party)
		if cleanParty == "" {
			continue
		}
		if _, exists := people[cleanParty]; !exists {
			people[cleanParty] = &personDebt{originalName: strings.TrimSpace(tx.Party)}
			order = append(order, cleanParty)
		}

		if tx.Type == "masuk" && tx.Category == "Pinjam dari Orang" {
			people[cleanParty].pinjaman += tx.Amount
		} else if tx.Type == "keluar" && tx.Category == "Bayar Hutang Saya" {
			people[cleanParty].dibayar += tx.Amount
		}
	}

	var result []DebtSummary
	for _, key := range order {
		p := people[key]
		if p.pinjaman == 0 && p.dibayar == 0 {
			continue
		}
		sisa := p.pinjaman - p.dibayar
		status, persen := EvaluateDebtStatus(p.pinjaman, p.dibayar)
		result = append(result, DebtSummary{
			Nama:    p.originalName,
			Total:   p.pinjaman,
			Dibayar: p.dibayar,
			Sisa:    sisa,
			Persen:  persen,
			Status:  status,
		})
	}
	return result
}

// EvaluateDebtStatus menentukan status ("Lunas", "Dicicil", "Belum Dibayar") dan persen lunas
func EvaluateDebtStatus(total int64, dibayar int64) (string, int) {
	sisa := total - dibayar
	if total <= 0 {
		return "Lunas", 100
	}
	if sisa <= 0 {
		return "Lunas", 100
	}

	persen := int(math.Round((float64(dibayar) / float64(total)) * 100))
	if persen > 100 {
		persen = 100
	} else if persen < 0 {
		persen = 0
	}

	if dibayar > 0 {
		return "Dicicil", persen
	}
	return "Belum Dibayar", 0
}

// TruncateToDay membuang komponen jam/menit/detik
func TruncateToDay(t time.Time) time.Time {
	return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, time.UTC)
}

// AddMonthsClamped menambahkan bulan dengan batas akhir bulan (misal Jan 31 + 1 bulan = Feb 28/29)
func AddMonthsClamped(t time.Time, months int) time.Time {
	year, month, day := t.Date()
	totalMonths := int(month) - 1 + months
	newYear := year + totalMonths/12
	rem := totalMonths % 12
	if rem < 0 {
		newYear--
		rem += 12
	}
	newMonth := time.Month(rem + 1)

	// Hitung hari terakhir di newMonth
	firstOfNextMonth := time.Date(newYear, newMonth+1, 1, 0, 0, 0, 0, t.Location())
	daysInMonth := firstOfNextMonth.AddDate(0, 0, -1).Day()

	if day > daysInMonth {
		day = daysInMonth
	}
	return time.Date(newYear, newMonth, day, 0, 0, 0, 0, t.Location())
}

// SubscriptionStatus info status langganan
type SubscriptionStatus struct {
	JatuhTempo time.Time `json:"jatuh_tempo"`
	SisaHari   int       `json:"sisa_hari"`
	TelatHari  int       `json:"telat_hari"`
	Status     string    `json:"status"` // Belum Dibayar, Segera Jatuh Tempo, Sudah Dibayar
}

// CalculateSubscriptionStatus menghitung jatuh tempo dan status langganan
// cycle: 'mingguan', 'bulanan', '3_bulanan', 'tahunan'
// n: jumlah transaksi kategori "Langganan" dengan party = nama langganan
func CalculateSubscriptionStatus(firstDue time.Time, cycle string, n int, today time.Time) SubscriptionStatus {
	cleanDue := TruncateToDay(firstDue)
	todayClean := TruncateToDay(today)

	var jatuhTempo time.Time
	switch cycle {
	case "mingguan":
		jatuhTempo = cleanDue.AddDate(0, 0, 7*n)
	case "bulanan":
		jatuhTempo = AddMonthsClamped(cleanDue, 1*n)
	case "3_bulanan":
		jatuhTempo = AddMonthsClamped(cleanDue, 3*n)
	case "tahunan":
		jatuhTempo = AddMonthsClamped(cleanDue, 12*n)
	default:
		jatuhTempo = cleanDue
	}

	diffHours := jatuhTempo.Sub(todayClean).Hours()
	sisaHari := int(math.Round(diffHours / 24.0))

	var status string
	var telatHari int
	if sisaHari <= 0 {
		status = "Belum Dibayar"
		telatHari = -sisaHari
	} else if sisaHari <= 7 {
		status = "Segera Jatuh Tempo"
		telatHari = 0
	} else {
		status = "Sudah Dibayar"
		telatHari = 0
	}

	return SubscriptionStatus{
		JatuhTempo: jatuhTempo,
		SisaHari:   sisaHari,
		TelatHari:  telatHari,
		Status:     status,
	}
}

// TagihanStatus
type BillStatus struct {
	Status    string `json:"status"` // Sudah Dibayar, Belum Dibayar, Terlambat
	TelatHari int    `json:"telat_hari"`
}

func CalculateBillStatus(paid bool, dueDate time.Time, today time.Time) BillStatus {
	if paid {
		return BillStatus{
			Status:    "Sudah Dibayar",
			TelatHari: 0,
		}
	}
	todayClean := TruncateToDay(today)
	dueClean := TruncateToDay(dueDate)
	diffHours := dueClean.Sub(todayClean).Hours()
	sisaHari := int(math.Round(diffHours / 24.0))

	if sisaHari < 0 {
		return BillStatus{
			Status:    "Terlambat",
			TelatHari: -sisaHari,
		}
	}
	return BillStatus{
		Status:    "Belum Dibayar",
		TelatHari: 0,
	}
}

// Kekayaan Bersih = Saldo + Total Piutang - Total Hutang Saya - Langganan Belum Dibayar - Tagihan Belum Dibayar
func CalculateKekayaanBersih(saldo int64, totalPiutang int64, totalHutangSaya int64, langgananBelumDibayar int64, tagihanBelumDibayar int64) int64 {
	return saldo + totalPiutang - totalHutangSaya - langgananBelumDibayar - tagihanBelumDibayar
}

// SourceSummary ringkasan per sumber pemasukan
type SourceSummary struct {
	Sumber          string    `json:"sumber"`
	Total           int64     `json:"total"`
	JumlahTransaksi int       `json:"jumlah_transaksi"`
	TerakhirMasuk   time.Time `json:"terakhir_masuk"`
	Persen          float64   `json:"persen"`
}

// CalculateIncomeBySource mengagregasi pemasukan berdasarkan sumber
func CalculateIncomeBySource(txs []TransactionMinimal) []SourceSummary {
	type srcData struct {
		name          string
		total         int64
		count         int
		terakhirMasuk time.Time
	}
	mapping := make(map[string]*srcData)
	var order []string
	var grandTotal int64

	for _, tx := range txs {
		if tx.Type != "masuk" {
			continue
		}
		grandTotal += tx.Amount
		sourceName := strings.TrimSpace(tx.Source)
		if sourceName == "" {
			sourceName = "Tanpa Sumber"
		}
		key := CleanKey(sourceName)

		d, exists := mapping[key]
		if !exists {
			d = &srcData{name: sourceName, terakhirMasuk: tx.Date}
			mapping[key] = d
			order = append(order, key)
		}
		d.total += tx.Amount
		d.count++
		if tx.Date.After(d.terakhirMasuk) {
			d.terakhirMasuk = tx.Date
		}
	}

	var results []SourceSummary
	for _, key := range order {
		d := mapping[key]
		var persen float64
		if grandTotal > 0 {
			persen = math.Round((float64(d.total)/float64(grandTotal))*10000) / 100.0
		}
		results = append(results, SourceSummary{
			Sumber:          d.name,
			Total:           d.total,
			JumlahTransaksi: d.count,
			TerakhirMasuk:   d.terakhirMasuk,
			Persen:          persen,
		})
	}
	return results
}

// SavingsMovementMinimal data model minimal untuk riwayat tabungan
type SavingsMovementMinimal struct {
	Type   string
	Amount int64
	Date   time.Time
}

// SaldoBebas = saldoTotal - totalTersimpan
func CalculateSaldoBebas(saldoTotal int64, totalTersimpan int64) int64 {
	return saldoTotal - totalTersimpan
}

// SaldoPos = sum(setor) - sum(tarik) - sum(pakai)
func CalculateSaldoPos(movements []SavingsMovementMinimal) int64 {
	var saldo int64
	for _, m := range movements {
		switch m.Type {
		case "setor":
			saldo += m.Amount
		case "tarik", "pakai":
			saldo -= m.Amount
		}
	}
	return saldo
}

// SisaHariBulanIni menghitung sisa hari pada bulan dari tanggal refDate (inklusif hari ini)
func SisaHariBulanIni(refDate time.Time) int {
	year, month, _ := refDate.Date()
	firstOfNextMonth := time.Date(year, month+1, 1, 0, 0, 0, 0, refDate.Location())
	lastDayOfMonth := firstOfNextMonth.AddDate(0, 0, -1).Day()
	remaining := lastDayOfMonth - refDate.Day() + 1
	if remaining < 1 {
		return 1
	}
	return remaining
}

// JatahHarian = saldoBebas / sisaHariBulanIni (termasuk hari ini); 0 jika saldoBebas <= 0
func CalculateJatahHarian(saldoBebas int64, sisaHari int) int64 {
	if saldoBebas <= 0 || sisaHari <= 0 {
		return 0
	}
	return saldoBebas / int64(sisaHari)
}

// PerluSetorPerBulan: (target - saldo) / sisaBulan (minimal 1)
// Jika target <= 0 atau saldo >= target, kembalikan 0.
// sisaBulan dihitung dari refDate ke deadline (minimal 1 bulan).
func CalculatePerluSetorPerBulan(target int64, saldo int64, deadline *time.Time, refDate time.Time) int64 {
	if target <= 0 || saldo >= target || deadline == nil {
		return 0
	}
	sisaTarget := target - saldo
	if sisaTarget <= 0 {
		return 0
	}

	// Hitung perkiraan sisa bulan
	// Minimal 1
	refDay := TruncateToDay(refDate)
	dlDay := TruncateToDay(*deadline)
	if !dlDay.After(refDay) {
		return sisaTarget
	}

	yearDiff := dlDay.Year() - refDay.Year()
	monthDiff := int(dlDay.Month()) - int(refDay.Month())
	totalMonths := yearDiff*12 + monthDiff

	// Jika masih dalam bulan yang sama atau selisih <= 0
	if totalMonths < 1 {
		totalMonths = 1
	}

	return int64(math.Ceil(float64(sisaTarget) / float64(totalMonths)))
}

// SisaHariDeadline menghitung sisa hari dari refDate ke deadline
func CalculateSisaHariDeadline(deadline *time.Time, refDate time.Time) *int {
	if deadline == nil {
		return nil
	}
	refDay := TruncateToDay(refDate)
	dlDay := TruncateToDay(*deadline)
	diff := int(dlDay.Sub(refDay).Hours() / 24)
	return &diff
}

