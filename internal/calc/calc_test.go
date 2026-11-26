package calc_test

import (
	"testing"
	"time"

	"kasku-backend/internal/calc"
)

func TestCalculateSaldo(t *testing.T) {
	// Seed data test:
	// Masuk: 99000 + 9652 + 5000 = 113652
	// Keluar: 30999 + 10000 + 4000 + 3300 = 48299
	// Saldo = 113652 - 48299 = 65353
	opening := int64(0)
	masuk := int64(99000 + 9652 + 5000)
	keluar := int64(30999 + 10000 + 4000 + 3300)

	saldo := calc.CalculateSaldo(opening, masuk, keluar)
	if saldo != 65353 {
		t.Fatalf("Ekspektasi saldo 65353, didapatkan %d", saldo)
	}
}

func TestCalculateSaldoOnDate(t *testing.T) {
	opening := int64(10000)
	d1 := time.Date(2026, 11, 24, 0, 0, 0, 0, time.UTC)
	d2 := time.Date(2026, 11, 25, 0, 0, 0, 0, time.UTC)
	d3 := time.Date(2026, 11, 26, 0, 0, 0, 0, time.UTC)

	txs := []calc.TransactionMinimal{
		{Date: d1, Type: "masuk", Amount: 50000},
		{Date: d2, Type: "keluar", Amount: 20000},
		{Date: d3, Type: "masuk", Amount: 30000},
	}

	// Saldo pada d1 (24 Nov) = 10000 + 50000 = 60000
	saldoD1 := calc.CalculateSaldoOnDate(opening, txs, d1)
	if saldoD1 != 60000 {
		t.Errorf("Ekspektasi saldo d1 60000, didapat %d", saldoD1)
	}

	// Saldo pada d2 (25 Nov) = 10000 + 50000 - 20000 = 40000
	saldoD2 := calc.CalculateSaldoOnDate(opening, txs, d2)
	if saldoD2 != 40000 {
		t.Errorf("Ekspektasi saldo d2 40000, didapat %d", saldoD2)
	}

	// Saldo pada d3 (26 Nov) = 40000 + 30000 = 70000
	saldoD3 := calc.CalculateSaldoOnDate(opening, txs, d3)
	if saldoD3 != 70000 {
		t.Errorf("Ekspektasi saldo d3 70000, didapat %d", saldoD3)
	}
}

func TestCalculateItemSubtotal(t *testing.T) {
	subtotal1 := calc.CalculateItemSubtotal(1, 3300)
	if subtotal1 != 3300 {
		t.Fatalf("Ekspektasi subtotal 3300, didapatkan %d", subtotal1)
	}

	subtotal2 := calc.CalculateItemSubtotal(2.5, 10000)
	if subtotal2 != 25000 {
		t.Fatalf("Ekspektasi subtotal 25000, didapatkan %d", subtotal2)
	}
}

func TestCalculatePiutangFebi(t *testing.T) {
	tDate := time.Date(2026, 11, 26, 0, 0, 0, 0, time.UTC)
	txs := []calc.TransactionMinimal{
		{Date: tDate, Type: "masuk", Category: "Jual Akun/Barang", Party: "", Source: "Jual Akun MLBB", Amount: 99000},
		{Date: tDate, Type: "keluar", Category: "Beri Pinjaman", Party: "Febi", Amount: 30999},
		{Date: tDate, Type: "keluar", Category: "Beri Pinjaman", Party: "Febi", Amount: 10000},
		{Date: tDate, Type: "keluar", Category: "Pengeluaran Lain", Party: "Bu Inggit", Amount: 4000},
		{Date: tDate, Type: "keluar", Category: "Langganan", Party: "Domain", Amount: 3300},
		{Date: tDate, Type: "masuk", Category: "Terima Bayar Hutang", Party: "Febi", Source: "Febi", Amount: 9652},
		{Date: tDate, Type: "masuk", Category: "Terima Bayar Hutang", Party: "Febi", Source: "Febi", Amount: 5000},
	}

	debts := calc.CalculatePiutang(txs)
	if len(debts) != 1 {
		t.Fatalf("Ekspektasi 1 orang berhutang, didapat %d", len(debts))
	}

	febi := debts[0]
	if febi.Nama != "Febi" {
		t.Errorf("Ekspektasi nama Febi, didapat %s", febi.Nama)
	}
	if febi.Total != 40999 {
		t.Errorf("Ekspektasi total pinjaman 40999, didapat %d", febi.Total)
	}
	if febi.Dibayar != 14652 {
		t.Errorf("Ekspektasi dibayar 14652, didapat %d", febi.Dibayar)
	}
	if febi.Sisa != 26347 {
		t.Errorf("Ekspektasi sisa 26347, didapat %d", febi.Sisa)
	}
	if febi.Status != "Dicicil" {
		t.Errorf("Ekspektasi status Dicicil, didapat %s", febi.Status)
	}
	if febi.Persen != 36 {
		t.Errorf("Ekspektasi persen 36, didapat %d", febi.Persen)
	}
}

