# DESIGN.md — KasKu Design System & Quality Standard

> Standar kualitas desain berbasis **Impeccable Design Standard** (Mode: **Operate**).
> Memprioritaskan keterbacaan, kejelasan hierarki, presisi finansial, dan ketenangan visual. Menolak estetika generic AI (gradien ungu-biru, kartu bertumpuk tanpa fungsi, dan dekorasi kosong).

---

## 1. Visual Design Direction
- **Filosofi**: *Modern Editorial Financial Ledger & Swiss Functional Precision*.
- **Karakter**: Tenang, berwibawa, berdensitas informasi optimal, dan fokus pada aksi pengguna.
- **Bukan**: Dashboard AI generic dengan kartu melayang, gradien ungu mencolok, atau glassmorphism berat yang mengaburkan angka finansial.

---

## 2. Color System & Semantic Tokens

### A. Neutral Canvas (Dasar)
| Token | Light Mode | Dark Mode | Fungsi |
| :--- | :--- | :--- | :--- |
| `surface-canvas` | `#fbfbfc` (Warm Paper) | `#0b0d11` (Deep Carbon) | Latar belakang halaman |
| `surface-panel` | `#ffffff` (Pure White) | `#12151c` (Elevated Obsidian) | Kontainer kartu & modul |
| `surface-subtle` | `#f3f4f6` | `#1a1e28` | Background input, badge netral |
| `border-hairline` | `#e5e7eb` (1px solid) | `#222735` (1px solid) | Garis pemisah struktural |
| `border-focus` | `#0f766e` (Deep Teal) | `#14b8a6` | Fokus keyboard & seleksi aktif |

### B. Typography & Contrast (Teks)
| Token | Light Mode | Dark Mode | Fungsi |
| :--- | :--- | :--- | :--- |
| `text-primary` | `#111827` (Deep Ink) | `#f9fafb` (Bright White) | Judul, angka saldo, nilai utama |
| `text-secondary` | `#4b5563` | `#9ca3af` | Label form, metadata, keterangan |
| `text-muted` | `#6b7280` | `#64748b` | Timestamp, bantuan mikro, status non-aktif |

### C. Semantic Finance Accents (Fungsional)
Warna aksen hanya dipakai untuk menegaskan status finansial, **bukan** untuk dekorasi kosmetik:
- **Income / Asset (Pemasukan & Piutang Lunas)**:
  - Text: `#059669` (Light) / `#34d399` (Dark)
  - Badge Background: `#ecfdf5` (Light) / `rgba(16, 185, 129, 0.12)` (Dark)
- **Expense / Liability (Pengeluaran & Hutang Saya)**:
  - Text: `#dc2626` (Light) / `#f87171` (Dark)
  - Badge Background: `#fef2f2` (Light) / `rgba(239, 68, 68, 0.12)` (Dark)
- **Warning / Due Soon (Segera Jatuh Tempo / Belum Dibayar)**:
  - Text: `#d97706` (Light) / `#fbbf24` (Dark)
  - Badge Background: `#fffbeb` (Light) / `rgba(245, 158, 11, 0.12)` (Dark)
- **Primary Action (Brand Touchpoint)**:
  - Button & Active Accent: `#0f766e` (Teal 700) / `#14b8a6` (Teal 500)
  - Hover: `#0d665f` / `#0d9488`

---

## 3. Typography System
- **Font Display & Body**: Sans-serif kontemporer dengan geometris seimbang (misal: *Cabinet Grotesk*, *Satoshi*, atau *Geist* tanpa kompromi).
- **Financial Monospace / Tabular**: Seluruh angka nominal uang, tanggal, dan persentase **wajib** menggunakan angka tabular (`font-feature-settings: 'tnum' 1`, `font-variant-numeric: tabular-nums` atau `font-mono`).

### Type Scale & Hierarchy
| Peran | Ukuran (Tailwind) | Weight | Line Height | Keterangan |
| :--- | :--- | :--- | :--- | :--- |
| **Display (Saldo Utama)** | `text-3xl` / `text-4xl` (32px-36px) | `font-bold` | `leading-tight` | Tabular numbers, tracking tight |
| **Heading 1 (Halaman)** | `text-2xl` (24px) | `font-semibold` | `leading-snug` | Nama modul / halaman utama |
| **Heading 2 (Bagian)** | `text-lg` (18px) | `font-semibold` | `leading-normal` | Judul kartu atau section |
| **Subheading / Meta** | `text-sm` (14px) | `font-medium` | `leading-normal` | Label metriks & status |
| **Body Regular** | `text-sm` (14px) | `font-normal` | `leading-relaxed` | Isi konten, tabel, list transaksi |
| **Caption / Badge** | `text-xs` (12px) | `font-semibold` | `leading-none` | Tanggal, kategori tag, pill status |

