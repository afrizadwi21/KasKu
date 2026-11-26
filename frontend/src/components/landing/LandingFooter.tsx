import React from "react";
import Link from "next/link";
import { ArrowUpRight, ShieldCheck, Lock, FileSpreadsheet, RotateCcw } from "lucide-react";
import { Scroll3DFrame } from "./Scroll3DFrame";

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
    <footer className="bg-[#140a05] text-[#f8f4ee] border-t border-[#f8f4ee]/15">
      {/* Privacy & Control Section */}
      <section
        id="privasi"
        className="max-w-7xl mx-auto px-5 sm:px-8 py-20 sm:py-28 border-b border-[#f8f4ee]/15"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          <div className="lg:col-span-5 space-y-5">
            <h2 className="font-display text-4xl sm:text-5xl text-[#f8f4ee]">
              Data keuangan Anda hanya untuk Anda.
            </h2>
            <p className="text-base text-[#ffc9a3]/85 leading-relaxed">
              KasKu dibuat sebagai alat bantu catat pribadi yang tenang. Semua angka dihitung apa adanya supaya Anda selalu tahu kondisi uang Anda sebelum mengambil keputusan.
            </p>
            <div className="pt-2">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-sm bg-[#ff5b14] hover:bg-[#ff7a2e] text-white font-semibold text-sm transition-all duration-200 active:scale-[0.98]"
              >
                <span>Mulai Pakai KasKu</span>
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>

            <Scroll3DFrame direction="left" intensity={1.1} className="pt-4">
              <div className="overflow-hidden rounded-sm border border-[#f8f4ee]/15 bg-[#1a0e08]">
                <div className="aspect-[16/10] overflow-hidden">
                  <img
                    src="/images/3d-privacy-lock.jpg"
                    alt="Render 3D gembok keamanan data pribadi KasKu"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </Scroll3DFrame>
          </div>

          <div className="lg:col-span-7 divide-y divide-[#f8f4ee]/15 border-y border-[#f8f4ee]/15">
            {PRIVACY_POINTS.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="py-5 flex items-start gap-4"
                >
                  <Icon className="w-5 h-5 text-[#ff7a2e] shrink-0 mt-0.5" aria-hidden="true" />
                  <div className="space-y-1">
                    <h3 className="font-display-sub text-base text-[#f8f4ee]">
                      {item.title}
                    </h3>
                    <p className="text-sm text-[#ffc9a3]/80 leading-relaxed">
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
              <rect x="2" y="2" width="24" height="24" rx="4" stroke="#f8f4ee" strokeWidth="1.75" />
              <path
                d="M9 8.5V19.5M9 14L17.5 8.5M12.5 11.8L18.5 19.5"
                stroke="#ff5b14"
                strokeWidth="2.2"
                strokeLinecap="square"
              />
            </svg>
            <span className="font-display text-lg tracking-tight">
              KasKu
            </span>
          </div>
          <p className="text-xs text-[#ffc9a3]/75">
            Catatan kas pribadi dengan saldo bebas, pos tabungan, dan simulasi wishlist.
          </p>
        </div>

        <nav className="flex flex-wrap items-center gap-6 text-sm text-[#ffc9a3]/80" aria-label="Navigasi footer">
          <a href="#cara-kerja" className="hover:text-[#f8f4ee] transition-colors">
            Cara Kerja
          </a>
          <a href="#fitur" className="hover:text-[#f8f4ee] transition-colors">
            Fitur
          </a>
          <a href="#simulasi" className="hover:text-[#f8f4ee] transition-colors">
            Simulasi
          </a>
          <a href="#privasi" className="hover:text-[#f8f4ee] transition-colors">
            Privasi
          </a>
          <Link href="/dashboard" className="text-[#ff7a2e] hover:text-[#f8f4ee] transition-colors font-medium">
            Dashboard
          </Link>
        </nav>

        <div className="text-xs text-[#f8f4ee]/50 font-mono">
          © 2026 KasKu
        </div>
      </div>
    </footer>
  );
}
