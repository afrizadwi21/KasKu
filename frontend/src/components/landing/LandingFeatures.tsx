"use client";

import React, { useState } from "react";
import { ArrowRight, CheckCircle2, AlertTriangle } from "lucide-react";
import Link from "next/link";

const ARCHITECTURE_MODULES = [
  {
    id: "arus-kas",
    title: "Arus Kas & Saldo Bebas",
    summary:
      "Memisahkan uang fisik di rekening (Saldo Total) dari uang yang aman dibelanjakan hari ini (Saldo Bebas), lengkap dengan Jatah Harian otomatis hingga akhir bulan.",
    specs: [
      { label: "Rumus Saldo Bebas", value: "Saldo Total − Total Tersimpan" },
      { label: "Jatah Harian", value: "Saldo Bebas / Sisa Hari Bulan Ini" },
      { label: "Rincian Pembelian", value: "Multi-item (Qty × Harga Satuan)" },
    ],
    image: "/images/telemetry-ledger.jpg",
    imageAlt: "Komposisi presisi kartu finansial dan prisma kaca",
  },
  {
    id: "tabungan",
    title: "Pos Tabungan Terisolasi",
    summary:
      "Sisihkan dana untuk Dana Darurat atau target spesifik tanpa mengotori laporan pemasukan dan pengeluaran. Dilengkapi penguncian baris database untuk mencegah saldo negatif.",
    specs: [
      { label: "Jenis Mutasi", value: "Setor, Tarik, Pakai (Belanja)" },
      { label: "Konsistensi", value: "DB Transaction + Row Lock" },
      { label: "Estimasi Target", value: "Kalkulasi Setoran Per Bulan" },
    ],
    image: "/images/vault-clarity.jpg",
    imageAlt: "Wadah penyimpanan modular yang melambangkan pos tabungan terstruktur",
  },
  {
    id: "wishlist",
    title: "Wishlist, Foto & Simulasi",
    summary:
      "Tempel link produk e-commerce untuk menarik nama, harga, dan foto secara otomatis, atau unggah foto sendiri. Simulasikan dampak pembelian sebelum uang benar-benar keluar.",
    specs: [
      { label: "Ekstraksi Metadata", value: "JSON-LD, Open Graph & Anti-SSRF" },
      { label: "Pemrosesan Foto", value: "Resize 800px, Strip EXIF, Signed URL" },
      { label: "Undo Pembelian", value: "Atomik 1-Klik Kembalikan Saldo" },
    ],
    image: "/images/hero-kasku.jpg",
    imageAlt: "Ruang kerja minimalis untuk perencanaan pembelian yang tenang",
  },
  {
    id: "kewajiban",
    title: "Piutang, Hutang & Langganan",
    summary:
      "Lacak siapa yang berhutang ke Anda beserta riwayat cicilan, pantau tagihan sekali bayar, dan hitung jatuh tempo langganan rutin dengan penyesuaian akhir bulan.",
    specs: [
      { label: "Status Otomatis", value: "Lunas, Dicicil, Belum Dibayar" },
      { label: "Siklus Langganan", value: "Mingguan, Bulanan, 3-Bulanan, Tahunan" },
      { label: "Peringatan Risiko", value: "Deteksi Kewajiban > Saldo Bebas" },
    ],
    image: "/images/telemetry-ledger.jpg",
    imageAlt: "Instrumen ukur presisi untuk memantau kewajiban finansial",
  },
];

const SAMPLE_ITEMS = [
  { name: "Headset Kerja", price: 30000 },
  { name: "Mouse Gaming", price: 85000 },
  { name: "Keyboard Mekanikal", price: 250000 },
];

function formatIDR(val: number): string {
  const sign = val < 0 ? "-" : "";
  const abs = Math.abs(Math.round(val));
  return `${sign}Rp ${abs.toLocaleString("id-ID")}`;
}

