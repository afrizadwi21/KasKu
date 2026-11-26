"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ShieldCheck, Lock, FileSpreadsheet, RotateCcw } from "lucide-react";
import { Scroll3DFrame } from "./Scroll3DFrame";
import { Text3D } from "./Text3D";

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
  const sectionRef = useRef<HTMLElement | null>(null);
  const [scrollOffset, setScrollOffset] = useState(0); // -1 .. 0 .. +1
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [cardTilt, setCardTilt] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    let rafId = 0;

    const update = () => {
      const el = sectionRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || 800;
      const center = rect.top + rect.height / 2;
      const norm = Math.max(-1, Math.min(1, (vh / 2 - center) / (vh * 0.7)));
      setScrollOffset(norm);
    };

    const onScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const handleCardPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    setCardTilt({ x: nx, y: ny });
  };

  return (
    <footer className="bg-[#140a05] text-[#f8f4ee] border-t border-[#f8f4ee]/15 overflow-hidden">
      {/* Privacy & Control Section with 3D Spatial Cascade Deck */}
      <section
        ref={sectionRef}
        id="privasi"
        className="max-w-7xl mx-auto px-5 sm:px-8 py-20 sm:py-28 border-b border-[#f8f4ee]/15"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">
          <div className="lg:col-span-5 space-y-5">
            <Text3D as="h2" variant="light" className="text-4xl sm:text-5xl text-[#f8f4ee]">
              Data keuangan Anda hanya untuk Anda.
            </Text3D>
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

            <Scroll3DFrame direction="left" intensity={1.25} className="pt-4">
              <div className="relative overflow-hidden rounded-sm border border-[#ff5b14]/25 bg-[#1a0e08] shadow-[0_24px_60px_-20px_rgba(255,91,20,0.22)]">
                <div className="aspect-[16/10] overflow-hidden">
                  <img
                    src="/images/3d-privacy-lock.jpg"
                    alt="Render 3D gembok keamanan data pribadi KasKu"
                    className="w-full h-full object-cover sepia-[.28] hue-rotate-[-24deg] contrast-110"
                  />
                </div>
              </div>
            </Scroll3DFrame>
          </div>

          {/* 3D Spatial Cascade Deck */}
          <div
            className="lg:col-span-7 space-y-4"
            style={{ perspective: "1600px", transformStyle: "preserve-3d" }}
          >
            {PRIVACY_POINTS.map((item, idx) => {
              const Icon = item.icon;
              const isFocused = activeIndex === idx;
              const isDimmed = activeIndex !== null && activeIndex !== idx;

              // Staggered 3D cascade depth driven by scroll up/down
              const wave = Math.sin((scrollOffset * 1.6) + idx * 0.65);
              const baseRotX = scrollOffset * (6 + idx * 2.2);
              const baseRotY = -6 + wave * 5;
              const baseTranslateZ = isFocused ? 38 : isDimmed ? -18 : wave * 14;
              const baseTranslateX = isFocused ? -8 : idx * 6 * (1 - Math.abs(scrollOffset));

              const hoverRotX = isFocused ? -cardTilt.y * 10 : baseRotX;
              const hoverRotY = isFocused ? cardTilt.x * 12 : baseRotY;

              return (
                <div
                  key={item.title}
                  onPointerEnter={() => setActiveIndex(idx)}
                  onPointerMove={handleCardPointerMove}
                  onPointerLeave={() => {
                    setActiveIndex(null);
                    setCardTilt({ x: 0, y: 0 });
                  }}
                  className={`relative rounded-sm border p-5 sm:p-6 transition-all duration-300 ease-out will-change-transform cursor-default ${
                    isFocused
                      ? "border-[#ff5b14] bg-[#24130b] shadow-[0_24px_50px_-18px_rgba(255,91,20,0.35)]"
                      : "border-[#f8f4ee]/15 bg-[#1a0e08]/90"
                  }`}
                  style={{
                    transform: `translate3d(${baseTranslateX}px, 0, ${baseTranslateZ}px) rotateX(${hoverRotX}deg) rotateY(${hoverRotY}deg) scale(${
                      isFocused ? 1.02 : isDimmed ? 0.97 : 1
                    })`,
                    opacity: isDimmed ? 0.65 : 1,
                    transformStyle: "preserve-3d",
                  }}
                >
                  <div className="flex items-start gap-4" style={{ transform: "translateZ(18px)" }}>
                    <div
                      className={`p-2.5 rounded-sm border transition-colors ${
                        isFocused
                          ? "border-[#ff5b14] bg-[#ff5b14]/15 text-[#ff7a2e]"
                          : "border-[#f8f4ee]/15 bg-[#140a05] text-[#ff7a2e]"
                      }`}
                    >
                      <Icon className="w-5 h-5 shrink-0" aria-hidden="true" />
                    </div>
                    <div className="space-y-1.5">
                      <h3 className="font-display-sub text-lg text-[#f8f4ee]">
                        {item.title}
                      </h3>
                      <p className="text-sm text-[#ffc9a3]/80 leading-relaxed">
                        {item.detail}
                      </p>
                    </div>
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
