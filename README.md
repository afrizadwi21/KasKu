# KasKu API (Multi-User REST API Keuangan Pribadi)

KasKu adalah REST API backend untuk aplikasi pencatat keuangan pribadi multi-pengguna (*multi-tenant*), berkinerja tinggi, aman, dan dirancang dengan arsitektur *clean code*. Setiap pengguna memiliki isolasi data penuh: hanya dapat melihat, menambah, mengubah, dan menghapus datanya sendiri.

Dibangun menggunakan **Golang** dan **Fiber**, terintegrasi dengan database **PostgreSQL (Neon Serverless)**, diamankan dengan **JWT (HS256)** dan **Bcrypt (cost 12)**, serta siap di-deploy ke **Railway**.

---

## Daftar Isi
- [Fitur Utama](#fitur-utama)
- [Arsitektur & Keamanan Multi-User](#arsitektur--keamanan-multi-user)
- [Struktur Direktori](#struktur-direktori)
- [Konfigurasi Environment](#konfigurasi-environment)
- [Panduan Migrasi Database](#panduan-migrasi-database)
- [Menjalankan Unit Test](#menjalankan-unit-test)
- [Dokumentasi Endpoint & Contoh cURL](#dokumentasi-endpoint--contoh-curl)
  - [1. Autentikasi Publik (`/auth/*`)](#1-autentikasi-publik-auth)
  - [2. Akun Pengguna (`/api/me/*`)](#2-akun-pengguna-apime)
  - [3. Transaksi & Pembelian Item](#3-transaksi--pembelian-item)
  - [4. Dashboard & Ringkasan](#4-dashboard--ringkasan)
  - [5. Pemasukan & Barang](#5-pemasukan--barang)
  - [6. Hutang & Piutang](#6-hutang--piutang)
  - [7. Langganan Rutin](#7-langganan-rutin)
  - [8. Tagihan Sekali Bayar](#8-tagihan-sekali-bayar)
  - [9. Pos Tabungan / Uang Disisihkan (`/api/savings/*`)](#9-pos-tabungan--uang-disisihkan-apisavings)
  - [10. Wishlist & Simulasi Beli (`/api/wishlist/*`)](#10-wishlist--simulasi-beli-apiwishlist)
  - [11. Pengaturan, Ekspor CSV & Meta Autocomplete](#11-pengaturan-ekspor-csv--meta-autocomplete)

---

## Fitur Utama
1. **Multi-User dengan Isolasi Data Penuh**: Setiap pengguna hanya dapat mengakses dan memodifikasi data miliknya sendiri. Akses ke resource milik pengguna lain menghasilkan status **404 Not Found**.
2. **Autentikasi Modern (JWT + Refresh Token)**:
   - Access Token: JWT bertanda tangan HS256, masa aktif 15 menit (`ACCESS_TTL`).
   - Refresh Token: Masa aktif 30 hari (`REFRESH_TTL`), disimpan dalam bentuk hash SHA-256 di database dan mendukung rotasi otomatis (*rotation*) serta deteksi penyalahgunaan (*reuse detection*).
3. **Penyimpanan Password Aman**: Menggunakan algoritma **Bcrypt** (cost 12) dengan mitigasi serangan berbasis waktu (*timing attack mitigation*).
4. **Pencatatan Keuangan Real-Time**: Pencatatan uang masuk dan keluar dengan perhitungan saldo berjalan (*running balance*) otomatis per pengguna.
5. **Rincian Pembelian (Itemized Transactions)**: Subtotal per barang dihitung otomatis di backend (`qty × unit_price`).
6. **Pelacakan Hutang & Piutang Otomatis**: Dihitung murni dari transaksi (`Beri Pinjaman`, `Terima Bayar Hutang`, `Pinjam dari Orang`, `Bayar Hutang Saya`). Menampilkan status (*Lunas*, *Dicicil*, *Belum Dibayar*) dan persentase pelunasan.
7. **Manajemen Langganan (Subscriptions)**: Siklus mingguan, bulanan, 3-bulanan, dan tahunan dengan penyesuaian akhir bulan (*month clamping*). Status otomatis: *Belum Dibayar*, *Segera Jatuh Tempo*, atau *Sudah Dibayar*.
8. **Tagihan Sekali Bayar (Bills)**: Pelacakan jatuh tempo dan keterlambatan (*overdue*). Fitur satu-klik bayar yang otomatis mencatat transaksi pengeluaran.
9. **Dashboard Analitik**: Hari ini (*Today*), Ringkasan Bulanan (*Summary*), Tren Harian, Perbandingan dengan Periode Sebelumnya, dan Kekayaan Bersih (*Net Worth*).
10. **Rate Limiting & Security Headers**: Proteksi *brute force* login (maks 5 percobaan gagal per 15 menit per IP + email), pembatasan registrasi (maks 10 per jam per IP), serta header keamanan (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`).
11. **Bahasa Indonesia**: Semua pesan error, validasi input, dan deskripsi status disajikan dalam format JSON berbahasa Indonesia: `{"error": "pesan"}`.

---

## Arsitektur & Keamanan Multi-User
- **Token Injection via Context**: Middleware `JWTAuth` memvalidasi Bearer token dan menyematkan `user_id` ke dalam request context (`c.Locals("userID")`).
- **Pencegahan Parameter Spoofing**: Handler **tidak pernah** membaca `user_id` dari query string atau request body. Seluruh query SQL secara mutlak menggunakan `user_id` dari token context terverifikasi.
- **Join Verification pada Item**: Tabel `transaction_items` selalu diverifikasi melalui `JOIN transactions ON transaction_items.transaction_id = transactions.id WHERE transactions.user_id = $userId`.
- **Token Reuse Detection**: Jika refresh token yang sudah dicabut digunakan kembali, sistem secara otomatis mencabut **seluruh** sesi login aktif milik pengguna tersebut demi keamanan.

---

## Struktur Direktori
```text
KasKu/
├── cmd/server/main.go               # Entry point Fiber server & graceful shutdown
├── internal/
│   ├── auth/
│   │   ├── auth.go                  # Hashing bcrypt, JWT generator & validasi password
│   │   ├── auth_test.go             # Unit test paket auth (100% PASS)
│   │   └── limiter.go               # In-memory thread-safe rate limiter
│   ├── calc/
│   │   ├── calc.go                  # Fungsi murni perhitungan keuangan (saldo, hutang, langganan, dsb)
│   │   └── calc_test.go             # Unit test paket calc (100% PASS)
│   ├── config/
│   │   └── config.go                # Manajemen konfigurasi environment & validasi JWT_SECRET
│   ├── db/
│   │   ├── db.go                    # Koneksi PostgreSQL (connection pool Neon)
│   │   └── schema.go                # Skema DDL terintegrasi
│   ├── handlers/
│   │   ├── handlers.go              # Base handler & helper response
│   │   ├── routes.go                # Pendaftaran seluruh rute API & middleware
│   │   ├── auth_handler.go          # Register, Login, Refresh Token, Logout
│   │   ├── account_handler.go       # /api/me CRUD, ganti password, logout-all, hapus akun
│   │   ├── transaction_handler.go   # CRUD transaksi & rincian item (DB transaction)
│   │   ├── dashboard_handler.go     # /today, /summary, /overview
│   │   ├── income_items_handler.go  # /income-sources, /items
│   │   ├── debt_handler.go          # /debts, /debts/:nama, /unpaid
│   │   ├── subscription_bill_handler.go # CRUD langganan & tagihan serta aksi pembayaran
│   │   ├── settings_meta_handler.go # Saldo awal, Ekspor CSV, Meta autocomplete, Healthz
│   │   ├── auth_test.go             # Integration test auth flow & isolasi multi-user (100% PASS)
│   │   └── validation_test.go       # HTTP unit test untuk validasi request payload
│   └── middleware/
│       ├── auth.go                  # Middleware JWTAuth & SecurityHeaders
│       └── auth_test.go             # Unit test JWTAuth & SecurityHeaders (100% PASS)
├── migrations/
│   ├── 001_init.sql                 # Skema DDL tabel & indeks awal
│   ├── 002_seed.sql                 # Fungsi SQL seed data per user (seed_user_data)
│   └── 003_auth.sql                 # Skema migrasi multi-user auth & refresh tokens
├── .env.example                     # Contoh template environment variables
├── Dockerfile                       # Multi-stage production container build (Railway)
├── go.mod                           # Go dependencies
├── go.sum                           # Go checksums
└── README.md                        # Dokumentasi teknis & API reference
```

---

## Konfigurasi Environment

Salin file `.env.example` ke `.env`:
```bash
cp .env.example .env
```

Isi dan sesuaikan variabel konfigurasi berikut:
```ini
PORT=8080
DATABASE_URL=postgresql://user:password@ep-sample-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
JWT_SECRET=kasku_jwt_secret_key_minimum_32_characters_random_string_here_12345
ALLOW_REGISTRATION=true
ACCESS_TTL=15m
REFRESH_TTL=720h
ALLOWED_ORIGIN=*
```

### 1. Cara Menghasilkan JWT_SECRET Aman
`JWT_SECRET` wajib memiliki panjang **minimal 32 karakter**. Jika kosong atau kurang dari 32 karakter, server akan menolak untuk start.

Gunakan perintah OpenSSL berikut untuk menghasilkan secret yang aman:
```bash
openssl rand -base64 48
```
Salin output yang dihasilkan ke variabel `JWT_SECRET` di file `.env` atau Dashboard Environment Railway.

### 2. Cara Menutup Registrasi Publik
Setelah akun Anda berhasil dibuat, Anda dapat menutup fitur registrasi agar orang lain tidak dapat mendaftar:
```ini
ALLOW_REGISTRATION=false
```
Jika ada request ke `POST /auth/register` saat `ALLOW_REGISTRATION=false`, server akan mengembalikan respon **403 Forbidden**:
```json
{
  "error": "Registrasi ditutup"
}
```

---

## Panduan Migrasi Database

Server KasKu secara otomatis menjalankan inisialisasi skema saat pertama kali terhubung ke database.

Jika ingin menjalankan migrasi secara manual via `psql`:
```bash
psql "$DATABASE_URL" -f migrations/001_init.sql
psql "$DATABASE_URL" -f migrations/003_auth.sql

# Mengisi data simulasi untuk user tertentu:
psql "$DATABASE_URL" -c "SELECT seed_user_data('nama@email.com');"
```

---

## Menjalankan Unit Test

Seluruh alur autentikasi, isolasi data multi-user, dan logika finansial dilindungi oleh unit & integration test otomatis:
```bash
# Jalankan seluruh unit dan integration test
go test -v ./internal/...

# Uji paket auth (password bcrypt, validasi, jwt, rate limiter)
go test -v ./internal/auth/...

# Uji handler auth & isolasi antar pengguna
go test -v ./internal/handlers/...

# Uji middleware JWT & security headers
go test -v ./internal/middleware/...

# Uji rumus kalkulasi finansial
go test -v ./internal/calc/...
```

---

## Dokumentasi Endpoint & Contoh cURL

Base URL lokal: `http://localhost:8080`

### 1. Autentikasi Publik (`/auth/*`)

#### A. Registrasi Pengguna Baru (`POST /auth/register`)
- Validasi: `email` valid & belum terdaftar, `password` minimal 8 karakter (kombinasi huruf dan angka), `name` tidak boleh kosong.
- Langsung mengembalikan `access_token` dan `refresh_token`.

```bash
curl -X POST http://localhost:8080/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Afriza",
    "email": "afriza@example.com",
    "password": "Password123"
  }'
```
*Respons Sukses (201 Created):*
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "a1b2c3d4e5f6...",
  "expires_in": 900,
  "user": {
    "id": "e4b3c2a1-0000-0000-0000-000000000001",
    "name": "Afriza",
    "email": "afriza@example.com"
  }
}
```

#### B. Login (`POST /auth/login`)
- Rate limit: maksimal 5 percobaan gagal per 15 menit per kombinasi IP + email.
- Pesan error identik jika email tidak ditemukan atau password salah (*timing attack mitigation*): `"Email atau password salah"`.

```bash
curl -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "afriza@example.com",
    "password": "Password123"
  }'
```

#### C. Refresh Token (`POST /auth/refresh`)
- Rotasi token: me-revoke refresh token lama dan menerbitkan pasangan access token + refresh token baru.
- Jika refresh token yang sudah dicabut digunakan kembali, sistem mencabut semua token aktif milik user tersebut.

```bash
curl -X POST http://localhost:8080/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "a1b2c3d4e5f6..."
  }'
```

#### D. Logout (`POST /auth/logout`)
- Mencabut refresh token yang dikirimkan.

```bash
curl -X POST http://localhost:8080/auth/logout \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "a1b2c3d4e5f6..."
  }'
```

---

### 2. Akun Pengguna (`/api/me/*`)
> Seluruh endpoint di bawah ini wajib menyertakan header:
> `Authorization: Bearer <access_token>`

#### Ambil Profil Saya (`GET /api/me`)
```bash
curl -X GET http://localhost:8080/api/me \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

#### Perbarui Nama Profil (`PUT /api/me`)
```bash
curl -X PUT http://localhost:8080/api/me \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -d '{
    "name": "Afriza Dwi"
  }'
```

#### Ganti Password (`PUT /api/me/password`)
- Memvalidasi password lama, memeriksa kekuatan password baru, dan mencabut semua sesi refresh token aktif.

```bash
curl -X PUT http://localhost:8080/api/me/password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -d '{
    "old_password": "Password123",
    "new_password": "PasswordBaru456"
  }'
```

#### Logout dari Semua Perangkat (`POST /api/me/logout-all`)
```bash
curl -X POST http://localhost:8080/api/me/logout-all \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

#### Hapus Akun Permanen (`DELETE /api/me`)
- Memvalidasi password akun. Menghapus akun dan seluruh transaksi, item, tagihan, dan langganan secara cascade.

```bash
curl -X DELETE http://localhost:8080/api/me \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -d '{
    "password": "PasswordBaru456"
  }'
```

---

### 3. Transaksi & Pembelian Item

#### Tambah Transaksi Masuk
```bash
curl -X POST http://localhost:8080/api/transactions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -d '{
    "date": "2026-11-26",
    "type": "masuk",
    "category": "Jual Akun/Barang",
    "source": "Jual Akun MLBB",
    "note": "Penjualan akun Mythic",
    "amount": 99000
  }'
```

#### Tambah Transaksi Keluar dengan Rincian Item (Items)
```bash
curl -X POST http://localhost:8080/api/transactions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -d '{
    "date": "2026-11-26",
    "type": "keluar",
    "category": "Belanja",
    "party": "Indomaret",
    "items": [
      { "name": "Beras 5kg", "qty": 1, "unit_price": 75000 },
      { "name": "Minyak Goreng 2L", "qty": 2, "unit_price": 34000 }
    ]
  }'
```

#### Ambil Daftar Transaksi
```bash
curl -X GET "http://localhost:8080/api/transactions?limit=10&offset=0" \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

#### Ambil Transaksi Berdasarkan ID
```bash
curl -X GET http://localhost:8080/api/transactions/<TRANSACTION_ID> \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

#### Perbarui Transaksi (PUT)
```bash
curl -X PUT http://localhost:8080/api/transactions/<TRANSACTION_ID> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -d '{
    "date": "2026-11-26",
    "type": "keluar",
    "category": "Makanan & Minuman",
    "amount": 25000,
    "note": "Makan siang"
  }'
```

#### Hapus Transaksi (DELETE)
```bash
curl -X DELETE http://localhost:8080/api/transactions/<TRANSACTION_ID> \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

---

### 4. Dashboard & Ringkasan

#### Ringkasan Hari Ini (`GET /api/today`)
```bash
curl -X GET http://localhost:8080/api/today \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

#### Ringkasan Periode / Bulanan (`GET /api/summary`)
```bash
curl -X GET "http://localhost:8080/api/summary?from=2026-11-01&to=2026-11-30" \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

#### Overview Finansial & Kekayaan Bersih (`GET /api/overview`)
```bash
curl -X GET http://localhost:8080/api/overview \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

---

### 5. Pemasukan & Barang

#### Sumber Pemasukan Terbesar (`GET /api/income-sources`)
```bash
curl -X GET "http://localhost:8080/api/income-sources?from=2026-11-01&to=2026-11-30" \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

#### Daftar Barang yang Pernah Dibeli (`GET /api/items`)
```bash
curl -X GET "http://localhost:8080/api/items?q=Beras" \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

---

### 6. Hutang & Piutang

#### Daftar Piutang & Hutang Saya (`GET /api/debts`)
```bash
curl -X GET http://localhost:8080/api/debts \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

#### Riwayat Transaksi Orang Tertentu (`GET /api/debts/:nama`)
```bash
curl -X GET http://localhost:8080/api/debts/Febi \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

#### Kewajiban Belum Dibayar Paling Mendesak (`GET /api/unpaid`)
```bash
curl -X GET http://localhost:8080/api/unpaid \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

---

### 7. Langganan Rutin

#### Daftar Langganan (`GET /api/subscriptions`)
```bash
curl -X GET http://localhost:8080/api/subscriptions \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

#### Tambah Langganan Baru (`POST /api/subscriptions`)
Siklus: `mingguan`, `bulanan`, `3_bulanan`, `tahunan`.
```bash
curl -X POST http://localhost:8080/api/subscriptions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -d '{
    "name": "Spotify Premium",
    "amount": 54990,
    "cycle": "bulanan",
    "first_due": "2026-11-26",
    "active": true
  }'
```

#### Bayar Langganan (`POST /api/subscriptions/:id/pay`)
```bash
curl -X POST http://localhost:8080/api/subscriptions/<SUBSCRIPTION_ID>/pay \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

#### Nonaktifkan Langganan (`DELETE /api/subscriptions/:id`)
```bash
curl -X DELETE http://localhost:8080/api/subscriptions/<SUBSCRIPTION_ID> \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

---

### 8. Tagihan Sekali Bayar

#### Tambah Tagihan (`POST /api/bills`)
```bash
curl -X POST http://localhost:8080/api/bills \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -d '{
    "title": "Tagihan Listrik PLN",
    "amount": 250000,
    "due_date": "2026-11-28",
    "note": "ID Pelanggan 123456789"
  }'
```

#### Bayar Tagihan (`POST /api/bills/:id/pay`)
```bash
curl -X POST http://localhost:8080/api/bills/<BILL_ID>/pay \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

---

### 9. Pos Tabungan / Uang Disisihkan (`/api/savings/*`)

Fitur Pos Tabungan memungkinkan pengguna menyisihkan uang untuk tujuan tertentu (misal: "Dana Darurat", "Beli HP", "Liburan").

#### Konsep Saldo Total vs Saldo Bebas:
- **`saldo_total`**: Total seluruh uang fisik/rekening Anda (`opening_balance + sum(masuk) - sum(keluar)`). Menyisihkan uang **TIDAK** mengubah saldo total.
- **`total_tersimpan`**: Jumlah akumulasi saldo di seluruh pos tabungan aktif (`sum(setor) - sum(tarik) - sum(pakai)`).
- **`saldo_bebas`**: `saldo_total - total_tersimpan`. Inilah uang bebas / uang jajan yang aman dibelanjakan.
- **`jatah_harian`**: `saldo_bebas / sisa_hari_bulan_ini` (termasuk hari ini).
- Menyisihkan atau menarik uang dari tabungan adalah **perpindahan internal**, disimpan pada tabel `savings_movements` (bukan di `transactions`), sehingga laporan arus kas pemasukan dan pengeluaran tetap bersih.

#### Alur Contoh Penggunaan:
1. **Buat Pos Baru**: misal "Dana Darurat" dengan target Rp 1.000.000.
2. **Setor Uang**: Setor Rp 20.000 dari saldo bebas ke pos tersebut -> `saldo_total` tetap, `total_tersimpan` jadi 20.000, `saldo_bebas` berkurang 20.000.
3. **Lihat Overview / Today**: Cek jatah harian dan saldo bebas saat ini.
4. **Tarik atau Belanja (Spend)**: Uang tabungan dapat ditarik kembali ke saldo bebas atau langsung dibelanjakan untuk kategori pengeluaran tertentu.

#### Daftar Semua Pos Tabungan (`GET /api/savings`)
```bash
curl -X GET http://localhost:8080/api/savings \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

#### Buat Pos Tabungan Baru (`POST /api/savings`)
```bash
curl -X POST http://localhost:8080/api/savings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -d '{
    "name": "Dana Darurat",
    "target_amount": 1000000,
    "deadline": "2027-11-26",
    "note": "Cadangan biaya tak terduga"
  }'
```

#### Detail Pos & Riwayat Mutasi (`GET /api/savings/:id`)
```bash
curl -X GET http://localhost:8080/api/savings/<POT_ID> \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

#### Ubah Detail Pos Tabungan (`PUT /api/savings/:id`)
```bash
curl -X PUT http://localhost:8080/api/savings/<POT_ID> \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -d '{
    "name": "Dana Darurat & Medis",
    "target_amount": 1500000,
    "deadline": "2027-12-31",
    "note": "Diperbarui untuk proteksi keluarga"
  }'
```

#### Setor ke Pos Tabungan (`POST /api/savings/:id/deposit`)
> Mengurangi `saldo_bebas`, menambah saldo pos. Ditolak jika `amount > saldo_bebas`.
```bash
curl -X POST http://localhost:8080/api/savings/<POT_ID>/deposit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -d '{
    "amount": 20000,
    "date": "2026-11-26",
    "note": "Setoran awal"
  }'
```

#### Tarik Kembali ke Saldo Bebas (`POST /api/savings/:id/withdraw`)
> Menambah `saldo_bebas`, mengurangi saldo pos. Ditolak jika `amount > saldo_pos`.
```bash
curl -X POST http://localhost:8080/api/savings/<POT_ID>/withdraw \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -d '{
    "amount": 5000,
    "date": "2026-11-26",
    "note": "Tarik untuk keperluan mendesak"
  }'
```

#### Pakai Uang Tabungan untuk Belanja (`POST /api/savings/:id/spend`)
> Membuat transaksi pengeluaran dan mencatat mutasi `pakai`. Mengurangi `saldo_total` dan `saldo_pos`. `saldo_bebas` tidak berubah.
```bash
curl -X POST http://localhost:8080/api/savings/<POT_ID>/spend \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -d '{
    "amount": 8000,
    "date": "2026-11-26",
    "category": "Pengeluaran Lain",
    "party": "Apotek Sehat",
    "note": "Beli obat darurat",
    "items": [
      { "name": "Vitamin C", "qty": 1, "unit_price": 8000 }
    ]
  }'
```

#### Tutup & Arsipkan Pos Tabungan (`POST /api/savings/:id/close`)
> Mengembalikan seluruh sisa saldo pos otomatis ke `saldo_bebas` dan mengubah status `archived = true`.
```bash
curl -X POST http://localhost:8080/api/savings/<POT_ID>/close \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

#### Hapus Pos Tabungan Permanen (`DELETE /api/savings/:id`)
> Hanya diperbolehkan jika pos bersaldo 0 dan belum pernah memiliki riwayat mutasi. Jika sudah ada riwayat, API mengembalikan status 409 dengan anjuran menggunakan `/close`.
```bash
curl -X DELETE http://localhost:8080/api/savings/<POT_ID> \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

#### Batalkan Mutasi Tabungan (`DELETE /api/savings/movements/:id`)
> Membatalkan setor/tarik. Jika membatalkan mutasi `pakai`, transaksi belanja keluar yang terkait akan otomatis ikut terhapus secara atomik.
```bash
curl -X DELETE http://localhost:8080/api/savings/movements/<MOVEMENT_ID> \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

#### Riwayat Semua Mutasi Tabungan (`GET /api/savings/movements`)
```bash
curl -X GET "http://localhost:8080/api/savings/movements?pot_id=<POT_ID>&from=2026-11-01&to=2026-11-30" \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

#### Ekspor Mutasi Tabungan ke CSV (`GET /api/export-savings.csv`)
```bash
curl -X GET http://localhost:8080/api/export-savings.csv \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -o mutasi_tabungan_kasku.csv
```

---

### 10. Wishlist & Simulasi Beli (`/api/wishlist/*`)

Fitur Wishlist memungkinkan pengguna mencatat daftar barang impian yang ingin dibeli, dilengkapi dengan **fitur Simulasi (Preview)** untuk melihat dampak finansial sebelum benar-benar membelinya.

#### Konsep Wishlist & Simulasi:
- **Hanya Keinginan**: Menambah item wishlist **TIDAK** mengubah saldo dan **TIDAK** membuat transaksi di awal.
- **Simulasi Bebas Efek Samping**: Endpoint `/preview` melakukan kalkulasi murni di memori tanpa mengubah atau menyimpan data apapun ke database.
- **Sumber Dana**:
  - `bebas`: Memotong langsung dari saldo bebas (`saldo_total` turun, `saldo_bebas` turun, tabungan tetap).
  - `pos`: Memotong dari pos tabungan khusus (`saldo_total` turun, `total_tersimpan` turun, `saldo_bebas` tetap).
- **Pembelian Nyata (`/buy`)**:
  - Otomatis mencatat 1 baris transaksi keluar di tabel `transactions`.
  - Otomatis mencatat 1 baris rincian di tabel `transaction_items` (`qty: 1, unit_price: harga`).
  - Menandai status wishlist menjadi `dibeli`.
- **Undo Pembelian (`/undo-buy`)**: Membatalkan pembelian, menghapus transaksi keluar (dan mutasi tabungan terkait), serta mengembalikan status wishlist menjadi `aktif`.

#### Alur Contoh Penggunaan:
1. **Tambah Barang**: Tambah barang "Headset" seharga Rp 30.000 (prioritas sedang).
2. **Lihat Preview**: Panggil `GET /api/wishlist/:id/preview?sumber=bebas`. Backend menghitung:
   - "Jika membeli Headset, saldo kamu akan tersisa Rp 35.353 (saldo jajan Rp 15.353)."
   - Cek keamanan apakah sisa saldo jajan cukup untuk melunasi tagihan/langganan yang jatuh tempo dalam 7 hari.
3. **Beli Barang**: Panggil `POST /api/wishlist/:id/buy`. Transaksi keluar resmi tercatat, rincian barang tersimpan.
4. **Cek Rencana Beli (Plan)**: Panggil `GET /api/wishlist/plan` untuk melihat urutan barang aktif yang masih terjangkau berdasarkan saldo bebas saat ini.

#### Daftar Semua Item Wishlist (`GET /api/wishlist?status=aktif`)
```bash
curl -X GET "http://localhost:8080/api/wishlist?status=aktif" \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

#### Tambah Item Wishlist Baru (`POST /api/wishlist`)
```bash
curl -X POST http://localhost:8080/api/wishlist \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -d '{
    "name": "Headset",
    "price": 30000,
    "priority": "sedang",
    "category": "Belanja",
    "target_date": "2026-12-15",
    "note": "Headset kerja"
  }'
```

#### Simulasi Preview Item Wishlist (`GET /api/wishlist/:id/preview`)
```bash
curl -X GET "http://localhost:8080/api/wishlist/<WISHLIST_ID>/preview?sumber=bebas" \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

#### Simulasi Harga Sembarang / Bebas (`POST /api/wishlist/preview`)
```bash
curl -X POST http://localhost:8080/api/wishlist/preview \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -d '{
    "harga": 50000,
    "sumber": "bebas"
  }'
```

#### Beli Item Wishlist (`POST /api/wishlist/:id/buy`)
```bash
curl -X POST http://localhost:8080/api/wishlist/<WISHLIST_ID>/buy \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -d '{
    "sumber": "bebas",
    "party": "Toko Audio",
    "note": "Beli Headset kerja"
  }'
```

#### Ambil Metadata Otomatis dari Link Produk (`POST /api/wishlist/fetch-link`)
> Mencoba mengekstrak nama, harga, dan foto dari link e-commerce (Shopee, Tokopedia, Lazada, dll). Jika marketplace memblokir bot / JavaScript-only (seperti Shopee), API mengembalikan `ok: false` dengan pesan ramah agar pengguna dapat mengisi formulir secara manual.
```bash
curl -X POST http://localhost:8080/api/wishlist/fetch-link \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -d '{
    "url": "https://www.tokopedia.com/audio/headset-gaming"
  }'
```

#### Unggah Foto Wishlist Manual (`POST /api/wishlist/images`)
> Mengunggah file gambar (JPEG/PNG/WebP, maks 5 MB). Gambar otomatis diperkecil ke resolusi maksimal 800px dan EXIF metadata dibuang demi privasi dan efisiensi penyimpanan database PostgreSQL.
```bash
curl -X POST http://localhost:8080/api/wishlist/images \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -F "file=@/path/to/gambar_produk.jpg"
```

#### Simpan Foto dari URL Kandidat (`POST /api/wishlist/images/from-url`)
> Server mengunduh foto dari URL kandidat (hasil `fetch-link`), memprosesnya, dan menyimpannya secara aman dengan proteksi anti-SSRF.
```bash
curl -X POST http://localhost:8080/api/wishlist/images/from-url \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -d '{
    "url": "https://images.tokopedia.net/img/dummy.jpg"
  }'
```

#### Akses Foto Publik Bertanda Tangan (`GET /img/wishlist/:image_id?exp=&sig=`)
> Dapat langsung disematkan pada tag `<img src="...">` di frontend tanpa header Authorization. Signature berlaku selama 1 jam.
```bash
curl -X GET "http://localhost:8080/img/wishlist/<IMAGE_ID>?exp=1700000000&sig=abcdef123456..." \
  -o foto_wishlist.jpg
```

#### Hapus Foto Wishlist (`DELETE /api/wishlist/images/:image_id`)
```bash
curl -X DELETE http://localhost:8080/api/wishlist/images/<IMAGE_ID> \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

#### Batalkan Pembelian Wishlist (`POST /api/wishlist/:id/undo-buy`)
```bash
curl -X POST http://localhost:8080/api/wishlist/<WISHLIST_ID>/undo-buy \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

#### Rencana Pembelian Wishlist (`GET /api/wishlist/plan`)
```bash
curl -X GET http://localhost:8080/api/wishlist/plan \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

---

### 11. Pengaturan, Ekspor CSV & Meta Autocomplete

#### Ambil Saldo Awal Pengguna (`GET /api/settings/opening-balance`)
```bash
curl -X GET http://localhost:8080/api/settings/opening-balance \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

#### Ubah Saldo Awal Pengguna (`PUT /api/settings/opening-balance`)
```bash
curl -X PUT http://localhost:8080/api/settings/opening-balance \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -d '{
    "opening_balance": 500000
  }'
```

#### Ekspor Semua Transaksi Saya ke CSV (`GET /api/export.csv`)
```bash
curl -X GET http://localhost:8080/api/export.csv \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -o transaksi_kasku.csv
```

#### Meta Autocomplete (`GET /api/meta`)
```bash
curl -X GET http://localhost:8080/api/meta \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```
