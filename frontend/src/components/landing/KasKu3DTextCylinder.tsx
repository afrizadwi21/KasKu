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
  const [progress, setProgress] = useState(0);

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
      const totalScrollable = el.offsetHeight - window.innerHeight;
      if (totalScrollable <= 0) return;
      const raw = -rect.top / totalScrollable;
      setProgress(Math.max(0, Math.min(1, raw)));
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

  const totalItems = CYLINDER_ITEMS.length;
  const stepAngle = 22; // degrees per item on the 3D drum
  const radius = 260; // cylinder depth radius in px
  const currentRotation = progress * (totalItems - 1) * stepAngle;
  const activeIndex = Math.round(progress * (totalItems - 1));

  return (
    <section
      ref={sectionRef}
      aria-label="Roda Fitur 3D KasKu"
      className="relative h-[240vh] bg-[#140a05] text-[#f8f4ee] border-b border-[#f8f4ee]/15"
    >
      <div className="sticky top-0 h-screen w-full overflow-hidden flex flex-col justify-between py-20 sm:py-24 px-5 sm:px-8">
        <div className="max-w-7xl w-full mx-auto flex flex-col sm:flex-row sm:items-end justify-between gap-4 z-10">
          <div>
            <h2 className="font-display text-3xl sm:text-4xl text-[#f8f4ee]">
              Semua yang Anda butuhkan dalam satu alur.
            </h2>
            <p className="mt-2 text-sm text-[#ffc9a3]/80">
              Gulir turun atau naik untuk memutar daftar kemampuan KasKu.
            </p>
          </div>
          <div className="font-mono text-xs text-[#ff7a2e] num-tabular">
            {String(activeIndex + 1).padStart(2, "0")} / {String(totalItems).padStart(2, "0")}
          </div>
        </div>

        {/* 3D Cylinder Stage */}
        <div
          className="relative flex-1 w-full max-w-5xl mx-auto flex items-center justify-center"
          style={{ perspective: "1400px" }}
        >
          <ol
            className="relative w-full h-24 m-0 p-0 list-none flex items-center justify-center"
            style={{
              transformStyle: "preserve-3d",
              transform: `rotateX(${currentRotation}deg)`,
              transition: "transform 80ms cubic-bezier(0.16, 1, 0.3, 1)",
              willChange: "transform",
            }}
          >
            {CYLINDER_ITEMS.map((item, idx) => {
              const itemAngle = -idx * stepAngle;
              const deltaAngle = Math.abs(currentRotation + itemAngle);
              const isFocused = deltaAngle < stepAngle * 0.55;
              const opacity = Math.max(0.08, 1 - deltaAngle / 68);

              return (
                <li
                  key={item.label}
                  className="absolute inset-x-0 flex items-center justify-between gap-4 px-4 sm:px-8 py-3"
                  style={{
                    transform: `rotateX(${itemAngle}deg) translateZ(${radius}px)`,
                    backfaceVisibility: "hidden",
                    opacity,
                  }}
                >
                  <span
                    className={`font-display text-2xl sm:text-5xl lg:text-6xl tracking-tight transition-colors duration-150 ${
                      isFocused ? "text-[#ff5b14]" : "text-[#f8f4ee]"
                    }`}
                  >
                    {item.label}
                  </span>
                  <span
                    className={`hidden sm:inline-block font-mono text-xs uppercase tracking-widest px-3 py-1 rounded-sm border ${
                      isFocused
                        ? "border-[#ff5b14] text-[#ff7a2e] bg-[#ff5b14]/10"
                        : "border-[#f8f4ee]/20 text-[#ffc9a3]/70"
                    }`}
                  >
                    {item.tag}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="max-w-7xl w-full mx-auto flex items-center justify-between text-xs text-[#f8f4ee]/50">
          <span>Terus gulir untuk melanjutkan</span>
          <span className="font-mono num-tabular">{Math.round(progress * 100)}%</span>
        </div>
      </div>
    </section>
  );
}
