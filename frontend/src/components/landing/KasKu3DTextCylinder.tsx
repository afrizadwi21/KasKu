"use client";

import React, { useEffect, useRef, useState } from "react";

const CYLINDER_ITEMS = [
  { label: "Catat Uang Masuk & Keluar", tag: "Arus Kas" },
  { label: "Pisahkan Uang Jajan", tag: "Saldo Bebas" },
  { label: "Pos Tabungan & Target", tag: "Dana Darurat" },
  { label: "Simulasi Sebelum Beli", tag: "Wishlist" },
  { label: "Hitung Jatah Harian", tag: "Batas Aman" },
  { label: "Lacak Piutang & Cicilan", tag: "Hutang Teman" },
  { label: "Pantau Tagihan Rutin", tag: "Langganan" },
  { label: "Unduh Laporan CSV", tag: "Rekap Data" },
];

export function KasKu3DTextCylinder() {
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const drumRef = useRef<HTMLOListElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [progressPct, setProgressPct] = useState(0);

  const totalItems = CYLINDER_ITEMS.length;
  const stepAngle = 22;
  const radius = 260;

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    let currentP = 0;
    let lastIdx = -1;
    let lastPct = -1;
    let rafId = 0;

    const tick = () => {
      const el = sectionRef.current;
      const drum = drumRef.current;
      if (el && drum) {
        const rect = el.getBoundingClientRect();
        const totalScrollable = el.offsetHeight - window.innerHeight;
        const targetP =
          totalScrollable > 0
            ? Math.max(0, Math.min(1, -rect.top / totalScrollable))
            : 0;

        // Slow, realistic physical inertia on scroll up & down
        currentP += (targetP - currentP) * 0.05;

        const currentRotation = currentP * (totalItems - 1) * stepAngle;
        drum.style.transform = `rotateX(${currentRotation.toFixed(2)}deg)`;

        const idx = Math.round(currentP * (totalItems - 1));
        if (idx !== lastIdx) {
          lastIdx = idx;
          setActiveIndex(idx);
        }

        const pct = Math.round(currentP * 100);
        if (pct !== lastPct) {
          lastPct = pct;
          setProgressPct(pct);
        }
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [totalItems, stepAngle]);

  return (
    <section
      ref={sectionRef}
      aria-label="Roda Fitur 3D KasKu"
      className="relative h-[260vh] bg-[#070a09] text-[#f4f7f5] border-b border-[#f4f7f5]/15"
    >
      <div className="sticky top-0 h-screen w-full overflow-hidden flex flex-col justify-between py-20 sm:py-24 px-5 sm:px-8">
        <div className="max-w-7xl w-full mx-auto flex flex-col sm:flex-row sm:items-end justify-between gap-4 z-10">
          <div>
            <h2 className="font-display text-3xl sm:text-4xl text-[#f4f7f5]">
              Semua yang Anda butuhkan dalam satu alur.
            </h2>
            <p className="mt-2 text-sm text-[#a3b8ad]">
              Gulir turun atau naik untuk memutar daftar kemampuan KasKu.
            </p>
          </div>
          <div className="font-mono text-xs text-[#34d399] num-tabular">
            {String(activeIndex + 1).padStart(2, "0")} / {String(totalItems).padStart(2, "0")}
          </div>
        </div>

        {/* 3D Cylinder Stage */}
        <div
          className="relative flex-1 w-full max-w-5xl mx-auto flex items-center justify-center"
          style={{ perspective: "1400px" }}
        >
          <ol
            ref={drumRef}
            className="relative w-full h-24 m-0 p-0 list-none flex items-center justify-center will-change-transform"
            style={{ transformStyle: "preserve-3d" }}
          >
            {CYLINDER_ITEMS.map((item, idx) => {
              const itemAngle = -idx * stepAngle;
              const dist = Math.abs(activeIndex - idx);
              const isFocused = dist === 0;
              const opacity = Math.max(0.1, 1 - dist * 0.28);

              return (
                <li
                  key={item.label}
                  className="absolute inset-x-0 flex items-center justify-between gap-4 px-4 sm:px-8 py-3 transition-opacity duration-300"
                  style={{
                    transform: `rotateX(${itemAngle}deg) translateZ(${radius}px)`,
                    backfaceVisibility: "hidden",
                    opacity,
                  }}
                >
                  <span
                    className={`font-display text-2xl sm:text-5xl lg:text-6xl tracking-tight transition-colors duration-300 ${
                      isFocused ? "text-[#10b981]" : "text-[#f4f7f5]"
                    }`}
                  >
                    {item.label}
                  </span>
                  <span
                    className={`hidden sm:inline-block font-mono text-xs uppercase tracking-widest px-3 py-1 rounded-sm border transition-colors duration-300 ${
                      isFocused
                        ? "border-[#10b981] text-[#34d399] bg-[#10b981]/10"
                        : "border-[#f4f7f5]/20 text-[#a3b8ad]"
                    }`}
                  >
                    {item.tag}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="max-w-7xl w-full mx-auto flex items-center justify-between text-xs text-[#f4f7f5]/50">
          <span>Terus gulir untuk melanjutkan</span>
          <span className="font-mono num-tabular">{progressPct}%</span>
        </div>
      </div>
    </section>
  );
}
