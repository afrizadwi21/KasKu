"use client";

import React, { useState } from "react";
import { ArrowRight, CheckCircle2, AlertTriangle } from "lucide-react";
import Link from "next/link";

const FEATURE_MODULES = [
  {
    id: "arus-kas",
    title: "Uang Masuk & Keluar",
    summary:
      "Catat pemasukan dari gaji, freelance, atau jual barang, lalu catat pengeluaran lengkap dengan daftar belanjaannya. Saldo langsung berubah setiap kali Anda menambah catatan.",
    specs: [
      { label: "Rincian Belanja", value: "Catat beberapa barang sekaligus dalam satu struk" },
      { label: "Saldo Berjalan", value: "Langsung hitung sisa uang setelah tiap transaksi" },
      { label: "Batas Pengeluaran", value: "Peringatan kalau belanja melebihi uang jajan" },
    ],
    image: "/images/telemetry-ledger.jpg",
    imageAlt: "Ilustrasi pencatatan kas harian KasKu",
  },
  {
    id: "tabungan",
    title: "Pos Tabungan",
    summary:
      "Buat pos tabungan terpisah seperti Dana Darurat, Beli HP, atau Liburan. Saat uang disisihkan, saldo jajan Anda berkurang tetapi uang itu tetap milik Anda.",
    specs: [
      { label: "Setor & Tarik", value: "Pindahkan uang masuk atau keluar pos kapan saja" },
      { label: "Belanja dari Tabungan", value: "Bayar langsung dari pos tanpa memotong uang jajan" },
      { label: "Target & Tenggat", value: "Hitung otomatis berapa yang perlu ditabung tiap bulan" },
    ],
    image: "/images/vault-clarity.jpg",
    imageAlt: "Wadah penyimpanan modular yang melambangkan pos tabungan KasKu",
  },
  {
    id: "wishlist",
    title: "Wishlist & Foto",
    summary:
      "Simpan daftar barang yang ingin dibeli. Cukup tempel link toko online untuk mengisi nama, harga, dan foto secara otomatis, atau unggah foto sendiri.",
    specs: [
      { label: "Simulasi Sebelum Beli", value: "Cek sisa saldo dan keamanan tagihan 7 hari ke depan" },
      { label: "Rencana Belanja", value: "Urutkan barang prioritas yang sudah sanggup dibeli" },
      { label: "Batal Beli", value: "Salah pencet beli? Kembalikan saldo dan barang dengan satu klik" },
    ],
    image: "/images/hero-kasku.jpg",
    imageAlt: "Ruang kerja minimalis untuk merencanakan pembelian wishlist",
  },
  {
    id: "kewajiban",
    title: "Hutang & Langganan",
    summary:
      "Catat siapa yang meminjam uang ke Anda beserta cicilannya. Pantau juga langganan bulanan atau tagihan listrik sebelum melewati tanggal jatuh tempo.",
    specs: [
      { label: "Status Hutang", value: "Otomatis tampil Lunas, Dicicil, atau Belum Dibayar" },
      { label: "Langganan Rutin", value: "Pengingat mingguan, bulanan, 3-bulanan, dan tahunan" },
      { label: "Rekap Tagihan", value: "Peringatan jika total tagihan melebihi uang jajan" },
    ],
    image: "/images/telemetry-ledger.jpg",
    imageAlt: "Catatan rapi untuk hutang piutang dan langganan rutin",
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
    FEATURE_MODULES.find((m) => m.id === activeModuleId) ??
    FEATURE_MODULES[0];

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
      {/* 1. Cara Kerja KasKu */}
      <section
        id="cara-kerja"
        className="max-w-7xl mx-auto px-5 sm:px-8 py-20 sm:py-28 border-b border-[#e4e4e2]"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          <div className="lg:col-span-6 space-y-6">
            <h2 className="font-display text-4xl sm:text-5xl text-balance text-black">
              Saldo besar di rekening sering menipu kalau belum dipisah.
            </h2>
            <p className="text-base sm:text-lg text-[#4a4d52] leading-relaxed">
              Saat uang tabungan, uang belanja harian, dan tagihan akhir bulan bercampur di satu angka, rasanya selalu aman sampai tiba-tiba kurang. KasKu memisahkan ketiganya sejak awal Anda mencatat.
            </p>

            <div className="pt-4 border-t border-[#e4e4e2] grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <div className="font-mono text-2xl font-semibold num-tabular text-[#0284c7]">
                  01
                </div>
                <div className="mt-1 text-sm font-medium text-black">
                  Uang Jajan Terukur
                </div>
                <p className="mt-1 text-xs text-[#4a4d52] leading-relaxed">
                  Lihat batas belanja harian Anda dari hari ini sampai akhir bulan.
                </p>
              </div>
              <div>
                <div className="font-mono text-2xl font-semibold num-tabular text-[#0284c7]">
                  02
                </div>
                <div className="mt-1 text-sm font-medium text-black">
                  Tabungan Tidak Terganggu
                </div>
                <p className="mt-1 text-xs text-[#4a4d52] leading-relaxed">
                  Sisihkan uang ke pos khusus tanpa merusak laporan pengeluaran.
                </p>
              </div>
              <div>
                <div className="font-mono text-2xl font-semibold num-tabular text-[#0284c7]">
                  03
                </div>
                <div className="mt-1 text-sm font-medium text-black">
                  Cicilan & Tagihan Jelas
                </div>
                <p className="mt-1 text-xs text-[#4a4d52] leading-relaxed">
                  Langganan rutin dan hutang teman tercatat otomatis statusnya.
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 [perspective:1200px]">
            <div className="group relative overflow-hidden rounded-sm border border-[#e4e4e2] bg-[#f5f5f3] transition-transform duration-500 ease-out hover:[transform:rotateX(2deg)_rotateY(-3deg)]">
              <div className="aspect-[4/3] overflow-hidden">
                <img
                  src="/images/telemetry-ledger.jpg"
                  alt="Catatan keuangan pribadi KasKu yang rapi"
                  className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />
              </div>
              <div className="px-5 py-4 border-t border-[#e4e4e2] bg-white flex items-center justify-between text-xs text-[#4a4d52]">
                <span>Catatan Keuangan Pribadi KasKu</span>
                <span className="font-mono num-tabular text-black">Ringkas & Jelas</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Fitur Utama KasKu */}
      <section
        id="fitur"
        className="bg-[#f5f5f3] border-b border-[#e4e4e2]"
      >
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-20 sm:py-28">
          <div className="max-w-2xl mb-12 space-y-4">
            <h2 className="font-display text-4xl sm:text-5xl text-black">
              Semua keperluan kas pribadi ada di satu tempat.
            </h2>
            <p className="text-base sm:text-lg text-[#4a4d52] leading-relaxed">
              Pilih bagian di bawah untuk melihat bagaimana KasKu membantu mengatur uang sehari-hari.
            </p>
          </div>

          {/* Feature Switcher Tabs */}
          <div
            className="flex flex-wrap gap-2 border-b border-[#e4e4e2] pb-4 mb-10"
            role="tablist"
            aria-label="Fitur Utama KasKu"
          >
            {FEATURE_MODULES.map((mod) => {
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

          {/* Active Feature Content */}
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
                    className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4 text-sm"
                  >
                    <span className="font-medium text-black">{spec.label}</span>
                    <span className="text-[#4a4d52] sm:text-right">
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
            <h2 className="font-display text-3xl sm:text-5xl text-black">
              Lihat sisa saldo Anda sebelum menekan tombol beli.
            </h2>
            <p className="text-base text-[#4a4d52] leading-relaxed">
              Simulasi ini memakai cara hitung yang sama dengan di dalam aplikasi KasKu. Coba pilih barang dan sumber dananya untuk melihat perubahan saldo Anda.
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

          {/* Live Preview Panel */}
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