---

## 4. Spacing, Grid & Layout Principles
- **Grid Basis**: Skala 4px (`p-2`, `p-3`, `p-4`, `p-6`, `gap-4`, `gap-6`).
- **Whitespace dengan Intensi**: Memberikan ruang bernapas yang cukup antar modul tanpa membuat pengguna merasa tersesat atau terlalu renggang.
- **Batasan Lebar Kontainer**:
  - Dashboard & List Transaksi: `max-w-6xl` (terpusat, nyaman untuk mata).
  - Form Modal & Kartu Fokus: `max-w-lg` atau `max-w-md`.
- **Hierarki Informasi**:
  1. Status Finansial Hari Ini & Saldo Terkini (atas).
  2. Aksi Cepat: Catat Transaksi, Pantau Tagihan/Langganan Mendesak.
  3. Riwayat Transaksi & Detail Analitik (bawah/tab).

---

## 5. Border Radius & Elevation (Bayangan)
- **Border Radius**: Presisi dan terkendali.
  - Kartu & Panel: `rounded-lg` (8px) atau `rounded-xl` (12px).
  - Input & Tombol: `rounded-md` (6px) hingga `rounded-lg` (8px).
  - Badge / Status Pill: `rounded-full` (12px padding proporsional).
  - **Dilarang**: Radius raksasa (24px-32px) pada modul data finansial.
- **Elevation**:
  - Mengandalkan garis batas 1px solid (`border border-zinc-200 dark:border-zinc-800`).
  - Bayangan sangat lembut: `shadow-xs` atau `shadow-sm` hanya pada kartu mengambang/dialog modal.

---

## 6. Component Styling Standards

### A. Buttons (Tombol)
- **Primary**: Solid background `#0f766e`, teks putih, font-medium, padding `px-4 py-2 text-sm`, transisi hover dengan sedikit penegasan kontras.
- **Secondary / Outline**: 1px border `border-zinc-300 dark:border-zinc-700`, background transparan, hover background halus `hover:bg-zinc-100 dark:hover:bg-zinc-800`.
- **Destructive**: Teks merah / background merah tegas untuk konfirmasi hapus data.
- **State Wajib**: Hover, Active (scale 0.98), Focus ring (2px offset), Disabled (opacity 50%, cursor-not-allowed).

### B. Form Inputs (Input & Dropdown)
- Background: `bg-white dark:bg-zinc-900`.
- Border: `border border-zinc-300 dark:border-zinc-700`.
- Focus: `focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none`.
- Error State: Border merah tegas dengan pesan bantuan di bawah input berformat teks kecil warna merah.

### C. Data Cards & Tables
- Baris tabel atau list item memiliki hover state halus (`hover:bg-zinc-50 dark:hover:bg-zinc-800/40`).
- Header tabel: uppercase, tracking-wider, `text-xs text-zinc-500 font-medium`.
- Nominal transaksi rata kanan (*right-aligned*) dengan font tabular mono.

---

## 7. Interaction Patterns & Motion
- **Durasi Animasi**: Cepat dan fungsional (150ms – 200ms `ease-out`).
- **Feedback Langsung**: Setiap aksi (simpan transaksi, bayar langganan, ganti saldo awal) harus memberikan konfirmasi visual instan (toast/banner).
- **No Gratuitous Animation**: Hindari efek bounce berlebihan atau rotasi ikon tanpa arti.

---

## 8. Responsive Behavior
- **Mobile (< 640px)**: Navigasi mudah dijangkau jempol (bottom sheet / compact sticky header), aksi transaksi dibuat menonjol, tabel diubah menjadi card-list.
- **Tablet (640px - 1024px)**: Grid 2 kolom seimbang.
- **Desktop (> 1024px)**: Grid 3 atau 4 kolom modular dengan scanability tinggi.

---

## 9. Accessibility (A11y)
- **Kontras Warna**: Memenuhi standar WCAG AA (rasio kontras minimal 4.5:1 untuk teks normal).
- **Keyboard Navigation**: Semua tombol, link, dan form field dapat diakses via `Tab`, `Enter`, dan `Esc`.
- **Focus Indicators**: Indikator fokus selalu terlihat jelas (`focus-visible:ring-2`).
- **Semantic HTML**: Menggunakan `<main>`, `<nav>`, `<header>`, `<section>`, `<article>`, `<button>`, `<label>` dengan benar.
