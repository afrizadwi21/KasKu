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
    <div className="bg-white text-black">
      {/* 1. Mission Statement Section */}
      <section
        id="misi"
        className="max-w-7xl mx-auto px-5 sm:px-8 py-20 sm:py-28 border-b border-[#e4e4e2]"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          <div className="lg:col-span-6 space-y-6">
            <h2 className="font-display text-3xl sm:text-5xl font-semibold tracking-[-0.025em] leading-[1.08] text-balance text-black">
              Kejelasan finansial dimulai dari angka yang jujur.
            </h2>
            <p className="text-base sm:text-lg text-[#4a4d52] leading-relaxed">
              Kebanyakan aplikasi keuangan hanya menjumlahkan pemasukan dan pengeluaran, membuat tabungan Anda terasa seperti uang bebas. KasKu dibangun dengan arsitektur deterministik: setiap rupiah memiliki status yang jelas antara kas operasional, tabungan tujuan, dan kewajiban jatuh tempo.
            </p>

            <div className="pt-4 border-t border-[#e4e4e2] grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <div className="font-mono text-2xl font-semibold num-tabular text-[#0284c7]">
                  01
                </div>
                <div className="mt-1 text-sm font-medium text-black">
                  Bebas Bias Laporan
                </div>
                <p className="mt-1 text-xs text-[#4a4d52] leading-relaxed">
                  Mutasi tabungan tidak dicatat sebagai pengeluaran fiktif.
                </p>
              </div>
              <div>
                <div className="font-mono text-2xl font-semibold num-tabular text-[#0284c7]">
                  02
                </div>
                <div className="mt-1 text-sm font-medium text-black">
                  Simulasi Sebelum Beli
                </div>
                <p className="mt-1 text-xs text-[#4a4d52] leading-relaxed">
                  Uji dampak transaksi terhadap jatah harian dan tagihan 7 hari.
                </p>
              </div>
              <div>
                <div className="font-mono text-2xl font-semibold num-tabular text-[#0284c7]">
                  03
                </div>
                <div className="mt-1 text-sm font-medium text-black">
                  Isolasi Multi-Pengguna
                </div>
                <p className="mt-1 text-xs text-[#4a4d52] leading-relaxed">
                  Seluruh data disaring ketat per akun dengan otorisasi JWT.
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 [perspective:1200px]">
            <div className="group relative overflow-hidden rounded-sm border border-[#e4e4e2] bg-[#f5f5f3] transition-transform duration-500 ease-out hover:[transform:rotateX(2deg)_rotateY(-3deg)]">
              <div className="aspect-[4/3] overflow-hidden">
                <img
                  src="/images/telemetry-ledger.jpg"
                  alt="Instrumen presisi pencatatan keuangan KasKu"
                  className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />
              </div>
              <div className="px-5 py-4 border-t border-[#e4e4e2] bg-white flex items-center justify-between text-xs text-[#4a4d52]">
                <span>Arsitektur Buku Besar Deterministik</span>
                <span className="font-mono num-tabular text-black">v2.0 Engine</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Interactive Core Architecture Section */}
      <section
        id="arsitektur"
        className="bg-[#f5f5f3] border-b border-[#e4e4e2]"
      >
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-20 sm:py-28">
          <div className="max-w-2xl mb-12 space-y-4">
            <h2 className="font-display text-3xl sm:text-5xl font-semibold tracking-[-0.025em] leading-[1.08] text-black">
              Empat pilar manajemen kas yang saling terhubung.
            </h2>
            <p className="text-base sm:text-lg text-[#4a4d52] leading-relaxed">
              Pilih modul di bawah ini untuk melihat bagaimana setiap komponen KasKu bekerja bersama menjaga kesehatan arus kas Anda.
            </p>
          </div>

          {/* Module Switcher Tabs */}
          <div
            className="flex flex-wrap gap-2 border-b border-[#e4e4e2] pb-4 mb-10"
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
                  className={`px-4 py-2.5 rounded-sm text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0284c7] ${
                    isActive
                      ? "bg-black text-white"
                      : "bg-white border border-[#e4e4e2] text-[#4a4d52] hover:text-black"
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
              <h3 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-black">
                {activeModule.title}
              </h3>
              <p className="text-base text-[#4a4d52] leading-relaxed">
                {activeModule.summary}
              </p>

              <div className="border-t border-[#e4e4e2] divide-y divide-[#e4e4e2]">
                {activeModule.specs.map((spec) => (
                  <div
                    key={spec.label}
                    className="py-3.5 flex items-center justify-between gap-4 text-sm"
                  >
                    <span className="text-[#4a4d52]">{spec.label}</span>
                    <span className="font-mono font-medium text-black text-right num-tabular">
                      {spec.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-6 [perspective:1200px]">
              <div className="group overflow-hidden rounded-sm border border-[#e4e4e2] bg-white transition-transform duration-500 ease-out hover:[transform:rotateX(2deg)_rotateY(3deg)]">
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
        </div>
      </section>

      {/* 3. Live Interactive Wishlist Simulator */}
      <section
        id="simulasi"
        className="max-w-7xl mx-auto px-5 sm:px-8 py-20 sm:py-28 border-b border-[#e4e4e2]"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          <div className="lg:col-span-5 space-y-5">
            <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-[-0.025em] leading-[1.1] text-black">
              Lihat sisa saldo Anda sebelum menekan tombol beli.
            </h2>
            <p className="text-base text-[#4a4d52] leading-relaxed">
              Simulasi ini menggunakan logika perhitungan yang sama persis dengan backend KasKu (`SimulasiBeli`). Coba pilih barang dan sumber dana di samping untuk menguji skenario kas Anda.
            </p>

            <div className="pt-2 space-y-4">
              <div>
                <div className="text-xs uppercase tracking-wider text-[#4a4d52] font-medium mb-2">
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
                        className={`px-3.5 py-2 rounded-sm text-xs sm:text-sm font-medium border transition-colors ${
                          selected
                            ? "border-[#0284c7] bg-[#f0f9ff] text-[#0284c7]"
                            : "border-[#e4e4e2] bg-white text-[#4a4d52] hover:text-black"
                        }`}
                      >
                        {item.name} ({formatIDR(item.price)})
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="text-xs uppercase tracking-wider text-[#4a4d52] font-medium mb-2">
                  Sumber Dana Pembelian
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFundingSource("bebas")}
                    className={`px-4 py-2.5 rounded-sm text-sm font-medium border text-left transition-colors ${
                      fundingSource === "bebas"
                        ? "border-black bg-black text-white"
                        : "border-[#e4e4e2] bg-white text-[#4a4d52]"
                    }`}
                  >
                    Saldo Bebas (Jajan)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFundingSource("pos")}
                    className={`px-4 py-2.5 rounded-sm text-sm font-medium border text-left transition-colors ${
                      fundingSource === "pos"
                        ? "border-black bg-black text-white"
                        : "border-[#e4e4e2] bg-white text-[#4a4d52]"
                    }`}
                  >
                    Pos Dana Darurat
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Live Telemetry Preview Panel */}
          <div className="lg:col-span-7 rounded-sm border border-[#e4e4e2] bg-[#f5f5f3] p-6 sm:p-8 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-[#e4e4e2]">
              <div>
                <div className="text-xs uppercase tracking-wider text-[#4a4d52]">
                  Hasil Simulasi Pembelian
                </div>
                <div className="mt-1 font-display text-xl font-semibold text-black">
                  {selectedName} — <span className="font-mono num-tabular">{formatIDR(selectedPrice)}</span>
                </div>
              </div>

              {cukup ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#ecfdf5] text-[#059669]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Dana Mencukupi
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#fef2f2] text-[#dc2626]">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Dana Tidak Cukup
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div className="p-4 rounded-sm bg-white border border-[#e4e4e2] space-y-1">
                <div className="text-xs text-[#4a4d52]">Saldo Total Setelah</div>
                <div className="font-mono text-xl font-semibold num-tabular text-black">
                  {formatIDR(saldoTotalSetelah)}
                </div>
                <div className="text-xs text-[#6b6d72] font-mono num-tabular">
                  Awal: {formatIDR(saldoTotalSekarang)}
                </div>
              </div>

              <div className="p-4 rounded-sm bg-white border border-[#e4e4e2] space-y-1">
                <div className="text-xs text-[#4a4d52]">Saldo Bebas Setelah</div>
                <div
                  className={`font-mono text-xl font-semibold num-tabular ${
                    saldoBebasSetelah < 0 ? "text-[#dc2626]" : "text-[#0284c7]"
                  }`}
                >
                  {formatIDR(saldoBebasSetelah)}
                </div>
                <div className="text-xs text-[#6b6d72] font-mono num-tabular">
                  Awal: {formatIDR(saldoBebasSekarang)}
                </div>
              </div>

              <div className="p-4 rounded-sm bg-white border border-[#e4e4e2] space-y-1">
                <div className="text-xs text-[#4a4d52]">Jatah Harian ({sisaHariBulanIni} hari)</div>
                <div className="font-mono text-xl font-semibold num-tabular text-black">
                  {formatIDR(jatahHarianSetelah)}
                </div>
                <div className="text-xs text-[#6b6d72] font-mono num-tabular">
                  Awal: {formatIDR(jatahHarianSekarang)}/hari
                </div>
              </div>
            </div>

            <div className="p-4 rounded-sm border border-[#e4e4e2] bg-white text-sm text-[#4a4d52] leading-relaxed">
              &ldquo;Jika membeli <strong className="text-black">{selectedName}</strong>, saldo kamu akan tersisa{" "}
              <span className="font-mono font-semibold text-black num-tabular">
                {formatIDR(saldoTotalSetelah)}
              </span>{" "}
              (saldo jajan{" "}
              <span className="font-mono font-semibold text-black num-tabular">
                {formatIDR(saldoBebasSetelah)}
              </span>
              , tabungan{" "}
              <span className="font-mono font-semibold text-black num-tabular">
                {formatIDR(totalTersimpanSetelah)}
              </span>
              ).&rdquo;
            </div>

            <div className="pt-2 flex justify-end">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 text-sm font-medium text-[#0284c7] hover:underline"
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
