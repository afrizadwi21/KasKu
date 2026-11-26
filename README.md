# KasKu (Aplikasi Manajemen Keuangan Pribadi)

Aplikasi pencatatan keuangan personal yang ringan, cepat, dan aman untuk satu pengguna.

## Arsitektur & Tech Stack
- **Frontend**: [Next.js](https://nextjs.org/) (App Router, TypeScript, Tailwind CSS) - Siap deploy ke **Vercel**
- **Backend**: [Golang Fiber](https://gofiber.io/) - Siap deploy ke **Railway** via Dockerfile
- **Database**: PostgreSQL di **Neon** (Serverless Postgres)
- **Keamanan**: Single-token authentication (`X-Secret-Token` atau `Bearer <token>`)

## Struktur Proyek
```text
KasKu/
├── backend/          # Golang Fiber API Server
│   ├── main.go       # Entry point Fiber & token middleware
│   ├── go.mod        # Dependency Go
│   ├── Dockerfile    # Docker multi-stage build untuk Railway
│   └── .env.example  # Contoh environment variables
├── frontend/         # Next.js App Router
│   ├── src/          # Source code React & UI
│   ├── package.json
│   └── .env.example  # API URL & Secret Token Next.js
└── README.md
```

## Setup & Instalasi Lokal

### 1. Backend (Golang Fiber)
```bash
cd backend
cp .env.example .env
# Edit .env sesuaikan DATABASE_URL (Neon Postgres) dan SECRET_TOKEN
go run main.go
# Server berjalan di http://localhost:8080
```

### 2. Frontend (Next.js)
```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
# Buka http://localhost:3000
```

## Rencana Fitur
1. **Pencatatan Pemasukan & Pengeluaran**: Saldo terhitung otomatis secara real-time.
2. **Piutang**: Pantau siapa yang berhutang, riwayat cicilan, dan status (*Lunas / Dicicil / Belum Dibayar*).
3. **Hutang**: Pantau hutang Anda ke orang lain beserta status pembayarannya.
4. **Langganan (Subscriptions)**: Pantau biaya berkala dengan jatuh tempo dan indikator status (*Belum Dibayar*, *Segera Jatuh Tempo*, *Sudah Dibayar*).
5. **Ringkasan (Dashboard)**: Saldo kas, kekayaan bersih (Net Worth = Kas + Piutang - Hutang), dan grafik/ringkasan bulanan.
6. **Keamanan Single-User**: Dilindungi 1 Secret Token rahasia tanpa registrasi berbelit.
