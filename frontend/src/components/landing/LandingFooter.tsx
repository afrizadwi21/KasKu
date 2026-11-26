import React from "react";
import Link from "next/link";
import { ArrowUpRight, ShieldCheck, Lock, Server, Database } from "lucide-react";

const SECURITY_SPECS = [
  {
    icon: Lock,
    title: "Autentikasi & Rotasi Token",
    detail: "Access token JWT HS256 berumur 15 menit dengan refresh token SHA-256 terotasi dan deteksi penyalahgunaan otomatis.",
  },
  {
    icon: ShieldCheck,
    title: "Proteksi Anti-SSRF & Sanitasi",
    detail: "Setiap pengambilan link wishlist memblokir IP privat/metadata cloud sebelum koneksi dibuka dan membersihkan HTML berbahaya.",
  },
  {
    icon: Database,
    title: "Isolasi Data Multi-Pengguna",
    detail: "Seluruh query SQL disaring ketat menggunakan user_id dari context JWT terverifikasi, tanpa celah spoofing parameter.",
  },
  {
    icon: Server,
    title: "Konsistensi Transaksi Atomik",
    detail: "Mutasi tabungan dan pembelian wishlist dikunci pada level baris database untuk mencegah saldo negatif pada permintaan bersamaan.",
  },
];

export function LandingFooter() {
  return (
    <footer className="bg-[#0b0d11] text-white border-t border-white/10">
      {/* Security & Engineering Specifications */}
      <section
        id="keamanan"
        className="max-w-7xl mx-auto px-5 sm:px-8 py-20 sm:py-28 border-b border-white/10"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          <div className="lg:col-span-5 space-y-5">
            <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-[-0.025em] leading-[1.1] text-white">
              Keamanan dan keandalan sebagai fondasi, bukan tambahan.
            </h2>
            <p className="text-base text-white/75 leading-relaxed">
              Dibangun dengan backend Golang Fiber dan PostgreSQL Neon Serverless, setiap perhitungan saldo dan mutasi tabungan diproses secara deterministik di sisi server.
            </p>
            <div className="pt-2">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-md bg-[#14b8a6] hover:bg-[#0d9488] text-[#0b0d11] font-semibold text-sm transition-all duration-200 active:scale-[0.98]"
              >
                <span>Mulai Gunakan KasKu</span>
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          <div className="lg:col-span-7 divide-y divide-white/10 border-y border-white/10">
            {SECURITY_SPECS.map((spec) => {
              const Icon = spec.icon;
              return (
                <div
                  key={spec.title}
                  className="py-5 flex items-start gap-4"
                >
                  <Icon className="w-5 h-5 text-[#5eead4] shrink-0 mt-0.5" aria-hidden="true" />
                  <div className="space-y-1">
                    <h3 className="font-display text-base font-semibold text-white">
                      {spec.title}
                    </h3>
                    <p className="text-sm text-white/70 leading-relaxed">
                      {spec.detail}
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
              <rect x="2" y="2" width="24" height="24" rx="5" stroke="white" strokeWidth="1.75" />
              <path
                d="M9 8.5V19.5M9 14L17.5 8.5M12.5 11.8L18.5 19.5"
                stroke="#5eead4"
                strokeWidth="2"
                strokeLinecap="square"
              />
            </svg>
            <span className="font-display text-base font-semibold tracking-tight">
              KasKu Finance
            </span>
          </div>
          <p className="text-xs text-white/60">
            Sistem pencatat keuangan pribadi dengan saldo bebas, pos tabungan, dan simulasi wishlist.
          </p>
        </div>

        <nav className="flex flex-wrap items-center gap-6 text-sm text-white/75" aria-label="Navigasi footer">
          <a href="#misi" className="hover:text-white transition-colors">
            Misi
          </a>
          <a href="#arsitektur" className="hover:text-white transition-colors">
            Arsitektur
          </a>
          <a href="#simulasi" className="hover:text-white transition-colors">
            Simulasi
          </a>
          <a href="#keamanan" className="hover:text-white transition-colors">
            Keamanan
          </a>
          <Link href="/dashboard" className="text-[#5eead4] hover:text-white transition-colors font-medium">
            Dashboard
          </Link>
        </nav>

        <div className="text-xs text-white/50 font-mono">
          © 2026 KasKu Finance
        </div>
      </div>
    </footer>
  );
}
