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
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const activeIndexRef = useRef<number | null>(null);
  const cardTiltRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    let currentOffset = 0;
    let currentTiltX = 0;
    let currentTiltY = 0;
    let rafId = 0;

    const tick = () => {
      const el = sectionRef.current;
      if (el) {
        const rect = el.getBoundingClientRect();
        const vh = window.innerHeight || 800;
        const center = rect.top + rect.height / 2;
        const targetOffset = Math.max(-1.1, Math.min(1.1, (vh / 2 - center) / (vh * 0.65)));

        // Slow, realistic damped inertia (0.045)
        currentOffset += (targetOffset - currentOffset) * 0.045;
        currentTiltX += (cardTiltRef.current.x - currentTiltX) * 0.07;
        currentTiltY += (cardTiltRef.current.y - currentTiltY) * 0.07;

        const focusedIdx = activeIndexRef.current;

        cardRefs.current.forEach((card, idx) => {
          if (!card) return;
          const isFocused = focusedIdx === idx;
          const isDimmed = focusedIdx !== null && focusedIdx !== idx;

          const wave = Math.sin(currentOffset * 1.8 + idx * 0.7);
          const baseRotX = currentOffset * (9 + idx * 2.5);
          const baseRotY = -7 + wave * 6.5;
          const baseTranslateZ = isFocused ? 42 : isDimmed ? -20 : wave * 18;
          const baseTranslateX = isFocused ? -10 : idx * 8 * (1 - Math.abs(currentOffset));

          const finalRotX = isFocused ? -currentTiltY * 12 : baseRotX;
          const finalRotY = isFocused ? currentTiltX * 14 : baseRotY;
          const scale = isFocused ? 1.025 : isDimmed ? 0.965 : 1;

          card.style.transform = `translate3d(${baseTranslateX.toFixed(2)}px, 0, ${baseTranslateZ.toFixed(2)}px) rotateX(${finalRotX.toFixed(2)}deg) rotateY(${finalRotY.toFixed(2)}deg) scale(${scale.toFixed(3)})`;
        });
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const handleCardPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    cardTiltRef.current = {
      x: (e.clientX - rect.left) / rect.width - 0.5,
      y: (e.clientY - rect.top) / rect.height - 0.5,
    };
  };

  return (
    <footer className="bg-[#070a09] text-[#f4f7f5] border-t border-[#f4f7f5]/15 overflow-hidden">
      {/* Privacy & Control Section with Slow Physics-Damped 3D Spatial Cascade Deck */}
      <section
        ref={sectionRef}
        id="privasi"
        className="max-w-7xl mx-auto px-5 sm:px-8 py-20 sm:py-28 border-b border-[#f4f7f5]/15"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">
          <div className="lg:col-span-5 space-y-5">
            <Text3D as="h2" variant="light" className="text-4xl sm:text-5xl text-[#f4f7f5]">
              Data keuangan Anda hanya untuk Anda.
            </Text3D>
            <p className="text-base text-[#a3b8ad] leading-relaxed">
              KasKu dibuat sebagai alat bantu catat pribadi yang tenang. Semua angka dihitung apa adanya supaya Anda selalu tahu kondisi uang Anda sebelum mengambil keputusan.
            </p>
            <div className="pt-2">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-sm bg-[#10b981] hover:bg-[#34d399] text-[#070a09] font-semibold text-sm transition-all duration-200 active:scale-[0.98]"
              >
                <span>Mulai Pakai KasKu</span>
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>

            <Scroll3DFrame direction="left" intensity={1.25} className="pt-4">
              <div className="relative overflow-hidden rounded-sm border border-[#10b981]/25 bg-[#0e1412] shadow-[0_24px_60px_-20px_rgba(16,185,129,0.22)]">
                <div className="aspect-[16/10] overflow-hidden">
                  <img
                    src="/images/3d-privacy-lock.jpg"
                    alt="Render 3D gembok keamanan data pribadi KasKu"
                    className="w-full h-full object-cover contrast-110"
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

              return (
                <div
                  key={item.title}
                  ref={(el) => {
                    cardRefs.current[idx] = el;
                  }}
                  onPointerEnter={() => setActiveIndex(idx)}
                  onPointerMove={handleCardPointerMove}
                  onPointerLeave={() => {
                    setActiveIndex(null);
                    cardTiltRef.current = { x: 0, y: 0 };
                  }}
                  className={`relative rounded-sm border p-5 sm:p-6 transition-colors duration-300 will-change-transform cursor-default ${
                    isFocused
                      ? "border-[#10b981] bg-[#121c18] shadow-[0_24px_50px_-18px_rgba(16,185,129,0.3)]"
                      : "border-[#f4f7f5]/15 bg-[#0e1412]/90"
                  }`}
                  style={{
                    opacity: isDimmed ? 0.65 : 1,
                    transformStyle: "preserve-3d",
                  }}
                >
                  <div className="flex items-start gap-4" style={{ transform: "translateZ(18px)" }}>
                    <div
                      className={`p-2.5 rounded-sm border transition-colors ${
                        isFocused
                          ? "border-[#10b981] bg-[#10b981]/15 text-[#34d399]"
                          : "border-[#f4f7f5]/15 bg-[#070a09] text-[#34d399]"
                      }`}
                    >
                      <Icon className="w-5 h-5 shrink-0" aria-hidden="true" />
                    </div>
                    <div className="space-y-1.5">
                      <h3 className="font-display-sub text-lg text-[#f4f7f5]">
                        {item.title}
                      </h3>
                      <p className="text-sm text-[#a3b8ad] leading-relaxed">
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
              <rect x="2" y="2" width="24" height="24" rx="4" stroke="#f4f7f5" strokeWidth="1.75" />
              <path
                d="M9 8.5V19.5M9 14L17.5 8.5M12.5 11.8L18.5 19.5"
                stroke="#10b981"
                strokeWidth="2.2"
                strokeLinecap="square"
              />
            </svg>
            <span className="font-display text-lg tracking-tight">
              KasKu
            </span>
          </div>
          <p className="text-xs text-[#a3b8ad]">
            Catatan kas pribadi dengan saldo bebas, pos tabungan, dan simulasi wishlist.
          </p>
        </div>

        <nav className="flex flex-wrap items-center gap-6 text-sm text-[#a3b8ad]" aria-label="Navigasi footer">
          <a href="#cara-kerja" className="hover:text-[#f4f7f5] transition-colors">
            Cara Kerja
          </a>
          <a href="#fitur" className="hover:text-[#f4f7f5] transition-colors">
            Fitur
          </a>
          <a href="#simulasi" className="hover:text-[#f4f7f5] transition-colors">
            Simulasi
          </a>
          <a href="#privasi" className="hover:text-[#f4f7f5] transition-colors">
            Privasi
          </a>
          <Link href="/dashboard" className="text-[#34d399] hover:text-[#f4f7f5] transition-colors font-medium">
            Dashboard
          </Link>
        </nav>

        <div className="text-xs text-[#f4f7f5]/50 font-mono">
          © 2026 KasKu
        </div>
      </div>
    </footer>
  );
}
