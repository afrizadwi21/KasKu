# PRODUCT.md — KasKu Product Context

## 1. Product Overview
**KasKu** adalah aplikasi manajemen keuangan pribadi (*personal finance tracker*) multi-pengguna yang berfokus pada kecepatan pencatatan, transparansi arus kas, dan akurasi finansial. Berbeda dengan aplikasi keuangan umum yang rumit dan penuh iklan, KasKu menawarkan pengalaman pencatatan yang tenang, deterministik, dan langsung ke inti kebutuhan: kas masuk/keluar, pelacakan piutang/hutang otomatis, pengingat langganan, tagihan jatuh tempo, dan kalkulasi kekayaan bersih (*Net Worth*).

---

## 2. Target Users
- **Profesional Muda, Freelancer, & Kreator Digital**: Memiliki arus kas harian dinamis dari berbagai sumber (gaji, klien freelance, penjualan digital/akun, komisi), serta sering berurusan dengan piutang teman atau biaya langganan software.
- **Individu Disiplin Finansial**: Pengguna yang menginginkan visibilitas total atas uang masuk, uang keluar, sisa hutang piutang, dan kekayaan bersih tanpa kerumitan registrasi fintech perbankan yang berlebihan.

---

## 3. User Needs & Pain Points
| Masalah yang Sering Dialami | Solusi KasKu |
| :--- | :--- |
| **Lupa siapa yang berhutang atau punya hutang ke siapa** | Pelacakan otomatis dari riwayat transaksi dengan status *Lunas*, *Dicicil*, atau *Belum Dibayar* beserta persentase pelunasan. |
| **Langganan digital diam-diam menguras rekening** | Manajemen siklus rutin (mingguan, bulanan, 3-bulanan, tahunan) dengan indikator *Belum Dibayar*, *Segera Jatuh Tempo*, atau *Sudah Dibayar*. |
| **Pencatatan ribet dan lambat** | Alur pencatatan cepat dengan dukungan rincian barang belanjaan (*itemized transactions*) di mana subtotal dihitung otomatis oleh backend. |
| **Kekhawatiran privasi data keuangan** | Multi-tenant dengan isolasi data ketat (JWT + Bcrypt), proteksi rate-limiting, dan opsi menutup pendaftaran publik (`ALLOW_REGISTRATION=false`). |
| **Tampilan aplikasi keuangan generic AI yang melelahkan** | Desain **Impeccable** dengan mode *Operate*: tenang, berdensitas tinggi, tipografi presisi dengan tabular angka, tanpa gradien ungu-biru murahan atau glassmorphism dekoratif. |

---

## 4. Main Product Features
1. **Pencatatan Transaksi & Saldo Berjalan**: Pencatatan uang masuk dan keluar dengan perhitungan saldo berjalan (*running balance*) otomatis pada setiap baris transaksi.
2. **Rincian Pembelian (Itemized Purchases)**: Subtotal per barang belanjaan terhitung otomatis (`qty × unit_price`).
3. **Pelacakan Hutang & Piutang**: Dihitung murni dari transaksi finansial (`Beri Pinjaman`, `Terima Bayar Hutang`, `Pinjam dari Orang`, `Bayar Hutang Saya`).
4. **Langganan Rutin (Subscriptions)**: Siklus dinamis dengan penyesuaian akhir bulan (*month clamping*) dan tombol 1-klik pembayaran.
5. **Tagihan Sekali Bayar (Bills)**: Pelacakan jatuh tempo dan keterlambatan (*overdue*) dengan tombol 1-klik bayar.
6. **Kewajiban Mendesak (`Unpaid`)**: Ringkasan terpadu piutang belum lunas, langganan jatuh tempo, dan tagihan belum dibayar.
7. **Dashboard Analitik**: Hari ini (*Today*), Ringkasan Bulanan (*Summary*), 10 Barang Belanjaan Teratas, Tren Saldo Harian, dan Kekayaan Bersih (*Net Worth*).
8. **Ekspor & Utilitas**: Ekspor CSV seluruh transaksi dan pengaturan saldo awal (*opening balance*).

---

## 5. Primary User Journeys
1. **Pencatatan Harian Cepat**:
   * Pengguna membuka aplikasi $\rightarrow$ melihat saldo terkini & ringkasan hari ini $\rightarrow$ menekan tombol pintas transaksi $\rightarrow$ mengisi nominal, kategori, dan rincian belanja $\rightarrow$ saldo dan grafik langsung terbarui secara real-time.
2. **Penagihan & Pelunasan Piutang**:
   * Pengguna memeriksa tab Piutang $\rightarrow$ melihat daftar orang yang berhutang beserta status cicilan $\rightarrow$ mencatat cicilan yang diterima $\rightarrow$ status otomatis berubah dari *Belum Dibayar* ke *Dicicil* atau *Lunas*.
3. **Monitoring Langganan & Tagihan**:
   * Pengguna melihat item berstatus *Segera Jatuh Tempo* pada dashboard $\rightarrow$ menekan "Bayar Sekarang" $\rightarrow$ tagihan terupdate dan transaksi pengeluaran otomatis terbentuk.
4. **Evaluasi Keuangan Bulanan**:
   * Pengguna membuka ringkasan bulanan $\rightarrow$ mengecek distribusi pengeluaran per kategori, tren harian, barang belanjaan terbesar, dan angka Kekayaan Bersih.

---

## 6. Platform & Technical Constraints
- **Frontend**: Next.js (App Router), TypeScript, Tailwind CSS v4.
- **Backend**: Golang Fiber REST API, PostgreSQL (Neon Serverless).
- **Keamanan**: JWT Access Token (HS256, 15m), Refresh Token terotasi (30 hari), Bcrypt (cost 12), Header Keamanan (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`).
- **Device Support**: Mobile-first responsive (360px hingga 4K desktop).
- **Latency Target**: Interaksi UI instan (< 100ms) dengan feedback visual yang jelas.

---

## 7. Product Personality & Positioning
- **Personality**: *Disciplined, Clear, Functional, Calm, Swiss Precision*.
- **Tone of Voice**: Bersahaja, to-the-point, informatif, dan transparan.
- **Positioning**: Buku kas saku pribadi yang beroperasi seperti instrumen presisi keuangan, bukan aplikasi media sosial finansial yang bising.
