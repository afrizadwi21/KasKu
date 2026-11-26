import React from "react";
import Link from "next/link";
import { ArrowUpRight, ShieldCheck, Lock, FileSpreadsheet, RotateCcw } from "lucide-react";

const PRIVACY_POINTS = [
  {
    icon: Lock,
    title: "Akun Pribadi Terpisah",
    detail: "Setiap pengguna memiliki ruang catatan sendiri. Data pemasukan, tabungan, dan wishlist Anda tidak bisa dilihat orang lain.",
  },
  {
    icon: ShieldCheck,
    title: "Bebas Iklan & Penawaran Pinjaman",
    detail: "Tampilan dibuat tenang agar Anda bisa fokus memeriksa kondisi keuangan tanpa gangguan pop-up atau iklan produk.",
  },
  {
    icon: FileSpreadsheet,
    title: "Ekspor Data ke CSV Kapan Saja",
    detail: "Unduh seluruh riwayat transaksi dan mutasi tabungan ke file CSV kalau Anda ingin mengolahnya lagi di Excel atau Google Sheets.",
  },
  {
    icon: RotateCcw,
    title: "Salah Pencet Bisa Dibatalkan",
    detail: "Pembelian wishlist yang sudah telanjur dicatat dapat dibatalkan dengan satu klik untuk mengembalikan saldo seperti semula.",
  },
];

export function LandingFooter() {
  return (
    <footer className="bg-black text-white border-t border-white/15">
      {/* Privacy & Control Section */}
      <section
        id="privasi"
        className="max-w-7xl mx-auto px-5 sm:px-8 py-20 sm:py-28 border-b border-white/15"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          <div className="lg:col-span-5 space-y-5">
            <h2 className="font-display text-4xl sm:text-5xl text-white">
              Data keuangan Anda hanya untuk Anda.
            </h2>
            <p className="text-base text-[#bbbcbc] leading-relaxed">
              KasKu dibuat sebagai alat bantu catat pribadi yang tenang. Semua angka dihitung apa adanya supaya Anda selalu tahu kondisi uang Anda sebelum mengambil keputusan.
            </p>
            <div className="pt-2">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-sm bg-white hover:bg-[#f5f5f3] text-black font-semibold text-sm transition-all duration-200 active:scale-[0.98]"
              >
                <span>Mulai Pakai KasKu</span>
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          <div className="lg:col-span-7 divide-y divide-white/15 border-y border-white/15">
            {PRIVACY_POINTS.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="py-5 flex items-start gap-4"
                >
                  <Icon className="w-5 h-5 text-[#38bdf8] shrink-0 mt-0.5" aria-hidden="true" />
                  <div className="space-y-1">
                    <h3 className="font-display text-base font-semibold text-white">
                      {item.title}
                    </h3>
                    <p className="text-sm text-[#bbbcbc] leading-relaxed">
                      {item.detail}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Bottom Footer Directory */}
      <div className="max-w-7xl mx-auto px-5 sm:px-8 py-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <svg width="24" height="24" viewBox="0 0 28 28" fill="none" aria-hidden="true">
              <rect x="2" y="2" width="24" height="24" rx="4" stroke="white" strokeWidth="1.75" />
              <path
                d="M9 8.5V19.5M9 14L17.5 8.5M12.5 11.8L18.5 19.5"
                stroke="#38bdf8"
                strokeWidth="2"
                strokeLinecap="square"
              />
            </svg>
            <span className="font-display text-lg tracking-tight">
              KasKu
            </span>
          </div>
          <p className="text-xs text-[#bbbcbc]">
            Catatan kas pribadi dengan saldo bebas, pos tabungan, dan simulasi wishlist.
          </p>
        </div>

        <nav className="flex flex-wrap items-center gap-6 text-sm text-[#bbbcbc]" aria-label="Navigasi footer">
          <a href="#cara-kerja" className="hover:text-white transition-colors">
            Cara Kerja
          </a>
          <a href="#fitur" className="hover:text-white transition-colors">
            Fitur
          </a>
          <a href="#simulasi" className="hover:text-white transition-colors">
            Simulasi
          </a>
          <a href="#privasi" className="hover:text-white transition-colors">
            Privasi
          </a>
          <Link href="/dashboard" className="text-[#38bdf8] hover:text-white transition-colors font-medium">
            Dashboard
          </Link>
        </nav>

        <div className="text-xs text-white/50 font-mono">
          © 2026 KasKu
        </div>
      </div>
    </footer>
  );
}
