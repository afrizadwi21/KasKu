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
      className="relative min-h-[92vh] w-full flex flex-col justify-between overflow-hidden bg-[#140a05] text-[#f8f4ee]"
    >
      {/* Animated Full-Bleed Architectural Photo with 3D Scroll Depth */}
      <div
        className="absolute inset-0 z-0 overflow-hidden [perspective:1200px]"
        style={{
          transform: `translate3d(0, ${scrollY * 0.22}px, 0) scale(${1 + Math.min(0.12, scrollY * 0.00018)})`,
        }}
      >
        <img
          src="/images/hero-kasku.jpg"
          alt="Meja kerja minimalis dengan arsitektur finansial yang tenang"
          className="w-full h-full object-cover object-center animate-ken-burns opacity-65"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-b from-[#140a05]/85 via-[#1a0e08]/55 to-[#140a05]/95"
        />
      </div>

      {/* Top Spacer for Fixed Navbar */}
      <div className="h-24 sm:h-28 relative z-10" />

      {/* Main Hero Thesis */}
      <div
        className="relative z-10 max-w-7xl w-full mx-auto px-5 sm:px-8 py-12 sm:py-20 transition-transform duration-150 ease-out will-change-transform"
        style={{
          transform: `translate3d(0, ${-scrollY * 0.08}px, 0)`,
          opacity: Math.max(0.2, 1 - scrollY / 750),
        }}
      >
        <div className="max-w-3xl space-y-6 animate-reveal-up">
          <h1 className="font-display text-5xl sm:text-7xl lg:text-[5.25rem] text-balance text-[#f8f4ee]">
            Tahu persis uang yang boleh dipakai hari ini.
          </h1>
          <p className="text-base sm:text-xl text-[#ffc9a3]/90 max-w-2xl leading-relaxed font-normal">
            KasKu memisahkan uang jajan dari tabungan Anda, mencatat siapa yang masih berhutang, mengingatkan tagihan rutin, dan menghitung sisa saldo sebelum Anda belanja.
          </p>

          <div className="pt-4 flex flex-wrap items-center gap-4">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-sm bg-[#ff5b14] hover:bg-[#ff7a2e] text-white font-semibold text-sm sm:text-base transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffc9a3]"
            >
              <span>Mulai Catat Sekarang</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#showcase-3d"
              className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-sm border border-[#f8f4ee]/30 bg-[#f8f4ee]/5 hover:bg-[#f8f4ee]/15 text-[#f8f4ee] font-medium text-sm sm:text-base transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff5b14]"
            >
              <Play className="w-4 h-4 text-[#ff7a2e]" />
              <span>Lihat Cara Kerja 3D</span>
            </a>
          </div>
        </div>
      </div>

      {/* Bottom Telemetry Strip */}
      <div className="relative z-10 border-t border-[#f8f4ee]/15 bg-[#140a05]/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-5 grid grid-cols-2 lg:grid-cols-4 gap-6">
          {TELEMETRY_ITEMS.map((item) => (
            <div key={item.label} className="space-y-1">
              <div className="text-xs uppercase tracking-wider text-[#ffc9a3]/75 font-medium">
                {item.label}
              </div>
              <div className="font-mono text-sm sm:text-base font-medium text-[#f8f4ee] num-tabular">
                {item.value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