export function LandingFeatures() {
  const [activeModuleId, setActiveModuleId] = useState("arus-kas");
  const activeModule =
    ARCHITECTURE_MODULES.find((m) => m.id === activeModuleId) ??
    ARCHITECTURE_MODULES[0];

  // Interactive Simulator State (matching KasKu seed scenario)
  const [selectedPrice, setSelectedPrice] = useState(30000);
  const [selectedName, setSelectedName] = useState("Headset Kerja");
  const [fundingSource, setFundingSource] = useState<"bebas" | "pos">("bebas");

  const saldoTotalSekarang = 65353;
  const totalTersimpanSekarang = 20000;
  const saldoBebasSekarang = 45353;
  const sisaHariBulanIni = 5;

  const saldoTotalSetelah = saldoTotalSekarang - selectedPrice;
  const totalTersimpanSetelah =
    fundingSource === "pos"
      ? totalTersimpanSekarang - selectedPrice
      : totalTersimpanSekarang;
  const saldoBebasSetelah =
    fundingSource === "bebas"
      ? saldoBebasSekarang - selectedPrice
      : saldoBebasSekarang;

  const jatahHarianSekarang = Math.floor(saldoBebasSekarang / sisaHariBulanIni);
  const jatahHarianSetelah =
    saldoBebasSetelah > 0
      ? Math.floor(saldoBebasSetelah / sisaHariBulanIni)
      : 0;

  const cukup =
    fundingSource === "bebas"
      ? saldoBebasSekarang >= selectedPrice
      : totalTersimpanSekarang >= selectedPrice;

  return (
    <div className="bg-[var(--surface-canvas)] text-[var(--text-primary)]">
      {/* 1. Mission Statement Section */}
      <section
        id="misi"
        className="max-w-7xl mx-auto px-5 sm:px-8 py-20 sm:py-28 border-b border-[var(--border-hairline)]"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          <div className="lg:col-span-6 space-y-6">
            <h2 className="font-display text-3xl sm:text-5xl font-semibold tracking-[-0.025em] leading-[1.08] text-balance">
              Kejelasan finansial dimulai dari angka yang jujur.
            </h2>
            <p className="text-base sm:text-lg text-[var(--text-secondary)] leading-relaxed">
              Kebanyakan aplikasi keuangan hanya menjumlahkan pemasukan dan pengeluaran, membuat tabungan Anda terasa seperti uang bebas. KasKu dibangun dengan arsitektur deterministik: setiap rupiah memiliki status yang jelas antara kas operasional, tabungan tujuan, dan kewajiban jatuh tempo.
            </p>

            <div className="pt-4 border-t border-[var(--border-hairline)] grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <div className="font-mono text-2xl font-semibold num-tabular text-[var(--accent-primary)]">
                  01
                </div>
                <div className="mt-1 text-sm font-medium text-[var(--text-primary)]">
                  Bebas Bias Laporan
                </div>
                <p className="mt-1 text-xs text-[var(--text-secondary)] leading-relaxed">
                  Mutasi tabungan tidak dicatat sebagai pengeluaran fiktif.
                </p>
              </div>
              <div>
                <div className="font-mono text-2xl font-semibold num-tabular text-[var(--accent-primary)]">
                  02
                </div>
                <div className="mt-1 text-sm font-medium text-[var(--text-primary)]">
                  Simulasi Sebelum Beli
                </div>
                <p className="mt-1 text-xs text-[var(--text-secondary)] leading-relaxed">
                  Uji dampak transaksi terhadap jatah harian dan tagihan 7 hari.
                </p>
              </div>
              <div>
                <div className="font-mono text-2xl font-semibold num-tabular text-[var(--accent-primary)]">
                  03
                </div>
                <div className="mt-1 text-sm font-medium text-[var(--text-primary)]">
                  Isolasi Multi-Pengguna
                </div>
                <p className="mt-1 text-xs text-[var(--text-secondary)] leading-relaxed">
                  Seluruh data disaring ketat per akun dengan otorisasi JWT.
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="group relative overflow-hidden rounded-lg border border-[var(--border-hairline)] bg-[var(--surface-panel)]">
              <div className="aspect-[4/3] overflow-hidden">
                <img
                  src="/images/telemetry-ledger.jpg"
                  alt="Instrumen presisi pencatatan keuangan KasKu"
                  className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />
              </div>
              <div className="px-5 py-4 border-t border-[var(--border-hairline)] flex items-center justify-between text-xs text-[var(--text-secondary)]">
                <span>Arsitektur Buku Besar Deterministik</span>
                <span className="font-mono num-tabular">v2.0 Engine</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Interactive Core Architecture Section */}
      <section
        id="arsitektur"
        className="max-w-7xl mx-auto px-5 sm:px-8 py-20 sm:py-28 border-b border-[var(--border-hairline)]"
      >
        <div className="max-w-2xl mb-12 space-y-4">
          <h2 className="font-display text-3xl sm:text-5xl font-semibold tracking-[-0.025em] leading-[1.08]">
            Empat pilar manajemen kas yang saling terhubung.
          </h2>
          <p className="text-base sm:text-lg text-[var(--text-secondary)] leading-relaxed">
            Pilih modul di bawah ini untuk melihat bagaimana setiap komponen KasKu bekerja bersama menjaga kesehatan arus kas Anda.
          </p>
        </div>

        {/* Module Switcher Tabs */}
        <div
          className="flex flex-wrap gap-2 border-b border-[var(--border-hairline)] pb-4 mb-10"
          role="tablist"
          aria-label="Pilar Arsitektur KasKu"
        >
          {ARCHITECTURE_MODULES.map((mod) => {
            const isActive = mod.id === activeModuleId;
            return (
              <button
                key={mod.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveModuleId(mod.id)}
                className={`px-4 py-2.5 rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] ${
                  isActive
                    ? "bg-[var(--text-primary)] text-[var(--surface-canvas)]"
                    : "bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                {mod.title}
              </button>
            );
          })}
        </div>

        {/* Active Module Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          <div className="lg:col-span-6 space-y-6">
            <h3 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight">
              {activeModule.title}
            </h3>
            <p className="text-base text-[var(--text-secondary)] leading-relaxed">
              {activeModule.summary}
            </p>

            <div className="border-t border-[var(--border-hairline)] divide-y divide-[var(--border-hairline)]">
              {activeModule.specs.map((spec) => (
                <div
                  key={spec.label}
                  className="py-3.5 flex items-center justify-between gap-4 text-sm"
                >
                  <span className="text-[var(--text-secondary)]">{spec.label}</span>
                  <span className="font-mono font-medium text-[var(--text-primary)] text-right num-tabular">
                    {spec.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="group overflow-hidden rounded-lg border border-[var(--border-hairline)] bg-[var(--surface-panel)]">
              <div className="aspect-[4/3] overflow-hidden">
                <img
                  key={activeModule.image}
                  src={activeModule.image}
                  alt={activeModule.imageAlt}
                  className="w-full h-full object-cover animate-reveal-up transition-transform duration-700 group-hover:scale-105"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Live Interactive Wishlist Simulator */}
      <section
        id="simulasi"
        className="max-w-7xl mx-auto px-5 sm:px-8 py-20 sm:py-28 border-b border-[var(--border-hairline)]"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          <div className="lg:col-span-5 space-y-5">
            <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-[-0.025em] leading-[1.1]">
              Lihat sisa saldo Anda sebelum menekan tombol beli.
            </h2>
            <p className="text-base text-[var(--text-secondary)] leading-relaxed">
              Simulasi ini menggunakan logika perhitungan yang sama persis dengan backend KasKu (`SimulasiBeli`). Coba pilih barang dan sumber dana di samping untuk menguji skenario kas Anda.
            </p>

            <div className="pt-2 space-y-4">
              <div>
                <div className="text-xs uppercase tracking-wider text-[var(--text-secondary)] font-medium mb-2">
                  Pilih Contoh Barang Wishlist
                </div>
                <div className="flex flex-wrap gap-2">
                  {SAMPLE_ITEMS.map((item) => {
                    const selected = selectedName === item.name;
                    return (
                      <button
                        key={item.name}
                        type="button"
                        onClick={() => {
                          setSelectedName(item.name);
                          setSelectedPrice(item.price);
                        }}
                        className={`px-3.5 py-2 rounded-md text-xs sm:text-sm font-medium border transition-colors ${
                          selected
                            ? "border-[var(--accent-primary)] bg-[var(--accent-income-bg)] text-[var(--accent-primary)]"
                            : "border-[var(--border-hairline)] bg-[var(--surface-panel)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                        }`}
                      >
                        {item.name} ({formatIDR(item.price)})
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="text-xs uppercase tracking-wider text-[var(--text-secondary)] font-medium mb-2">
                  Sumber Dana Pembelian
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFundingSource("bebas")}
                    className={`px-4 py-2.5 rounded-md text-sm font-medium border text-left transition-colors ${
                      fundingSource === "bebas"
                        ? "border-[var(--accent-primary)] bg-[var(--accent-primary)] text-white"
                        : "border-[var(--border-hairline)] bg-[var(--surface-panel)] text-[var(--text-secondary)]"
                    }`}
                  >
                    Saldo Bebas (Jajan)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFundingSource("pos")}
                    className={`px-4 py-2.5 rounded-md text-sm font-medium border text-left transition-colors ${
                      fundingSource === "pos"
                        ? "border-[var(--accent-primary)] bg-[var(--accent-primary)] text-white"
                        : "border-[var(--border-hairline)] bg-[var(--surface-panel)] text-[var(--text-secondary)]"
                    }`}
                  >
                    Pos Dana Darurat
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Live Telemetry Preview Panel */}
          <div className="lg:col-span-7 rounded-lg border border-[var(--border-hairline)] bg-[var(--surface-panel)] p-6 sm:p-8 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-[var(--border-hairline)]">
              <div>
                <div className="text-xs uppercase tracking-wider text-[var(--text-secondary)]">
                  Hasil Simulasi Pembelian
                </div>
                <div className="mt-1 font-display text-xl font-semibold">
                  {selectedName} — <span className="font-mono num-tabular">{formatIDR(selectedPrice)}</span>
                </div>
              </div>

              {cukup ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[var(--accent-income-bg)] text-[var(--accent-income)]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Dana Mencukupi
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[var(--accent-expense-bg)] text-[var(--accent-expense)]">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Dana Tidak Cukup
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div className="p-4 rounded-md bg-[var(--surface-subtle)] space-y-1">
                <div className="text-xs text-[var(--text-secondary)]">Saldo Total Setelah</div>
                <div className="font-mono text-xl font-semibold num-tabular">
                  {formatIDR(saldoTotalSetelah)}
                </div>
                <div className="text-xs text-[var(--text-muted)] font-mono num-tabular">
                  Awal: {formatIDR(saldoTotalSekarang)}
                </div>
              </div>

              <div className="p-4 rounded-md bg-[var(--surface-subtle)] space-y-1">
                <div className="text-xs text-[var(--text-secondary)]">Saldo Bebas Setelah</div>
                <div
                  className={`font-mono text-xl font-semibold num-tabular ${
                    saldoBebasSetelah < 0 ? "text-[var(--accent-expense)]" : "text-[var(--accent-primary)]"
                  }`}
                >
                  {formatIDR(saldoBebasSetelah)}
                </div>
                <div className="text-xs text-[var(--text-muted)] font-mono num-tabular">
                  Awal: {formatIDR(saldoBebasSekarang)}
                </div>
              </div>

              <div className="p-4 rounded-md bg-[var(--surface-subtle)] space-y-1">
                <div className="text-xs text-[var(--text-secondary)]">Jatah Harian ({sisaHariBulanIni} hari)</div>
                <div className="font-mono text-xl font-semibold num-tabular">
                  {formatIDR(jatahHarianSetelah)}
                </div>
                <div className="text-xs text-[var(--text-muted)] font-mono num-tabular">
                  Awal: {formatIDR(jatahHarianSekarang)}/hari
                </div>
              </div>
            </div>

            <div className="p-4 rounded-md border border-[var(--border-hairline)] text-sm text-[var(--text-secondary)] leading-relaxed">
              &ldquo;Jika membeli <strong className="text-[var(--text-primary)]">{selectedName}</strong>, saldo kamu akan tersisa{" "}
              <span className="font-mono font-semibold text-[var(--text-primary)] num-tabular">
                {formatIDR(saldoTotalSetelah)}
              </span>{" "}
              (saldo jajan{" "}
              <span className="font-mono font-semibold text-[var(--text-primary)] num-tabular">
                {formatIDR(saldoBebasSetelah)}
              </span>
              , tabungan{" "}
              <span className="font-mono font-semibold text-[var(--text-primary)] num-tabular">
                {formatIDR(totalTersimpanSetelah)}
              </span>
              ).&rdquo;
            </div>

            <div className="pt-2 flex justify-end">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 text-sm font-medium text-[var(--accent-primary)] hover:underline"
              >
                <span>Gunakan Simulasi di Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
