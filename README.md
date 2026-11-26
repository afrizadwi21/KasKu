# KasKu API (Backend REST API Keuangan Pribadi)

KasKu adalah REST API backend untuk aplikasi pencatat keuangan pribadi satu pengguna (*single-user*), berkinerja tinggi, aman, dan dirancang dengan arsitektur *clean code*. Dibangun menggunakan **Golang** dan **Fiber**, terintegrasi dengan database **PostgreSQL (Neon Serverless)**, dan siap di-deploy ke **Railway**.

---

## Daftar Isi
- [Fitur Utama](#fitur-utama)
- [Struktur Direktori](#struktur-direktori)
- [Prinsip Perhitungan & Logika Bisnis](#prinsip-perhitungan--logika-bisnis)
- [Skema Database](#skema-database)
- [Panduan Menjalankan & Migrasi](#panduan-menjalankan--migrasi)
- [Menjalankan Unit Test](#menjalankan-unit-test)
- [Dokumentasi Lengkap Endpoint & Contoh cURL](#dokumentasi-lengkap-endpoint--contoh-curl)
  - [1. Otentikasi & Health Check](#1-otentikasi--health-check)
  - [2. Transaksi](#2-transaksi)
  - [3. Dashboard & Ringkasan](#3-dashboard--ringkasan)
  - [4. Pemasukan & Barang](#4-pemasukan--barang)
  - [5. Hutang, Piutang & Kewajiban Belum Dibayar](#5-hutang-piutang--kewajiban-belum-dibayar)
  - [6. Langganan Rutin](#6-langganan-rutin)
  - [7. Tagihan Sekali Bayar](#7-tagihan-sekali-bayar)
  - [8. Pengaturan, Ekspor CSV & Meta Autocomplete](#8-pengaturan-ekspor-csv--meta-autocomplete)

---

## Fitur Utama
1. **Pencatatan Keuangan Real-Time**: Pencatatan uang masuk dan keluar dengan perhitungan saldo berjalan (*running balance*) otomatis dan akurat.
2. **Rincian Pembelian (Itemized Transactions)**: Subtotal per barang dihitung otomatis di backend (`qty × unit_price`).
3. **Pelacakan Hutang & Piutang Otomatis**: Dihitung murni dari riwayat transaksi (`Beri Pinjaman`, `Terima Bayar Hutang`, `Pinjam dari Orang`, `Bayar Hutang Saya`). Menampilkan status (*Lunas*, *Dicicil*, *Belum Dibayar*) dan persentase pelunasan.
4. **Manajemen Langganan (Subscriptions)**: Siklus mingguan, bulanan, 3-bulanan, dan tahunan dengan perhitungan penyesuaian akhir bulan (*month clamping*). Status otomatis: *Belum Dibayar*, *Segera Jatuh Tempo*, atau *Sudah Dibayar*.
5. **Tagihan Sekali Bayar (Bills)**: Pelacakan jatuh tempo dan keterlambatan (*overdue*). Fitur satu-klik bayar yang otomatis mencatat transaksi pengeluaran.
6. **Dashboard Analitik**: Hari ini (*Today*), Ringkasan Bulanan (*Summary*), Tren Harian, Perbandingan dengan Periode Sebelumnya, dan Kekayaan Bersih (*Net Worth*).
7. **Pengamanan Single-User**: Dilindungi token rahasia via header `X-Secret-Token` atau `Authorization: Bearer <TOKEN>`.
8. **Bahasa Indonesia**: Semua pesan error, validasi input, dan deskripsi status disajikan dalam Bahasa Indonesia yang baku dan informatif.

---

## Struktur Direktori
```text
KasKu/
├── cmd/
│   └── server/
│       └── main.go                  # Entry point aplikasi Fiber server
├── internal/
│   ├── calc/
│   │   ├── calc.go                  # Fungsi murni perhitungan keuangan (saldo, hutang, langganan, dsb)
│   │   └── calc_test.go             # Unit test suite untuk paket calc
│   ├── config/
│   │   └── config.go                # Manajemen konfigurasi environment
│   ├── db/
│   │   ├── db.go                    # Koneksi PostgreSQL (Neon compatible connection pool)
│   │   └── schema.go                # Skema DDL terintegrasi
│   ├── handlers/
│   │   ├── handlers.go              # Base handler & helper response
│   │   ├── routes.go                # Registrasi rute endpoint API
│   │   ├── transaction_handler.go   # CRUD Transaksi & Item
│   │   ├── dashboard_handler.go     # /today, /summary, /overview
│   │   ├── income_items_handler.go  # /income-sources, /items
│   │   ├── debt_handler.go          # /debts, /debts/:nama, /unpaid
│   │   ├── subscription_bill_handler.go # CRUD Langganan & Tagihan serta aksi pembayaran
│   │   ├── settings_meta_handler.go # Saldo awal, Ekspor CSV, Meta autocomplete, Healthz
│   │   └── validation_test.go       # HTTP unit test untuk validasi request & status code
│   └── middleware/
│       ├── auth.go                  # Middleware token otentikasi rahasia
│       └── auth_test.go             # Unit test untuk token middleware
├── migrations/
│   ├── 001_init.sql                 # Skema DDL tabel & indeks
│   └── 002_seed.sql                 # Data seed simulasi & verifikasi
├── .env.example                     # Contoh template environment variables
├── Dockerfile                       # Multi-stage production container build (Railway)
├── go.mod                           # Go dependencies
├── go.sum                           # Go checksums
└── README.md                        # Dokumentasi teknis & API reference
```

---

## Prinsip Perhitungan & Logika Bisnis
Semua perhitungan finansial bersifat deterministik, stateless, dan dikelompokkan dalam fungsi murni di `internal/calc`:
- **Saldo Total**: `opening_balance + SUM(masuk) - SUM(keluar)`
- **Saldo Akhir Hari D**: `opening_balance + SUM(masuk[date <= D]) - SUM(keluar[date <= D])`
- **Piutang per Orang**: `SUM("Beri Pinjaman") - SUM("Terima Bayar Hutang")` (berdasarkan `LOWER(TRIM(party))`)
- **Hutang Saya per Orang**: `SUM("Pinjam dari Orang") - SUM("Bayar Hutang Saya")`
- **Status Hutang/Piutang**:
  - `Lunas` jika `sisa <= 0` (Persen = 100%)
  - `Dicicil` jika ada pembayaran dan `sisa > 0`
  - `Belum Dibayar` jika belum ada pembayaran sama sekali (Persen = 0%)
- **Langganan**:
  - $n$ = jumlah transaksi pengeluaran kategori `"Langganan"` dengan `party = name`.
  - `jatuh_tempo = first_due + n × siklus`. Penambahan bulan dikunci pada hari terakhir bulan (*end-of-month clamp*, misalnya 31 Jan + 1 bulan = 28/29 Feb).
  - `sisa_hari = jatuh_tempo - hari_ini`.
  - Status: `"Belum Dibayar"` jika `sisa_hari <= 0` (dengan `telat_hari`), `"Segera Jatuh Tempo"` jika `sisa_hari <= 7`, selain itu `"Sudah Dibayar"`.
- **Kekayaan Bersih**:
  $$\text{Kekayaan Bersih} = \text{Saldo Kas} + \text{Total Piutang} - \text{Total Hutang Saya} - \text{Langganan Belum Dibayar} - \text{Tagihan Belum Dibayar}$$

---

## Skema Database
Skema database PostgreSQL (`migrations/001_init.sql`):
- `transactions`: ID (UUID PK), date (DATE), type ('masuk'/'keluar'), category (TEXT), party (TEXT), source (TEXT), note (TEXT), amount (BIGINT > 0), created_at (TIMESTAMPTZ).
  - Index: `date`, `(category, lower(party))`, `lower(source)`.
- `transaction_items`: ID (UUID PK), transaction_id (FK cascade), name (TEXT), qty (NUMERIC(10,2) > 0), unit_price (BIGINT >= 0), subtotal (BIGINT).
- `subscriptions`: ID (UUID PK), name (TEXT), amount (BIGINT), cycle ('mingguan'/'bulanan'/'3_bulanan'/'tahunan'), first_due (DATE), active (BOOLEAN).
- `bills`: ID (UUID PK), title (TEXT), amount (BIGINT), due_date (DATE), paid (BOOLEAN), paid_at (TIMESTAMPTZ), note (TEXT).
- `settings`: key (TEXT PK), value (TEXT). Data default: `opening_balance = 0`.

---

## Panduan Menjalankan & Migrasi

### 1. Salin Environment Variables
```bash
cp .env.example .env
```
Sesuaikan nilai pada file `.env`:
```ini
PORT=8080
DATABASE_URL=postgresql://user:password@ep-sample-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
SECRET_TOKEN=kasku_secret_token_change_me
ALLOWED_ORIGIN=*
```

### 2. Jalankan Migrasi Database
Server KasKu memiliki fitur **Auto-Schema Migration**, di mana tabel dan indeks akan dibuat otomatis saat server pertama kali terhubung ke database.

Jika ingin menjalankan migrasi dan data seed secara manual via `psql`:
```bash
# Eksekusi DDL Skema Awal
psql "$DATABASE_URL" -f migrations/001_init.sql

# Eksekusi Data Seed (Opsional)
psql "$DATABASE_URL" -f migrations/002_seed.sql
```

### 3. Menjalankan Server
```bash
go run cmd/server/main.go
```
Server akan aktif di `http://localhost:8080`.

---

## Menjalankan Unit Test
Semua logika bisnis dilindungi oleh unit test otomatis:
```bash
# Jalankan seluruh unit test
go test -v ./internal/...

# Jalankan test khusus logika kalkulasi
go test -v ./internal/calc/...

# Jalankan test khusus middleware autentikasi
go test -v ./internal/middleware/...

# Jalankan test khusus handler validasi
go test -v ./internal/handlers/...
```

---

## Dokumentasi Lengkap Endpoint & Contoh cURL

> **Catatan Header**:
> - Sertakan header `X-Secret-Token: kasku_secret_token_change_me` atau `Authorization: Bearer kasku_secret_token_change_me` pada setiap request ke endpoint `/api/*`.
> - Base URL lokal: `http://localhost:8080`.

### 1. Otentikasi & Health Check

#### Health Check (Publik)
```bash
curl -X GET http://localhost:8080/healthz
```
*Respons:*
```json
{
  "status": "ok"
}
```

---

### 2. Transaksi

#### Tambah Transaksi Uang Masuk
Kategori valid untuk `masuk`:
- `Jual Akun/Barang`, `Gaji/Penghasilan`, `Terima Bayar Hutang`, `Pinjam dari Orang`, `Pemasukan Lain`.

```bash
curl -X POST http://localhost:8080/api/transactions \
  -H "Content-Type: application/json" \
  -H "X-Secret-Token: kasku_secret_token_change_me" \
  -d '{
    "date": "2026-11-26",
    "type": "masuk",
    "category": "Jual Akun/Barang",
    "source": "Jual Akun MLBB",
    "note": "Penjualan akun tier Mythic",
    "amount": 99000
  }'
```

#### Tambah Transaksi Uang Keluar dengan Rincian Barang (Items)
Kategori valid untuk `keluar`:
- `Makanan & Minuman`, `Transport`, `Belanja`, `Langganan`, `Tagihan`, `Beri Pinjaman`, `Bayar Hutang Saya`, `Hiburan/Game`, `Pengeluaran Lain`.

```bash
curl -X POST http://localhost:8080/api/transactions \
  -H "Content-Type: application/json" \
  -H "X-Secret-Token: kasku_secret_token_change_me" \
  -d '{
    "date": "2026-11-26",
    "type": "keluar",
    "category": "Belanja",
    "party": "Indomaret",
    "note": "Belanja mingguan",
    "items": [
      { "name": "Beras 5kg", "qty": 1, "unit_price": 75000 },
      { "name": "Minyak Goreng 2L", "qty": 2, "unit_price": 34000 }
    ]
  }'
```
*(Backend otomatis menghitung subtotal: $1 \times 75000 + 2 \times 34000 = 143000$).*

#### Ambil Daftar Transaksi (Filter & Pagination)
Mendukung filter: `from`, `to`, `type`, `category`, `party`, `source`, `q`, `limit`, `offset`.
Tiap baris menyertakan `saldo_setelah` (saldo berjalan) dan `jumlah_item`.
```bash
curl -X GET "http://localhost:8080/api/transactions?type=keluar&limit=10&offset=0" \
  -H "X-Secret-Token: kasku_secret_token_change_me"
```

#### Ambil Transaksi Berdasarkan ID (Lengkap dengan Items)
```bash
curl -X GET http://localhost:8080/api/transactions/11111111-1111-1111-1111-111111111105 \
  -H "X-Secret-Token: kasku_secret_token_change_me"
```

#### Perbarui Transaksi (PUT)
```bash
curl -X PUT http://localhost:8080/api/transactions/11111111-1111-1111-1111-111111111105 \
  -H "Content-Type: application/json" \
  -H "X-Secret-Token: kasku_secret_token_change_me" \
  -d '{
    "date": "2026-11-26",
    "type": "keluar",
    "category": "Langganan",
    "party": "Domain",
    "note": "Perpanjangan domain tahunan",
    "amount": 3300
  }'
```

#### Hapus Transaksi (DELETE)
```bash
curl -X DELETE http://localhost:8080/api/transactions/11111111-1111-1111-1111-111111111105 \
  -H "X-Secret-Token: kasku_secret_token_change_me"
```

---

### 3. Dashboard & Ringkasan

#### Ringkasan Hari Ini (`GET /api/today`)
```bash
curl -X GET http://localhost:8080/api/today \
  -H "X-Secret-Token: kasku_secret_token_change_me"
```
*Contoh Respons:*
```json
{
  "tanggal": "2026-11-26",
  "masuk_hari_ini": 113652,
  "keluar_hari_ini": 48299,
  "jumlah_transaksi": 7,
  "saldo_awal_hari": 0,
  "saldo_sekarang": 65353,
  "selisih_hari_ini": 65353,
  "pemasukan_per_sumber_hari_ini": [
    { "sumber": "Jual Akun MLBB", "total": 99000 },
    { "sumber": "Febi", "total": 14652 }
  ],
  "transaksi": [...]
}
```

#### Ringkasan Periode / Bulanan (`GET /api/summary`)
Mendukung rentang tanggal `?from=YYYY-MM-DD&to=YYYY-MM-DD` (default bulan ini):
```bash
curl -X GET "http://localhost:8080/api/summary?from=2026-11-01&to=2026-11-30" \
  -H "X-Secret-Token: kasku_secret_token_change_me"
```
Menghasilkan:
- `total_masuk`, `total_keluar`, `selisih`
- `saldo_awal_periode` & `saldo_akhir_periode`
- `pengeluaran_per_kategori` beserta persentase
- `pemasukan_per_sumber` beserta persentase
- `barang_teratas`: 10 barang dengan total belanja terbesar
- `tren_harian`: grafik saldo dan arus kas harian
- `perbandingan`: perbandingan dengan periode sebelumnya (`selisih_rp`, `selisih_persen`)
- `rata_rata_keluar_per_hari`

#### Overview Finansial & Kekayaan Bersih (`GET /api/overview`)
```bash
curl -X GET http://localhost:8080/api/overview \
  -H "X-Secret-Token: kasku_secret_token_change_me"
```
*Contoh Respons:*
```json
{
  "saldo": 65353,
  "piutang_total": 26347,
  "hutang_saya_total": 0,
  "belum_dibayar_total": 0,
  "belum_dibayar_jumlah": 0,
  "kekayaan_bersih": 91700
}
```

---

### 4. Pemasukan & Barang

#### Sumber Pemasukan Terbesar (`GET /api/income-sources`)
```bash
curl -X GET "http://localhost:8080/api/income-sources?from=2026-11-01&to=2026-11-30" \
  -H "X-Secret-Token: kasku_secret_token_change_me"
```

#### Daftar Barang yang Pernah Dibeli (`GET /api/items`)
```bash
curl -X GET "http://localhost:8080/api/items?q=Domain" \
  -H "X-Secret-Token: kasku_secret_token_change_me"
```
*Contoh Respons:*
```json
[
  {
    "nama": "Domain",
    "total_qty": 1,
    "total_uang": 3300,
    "terakhir_dibeli": "2026-11-26",
    "harga_terakhir": 3300
  }
]
```

---

### 5. Hutang, Piutang & Kewajiban Belum Dibayar

#### Daftar Piutang & Hutang Saya (`GET /api/debts`)
```bash
curl -X GET http://localhost:8080/api/debts \
  -H "X-Secret-Token: kasku_secret_token_change_me"
```
*Contoh Respons:*
```json
{
  "piutang": [
    {
      "nama": "Febi",
      "total": 40999,
      "dibayar": 14652,
      "sisa": 26347,
      "persen": 36,
      "status": "Dicicil"
    }
  ],
  "hutang_saya": []
}
```

#### Riwayat Transaksi Hutang/Piutang Per Orang (`GET /api/debts/:nama`)
```bash
curl -X GET http://localhost:8080/api/debts/Febi \
  -H "X-Secret-Token: kasku_secret_token_change_me"
```

#### Kewajiban Belum Dibayar Paling Mendesak (`GET /api/unpaid`)
Menggabungkan piutang belum lunas, langganan jatuh tempo/belum bayar, tagihan belum bayar, dan hutang saya yang diurutkan berdasarkan keterlambatan:
```bash
curl -X GET http://localhost:8080/api/unpaid \
  -H "X-Secret-Token: kasku_secret_token_change_me"
```

---

### 6. Langganan Rutin

#### Daftar Langganan (`GET /api/subscriptions`)
```bash
curl -X GET http://localhost:8080/api/subscriptions \
  -H "X-Secret-Token: kasku_secret_token_change_me"
```

#### Tambah Langganan Baru (`POST /api/subscriptions`)
Siklus yang valid: `mingguan`, `bulanan`, `3_bulanan`, `tahunan`.
```bash
curl -X POST http://localhost:8080/api/subscriptions \
  -H "Content-Type: application/json" \
  -H "X-Secret-Token: kasku_secret_token_change_me" \
  -d '{
    "name": "Spotify Premium",
    "amount": 54990,
    "cycle": "bulanan",
    "first_due": "2026-11-26",
    "active": true
  }'
```

#### Bayar Langganan (`POST /api/subscriptions/:id/pay`)
Mencatat transaksi pengeluaran kategori `"Langganan"` secara otomatis dalam satu transaksi database:
```bash
curl -X POST http://localhost:8080/api/subscriptions/33333333-3333-3333-3333-333333333301/pay \
  -H "X-Secret-Token: kasku_secret_token_change_me"
```

#### Nonaktifkan Langganan (`DELETE /api/subscriptions/:id`)
```bash
curl -X DELETE http://localhost:8080/api/subscriptions/33333333-3333-3333-3333-333333333301 \
  -H "X-Secret-Token: kasku_secret_token_change_me"
```

---

### 7. Tagihan Sekali Bayar

#### Tambah Tagihan (`POST /api/bills`)
```bash
curl -X POST http://localhost:8080/api/bills \
  -H "Content-Type: application/json" \
  -H "X-Secret-Token: kasku_secret_token_change_me" \
  -d '{
    "title": "Listrik PLN Bulan November",
    "amount": 250000,
    "due_date": "2026-11-28",
    "note": "ID Pelanggan 538201928"
  }'
```

#### Ambil Daftar Tagihan (`GET /api/bills`)
```bash
curl -X GET http://localhost:8080/api/bills \
  -H "X-Secret-Token: kasku_secret_token_change_me"
```

#### Bayar Tagihan (`POST /api/bills/:id/pay`)
Memperbarui tagihan menjadi lunas (`paid = true`) dan membuat transaksi pengeluaran kategori `"Tagihan"` dalam satu DB transaction:
```bash
curl -X POST http://localhost:8080/api/bills/<BILL_ID>/pay \
  -H "X-Secret-Token: kasku_secret_token_change_me"
```

---

### 8. Pengaturan, Ekspor CSV & Meta Autocomplete

#### Ambil Saldo Awal (`GET /api/settings/opening-balance`)
```bash
curl -X GET http://localhost:8080/api/settings/opening-balance \
  -H "X-Secret-Token: kasku_secret_token_change_me"
```

#### Ubah Saldo Awal (`PUT /api/settings/opening-balance`)
```bash
curl -X PUT http://localhost:8080/api/settings/opening-balance \
  -H "Content-Type: application/json" \
  -H "X-Secret-Token: kasku_secret_token_change_me" \
  -d '{
    "opening_balance": 1000000
  }'
```

#### Ekspor Semua Transaksi ke CSV (`GET /api/export.csv`)
```bash
curl -X GET http://localhost:8080/api/export.csv \
  -H "X-Secret-Token: kasku_secret_token_change_me" \
  -o kasku_transaksi.csv
```

#### Data Meta Autocomplete (`GET /api/meta`)
Mengambil kategori per jenis transaksi, daftar nama pihak (*party*) unik, dan sumber (*source*) unik:
```bash
curl -X GET http://localhost:8080/api/meta \
  -H "X-Secret-Token: kasku_secret_token_change_me"
```
*Contoh Respons:*
```json
{
  "kategori": {
    "masuk": [
      "Jual Akun/Barang",
      "Gaji/Penghasilan",
      "Terima Bayar Hutang",
      "Pinjam dari Orang",
      "Pemasukan Lain"
    ],
    "keluar": [
      "Makanan & Minuman",
      "Transport",
      "Belanja",
      "Langganan",
      "Tagihan",
      "Beri Pinjaman",
      "Bayar Hutang Saya",
      "Hiburan/Game",
      "Pengeluaran Lain"
    ]
  },
  "party": ["Bu Inggit", "Domain", "Febi"],
  "source": ["Febi", "Jual Akun MLBB"]
}
```