func TestCalculateHutangSaya(t *testing.T) {
	tDate := time.Date(2026, 11, 26, 0, 0, 0, 0, time.UTC)
	txs := []calc.TransactionMinimal{
		{Date: tDate, Type: "masuk", Category: "Pinjam dari Orang", Party: "Budi", Amount: 100000},
		{Date: tDate, Type: "keluar", Category: "Bayar Hutang Saya", Party: "Budi", Amount: 100000},
		{Date: tDate, Type: "masuk", Category: "Pinjam dari Orang", Party: "Andi", Amount: 50000},
	}

	debts := calc.CalculateHutangSaya(txs)
	if len(debts) != 2 {
		t.Fatalf("Ekspektasi 2 data hutang, didapat %d", len(debts))
	}

	// Budi harus Lunas (100%)
	if debts[0].Status != "Lunas" || debts[0].Persen != 100 || debts[0].Sisa != 0 {
		t.Errorf("Hutang Budi harus Lunas 100%%, didapat status=%s sisa=%d", debts[0].Status, debts[0].Sisa)
	}

	// Andi harus Belum Dibayar (0%)
	if debts[1].Status != "Belum Dibayar" || debts[1].Persen != 0 || debts[1].Sisa != 50000 {
		t.Errorf("Hutang Andi harus Belum Dibayar, didapat status=%s", debts[1].Status)
	}
}

func TestCalculateSubscriptionStatus(t *testing.T) {
	today := time.Date(2026, 11, 26, 0, 0, 0, 0, time.UTC)
	firstDue := time.Date(2026, 11, 26, 0, 0, 0, 0, time.UTC)

	// Tahunan: Domain dengan 1 pembayaran (n=1) -> jatuh tempo 2027-11-26
	subDomain := calc.CalculateSubscriptionStatus(firstDue, "tahunan", 1, today)
	expectedDue := time.Date(2027, 11, 26, 0, 0, 0, 0, time.UTC)
	if !subDomain.JatuhTempo.Equal(expectedDue) {
		t.Errorf("Ekspektasi jatuh tempo %v, didapat %v", expectedDue, subDomain.JatuhTempo)
	}
	if subDomain.Status != "Sudah Dibayar" {
		t.Errorf("Ekspektasi status 'Sudah Dibayar', didapat '%s'", subDomain.Status)
	}

	// Mingguan: belum bayar (n=0) pada hari H -> Belum Dibayar, telat 0 hari
	subMingguan := calc.CalculateSubscriptionStatus(firstDue, "mingguan", 0, today)
	if subMingguan.Status != "Belum Dibayar" {
		t.Errorf("Ekspektasi Belum Dibayar, didapat %s", subMingguan.Status)
	}
	if subMingguan.TelatHari != 0 {
		t.Errorf("Ekspektasi telat 0 hari (tepat hari ini), didapat %d", subMingguan.TelatHari)
	}

	// 3_bulanan: 1x bayar (n=1) dari 2026-11-26 -> 2027-02-26
	sub3Bulan := calc.CalculateSubscriptionStatus(firstDue, "3_bulanan", 1, today)
	exp3Bulan := time.Date(2027, 2, 26, 0, 0, 0, 0, time.UTC)
	if !sub3Bulan.JatuhTempo.Equal(exp3Bulan) {
		t.Errorf("Ekspektasi 3_bulanan %v, didapat %v", exp3Bulan, sub3Bulan.JatuhTempo)
	}

	// Bulanan dengan akhir bulan (clamped)
	jan31 := time.Date(2024, 1, 31, 0, 0, 0, 0, time.UTC) // 2024 adalah tahun kabisat (Feb 29 hari)
	febClamped := calc.AddMonthsClamped(jan31, 1)
	if febClamped.Day() != 29 || febClamped.Month() != time.February {
		t.Errorf("Ekspektasi 2024-02-29, didapat %v", febClamped)
	}

	jan31NonLeap := time.Date(2023, 1, 31, 0, 0, 0, 0, time.UTC) // 2023 bukan kabisat (Feb 28 hari)
	febNonLeap := calc.AddMonthsClamped(jan31NonLeap, 1)
	if febNonLeap.Day() != 28 || febNonLeap.Month() != time.February {
		t.Errorf("Ekspektasi 2023-02-28, didapat %v", febNonLeap)
	}
}

