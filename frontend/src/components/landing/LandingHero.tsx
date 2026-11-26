"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Play } from "lucide-react";

const TELEMETRY_ITEMS = [
  { label: "Catatan Harian", value: "Uang Masuk & Keluar" },
  { label: "Pos Tabungan", value: "Pisah Uang Jajan & Target" },
  { label: "Wishlist", value: "Simulasi Sebelum Beli" },
  { label: "Privasi", value: "Akun Pribadi, Tanpa Iklan" },
];

export function LandingHero() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      if (window.scrollY < 900) {
        setScrollY(window.scrollY);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <section
      id="hero"
      className="relative min-h-[92vh] w-full flex flex-col justify-between overflow-hidden bg-black text-white"
    >
      {/* Animated Full-Bleed Architectural Photo */}
      <div
        className="absolute inset-0 z-0 overflow-hidden"
        style={{ transform: `translate3d(0, ${scrollY * 0.16}px, 0)` }}
      >
        <img
          src="/images/hero-kasku.jpg"
          alt="Meja kerja minimalis dengan arsitektur finansial yang tenang"
          className="w-full h-full object-cover object-center animate-ken-burns opacity-75"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/45 to-black/90"
        />
      </div>

      {/* Top Spacer for Fixed Navbar */}
      <div className="h-24 sm:h-28 relative z-10" />

      {/* Main Hero Thesis */}
      <div className="relative z-10 max-w-7xl w-full mx-auto px-5 sm:px-8 py-12 sm:py-20">
        <div className="max-w-3xl space-y-6 animate-reveal-up">
          <h1 className="font-display text-4xl sm:text-6xl lg:text-[4.5rem] font-semibold tracking-[-0.03em] leading-[1.03] text-balance text-white">
            Tahu persis uang yang boleh dipakai hari ini.
          </h1>
          <p className="text-base sm:text-xl text-[#e4e4e2] max-w-2xl leading-relaxed font-normal">
            KasKu memisahkan uang jajan dari tabungan Anda, mencatat siapa yang masih berhutang, mengingatkan tagihan rutin, dan menghitung sisa saldo sebelum Anda belanja.
          </p>

          <div className="pt-4 flex flex-wrap items-center gap-4">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-sm bg-white hover:bg-[#f5f5f3] text-black font-semibold text-sm sm:text-base transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38bdf8]"
            >
              <span>Mulai Catat Sekarang</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#showcase-3d"
              className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-sm border border-white/30 bg-white/5 hover:bg-white/15 text-white font-medium text-sm sm:text-base transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38bdf8]"
            >
              <Play className="w-4 h-4 text-[#38bdf8]" />
              <span>Lihat Cara Kerja 3D</span>
            </a>
          </div>
        </div>
      </div>

      {/* Bottom Telemetry Strip */}
      <div className="relative z-10 border-t border-white/15 bg-black/75 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-5 grid grid-cols-2 lg:grid-cols-4 gap-6">
          {TELEMETRY_ITEMS.map((item) => (
            <div key={item.label} className="space-y-1">
              <div className="text-xs uppercase tracking-wider text-[#bbbcbc] font-medium">
                {item.label}
              </div>
              <div className="font-mono text-sm sm:text-base font-medium text-white num-tabular">
                {item.value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
