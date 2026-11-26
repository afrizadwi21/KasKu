"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Play } from "lucide-react";
import { KasKu3DCore } from "./KasKu3DCore";

const TELEMETRY_ITEMS = [
  { label: "Arsitektur", value: "Golang + Next.js" },
  { label: "Keamanan", value: "JWT HS256 & Bcrypt" },
  { label: "Privasi", value: "0% Iklan & Pelacak" },
  { label: "Isolasi", value: "100% Multi-User" },
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
          className="w-full h-full object-cover object-center animate-ken-burns opacity-65"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/55 to-black/95"
        />
      </div>

      {/* Top Spacer for Fixed Navbar */}
      <div className="h-20 sm:h-24 relative z-10" />

      {/* Main Hero Thesis + Live 3D WebGL Telemetry Core */}
      <div className="relative z-10 max-w-7xl w-full mx-auto px-5 sm:px-8 py-10 sm:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          <div className="lg:col-span-7 space-y-6 animate-reveal-up">
            <h1 className="font-display text-4xl sm:text-6xl lg:text-[4.25rem] font-semibold tracking-[-0.03em] leading-[1.03] text-balance text-white">
              Presisi baru dalam mengelola kas pribadi.
            </h1>
            <p className="text-base sm:text-xl text-[#e4e4e2] max-w-2xl leading-relaxed font-normal">
              Pisahkan saldo bebas dari pos tabungan, pantau piutang dan langganan otomatis, serta simulasikan setiap pembelian wishlist sebelum uang keluar.
            </p>

            <div className="pt-3 flex flex-wrap items-center gap-4">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-sm bg-white hover:bg-[#f5f5f3] text-black font-semibold text-sm sm:text-base transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38bdf8]"
              >
                <span>Buka Dashboard KasKu</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="#simulasi"
                className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-sm border border-white/30 bg-white/5 hover:bg-white/15 text-white font-medium text-sm sm:text-base transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38bdf8]"
              >
                <Play className="w-4 h-4 text-[#38bdf8]" />
                <span>Coba Simulasi Beli</span>
              </a>
            </div>
          </div>

          <div className="lg:col-span-5 animate-reveal-up">
            <KasKu3DCore compact />
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