func TestCalculateBillStatus(t *testing.T) {
	today := time.Date(2026, 11, 26, 0, 0, 0, 0, time.UTC)

	// Kasus 1: Sudah dibayar
	s1 := calc.CalculateBillStatus(true, today, today)
	if s1.Status != "Sudah Dibayar" {
		t.Errorf("Ekspektasi 'Sudah Dibayar', didapat '%s'", s1.Status)
	}

	// Kasus 2: Belum dibayar, jatuh tempo besok (27 Nov)
	besok := today.AddDate(0, 0, 1)
	s2 := calc.CalculateBillStatus(false, besok, today)
	if s2.Status != "Belum Dibayar" {
		t.Errorf("Ekspektasi 'Belum Dibayar', didapat '%s'", s2.Status)
	}

	// Kasus 3: Terlambat, jatuh tempo kemarin (25 Nov) -> telat 1 hari
	kemarin := today.AddDate(0, 0, -1)
	s3 := calc.CalculateBillStatus(false, kemarin, today)
	if s3.Status != "Terlambat" || s3.TelatHari != 1 {
		t.Errorf("Ekspektasi 'Terlambat' 1 hari, didapat status='%s' telat=%d", s3.Status, s3.TelatHari)
	}
}

func TestCalculateKekayaanBersih(t *testing.T) {
	// Saldo: 65353
	// Piutang Febi: 26347
	// Hutang Saya: 10000
	// Langganan Belum Dibayar: 5000
	// Tagihan Belum Dibayar: 20000
	// Kekayaan Bersih = 65353 + 26347 - 10000 - 5000 - 20000 = 56700
	kb := calc.CalculateKekayaanBersih(65353, 26347, 10000, 5000, 20000)
	if kb != 56700 {
		t.Errorf("Ekspektasi kekayaan bersih 56700, didapat %d", kb)
	}
}

func TestCalculateIncomeBySource(t *testing.T) {
	tDate := time.Date(2026, 11, 26, 0, 0, 0, 0, time.UTC)
	txs := []calc.TransactionMinimal{
		{Date: tDate, Type: "masuk", Category: "Jual Akun/Barang", Party: "", Source: "Jual Akun MLBB", Amount: 99000},
		{Date: tDate, Type: "masuk", Category: "Terima Bayar Hutang", Party: "Febi", Source: "Febi", Amount: 9652},
		{Date: tDate, Type: "masuk", Category: "Terima Bayar Hutang", Party: "Febi", Source: "Febi", Amount: 5000},
	}

	sources := calc.CalculateIncomeBySource(txs)
	if len(sources) != 2 {
		t.Fatalf("Ekspektasi 2 sumber pemasukan, didapat %d", len(sources))
	}

	// Sumber 1: Jual Akun MLBB = 99000
	if sources[0].Sumber != "Jual Akun MLBB" || sources[0].Total != 99000 {
		t.Errorf("Sumber 1 salah: %+v", sources[0])
	}

	// Sumber 2: Febi = 9652 + 5000 = 14652
	if sources[1].Sumber != "Febi" || sources[1].Total != 14652 || sources[1].JumlahTransaksi != 2 {
		t.Errorf("Sumber 2 salah: %+v", sources[1])
	}
}

func TestCategoryValidation(t *testing.T) {
	if !calc.IsValidCategory("masuk", "Jual Akun/Barang") {
		t.Error("Jual Akun/Barang harus valid untuk masuk")
	}
	if calc.IsValidCategory("masuk", "Makanan & Minuman") {
		t.Error("Makanan & Minuman tidak boleh valid untuk masuk")
	}
	if !calc.IsValidCategory("keluar", "Makanan & Minuman") {
		t.Error("Makanan & Minuman harus valid untuk keluar")
	}
}
