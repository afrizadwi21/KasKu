"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowRight } from "lucide-react";
import { Text3D } from "./Text3D";

const STAGES = [
  {
    id: 0,
    title: "Catat Masuk & Keluar Harian",
    description:
      "Setiap pemasukan dan belanja langsung memperbarui saldo Anda. Rincian barang yang dibeli ikut tercatat rapi sehingga Anda tahu ke mana uang pergi.",
    metricLabel: "Total Uang Saat Ini",
    metricValue: "Rp 65.353",
    image: "/images/3d-card.jpg",
    imageAlt: "Render 3D kartu finansial KasKu",
  },
  {
    id: 1,
    title: "Pisahkan Pos Tabungan",
    description:
      "Sisihkan uang untuk Dana Darurat atau barang impian. Uang di tabungan tetap milik Anda, tetapi saldo jajan otomatis berkurang supaya tidak ikut terpakai.",
    metricLabel: "Uang Disisihkan",
    metricValue: "Rp 20.000",
    image: "/images/3d-vault.jpg",
    imageAlt: "Render 3D brankas pos tabungan KasKu",
  },
  {
    id: 2,
    title: "Hitung Sisa Sebelum Belanja",
    description:
      "Cek dulu apakah saldo jajan cukup untuk membeli barang wishlist dan membayar tagihan minggu ini. Jatah belanja harian ikut dihitung otomatis.",
    metricLabel: "Uang Boleh Dipakai",
    metricValue: "Rp 45.353",
    image: "/images/3d-wishlist.jpg",
    imageAlt: "Render 3D barang wishlist dan simulasi KasKu",
  },
];

export function KasKu3DScrollShowcase() {
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const inner3DRef = useRef<HTMLDivElement | null>(null);
  const barRef = useRef<HTMLDivElement | null>(null);
  const pointerRef = useRef({ x: 0, y: 0, active: false });

  const [activeStage, setActiveStage] = useState<number>(0);
  const [progressPct, setProgressPct] = useState<number>(0);

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    let currentP = 0;
    let currentPx = 0;
    let currentPy = 0;
    let lastStage = 0;
    let lastPct = -1;
    let rafId = 0;

    const tick = () => {
      const el = sectionRef.current;
      const inner = inner3DRef.current;
      if (el && inner) {
        const rect = el.getBoundingClientRect();
        const totalScrollable = el.offsetHeight - window.innerHeight;
        const targetP =
          totalScrollable > 0
            ? Math.max(0, Math.min(1, -rect.top / totalScrollable))
            : 0;

        // Slow, realistic damped inertia (0.045)
        currentP += (targetP - currentP) * 0.045;

        const targetPx = pointerRef.current.active ? pointerRef.current.x : 0;
        const targetPy = pointerRef.current.active ? pointerRef.current.y : 0;
        currentPx += (targetPx - currentPx) * 0.06;
        currentPy += (targetPy - currentPy) * 0.06;

        const stage = currentP < 0.34 ? 0 : currentP < 0.68 ? 1 : 2;
        if (stage !== lastStage) {
          lastStage = stage;
          setActiveStage(stage);
        }

        const pct = Math.round(currentP * 100);
        if (pct !== lastPct) {
          lastPct = pct;
          setProgressPct(pct);
          if (barRef.current) {
            barRef.current.style.width = `${pct}%`;
          }
        }

        const localPhase =
          stage === 0
            ? currentP / 0.34
            : stage === 1
            ? (currentP - 0.34) / 0.34
            : (currentP - 0.68) / 0.32;

        const rotY = (localPhase - 0.5) * 24 + currentPx * 18;
        const rotX = (0.5 - localPhase) * 14 - currentPy * 14;
        const scale = 0.95 + Math.sin(localPhase * Math.PI) * 0.09;

        inner.style.transform = `rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) scale(${scale.toFixed(4)})`;
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = stageRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    pointerRef.current = {
      x: (e.clientX - rect.left) / rect.width - 0.5,
      y: (e.clientY - rect.top) / rect.height - 0.5,
      active: true,
    };
  };

  const handlePointerLeave = () => {
    pointerRef.current = { x: 0, y: 0, active: false };
  };

  const scrollToStage = (idx: number) => {
    const el = sectionRef.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    const totalScrollable = el.offsetHeight - window.innerHeight;
    const targetFrac = idx === 0 ? 0.1 : idx === 1 ? 0.5 : 0.9;
    window.scrollTo({
      top: top + totalScrollable * targetFrac,
      behavior: "smooth",
    });
  };

  const currentStage = STAGES[activeStage];

  return (
    <section
      ref={sectionRef}
      id="showcase-3d"
      className="relative h-[300vh] bg-[#070a09] text-[#f4f7f5] border-y border-[#f4f7f5]/15"
    >
      <div className="sticky top-0 h-screen w-full overflow-hidden flex flex-col justify-between pt-20 sm:pt-24 pb-6">
        {/* Top Stage Navigation & Scroll Progress */}
        <div className="max-w-7xl w-full mx-auto px-5 sm:px-8 flex flex-wrap items-center justify-between gap-4 z-10">
          <div className="flex flex-wrap items-center gap-2">
            {STAGES.map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => scrollToStage(st.id)}
                className={`px-3 py-1.5 rounded-sm text-xs font-medium transition-colors ${
                  activeStage === st.id
                    ? "bg-[#10b981] text-[#070a09] font-semibold"
                    : "bg-[#f4f7f5]/10 text-[#a3b8ad] hover:text-[#f4f7f5]"
                }`}
              >
                {st.title}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-28 h-1 bg-[#f4f7f5]/15 overflow-hidden rounded-full">
                <div
                  ref={barRef}
                  className="h-full bg-[#10b981]"
                  style={{ width: "0%" }}
                />
              </div>
              <span className="font-mono text-xs text-[#a3b8ad] num-tabular w-9 text-right">
                {progressPct}%
              </span>
            </div>

            <a
              href="#cara-kerja"
              className="inline-flex items-center gap-1 text-xs text-[#a3b8ad] hover:text-[#f4f7f5] transition-colors"
            >
              <span>Lewati</span>
              <ArrowDown className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Center 3D Product Render Stage + Narrative */}
        <div className="max-w-7xl w-full mx-auto px-5 sm:px-8 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-5 space-y-5 z-10">
            <Text3D as="h2" variant="light" className="text-4xl sm:text-5xl text-[#f4f7f5]">
              {currentStage.title}
            </Text3D>
            <p className="text-sm sm:text-base text-[#a3b8ad] leading-relaxed">
              {currentStage.description}
            </p>

            <div className="pt-4 border-t border-[#f4f7f5]/15 flex items-baseline justify-between">
              <span className="text-xs uppercase tracking-wider text-[#a3b8ad]/80">
                {currentStage.metricLabel}
              </span>
              <span className="font-mono text-2xl font-semibold text-[#34d399] num-tabular">
                {currentStage.metricValue}
              </span>
            </div>

            <div className="pt-2">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 text-sm font-medium text-[#f4f7f5] hover:text-[#34d399] transition-colors"
              >
                <span>Buka di Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* 3D Scroll-Reactive Product Render Viewport */}
          <div
            ref={stageRef}
            onPointerMove={handlePointerMove}
            onPointerLeave={handlePointerLeave}
            className="lg:col-span-7 h-[300px] sm:h-[420px] lg:h-[500px] relative flex items-center justify-center [perspective:1400px]"
          >
            <div
              ref={inner3DRef}
              className="relative w-full h-full max-w-2xl will-change-transform"
              style={{ transformStyle: "preserve-3d" }}
            >
              {STAGES.map((stage) => {
                const isActive = activeStage === stage.id;
                return (
                  <div
                    key={stage.id}
                    className={`absolute inset-0 flex items-center justify-center transition-all duration-700 ease-out ${
                      isActive
                        ? "opacity-100 scale-100"
                        : "opacity-0 scale-95 pointer-events-none"
                    }`}
                  >
                    <img
                      src={stage.image}
                      alt={stage.imageAlt}
                      className="w-full h-full object-contain rounded-sm"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom Scroll Guidance */}
        <div className="max-w-7xl w-full mx-auto px-5 sm:px-8 flex items-center justify-between text-xs text-white/50 z-10">
          <span>Scroll turun atau naik untuk menggerakkan animasi 3D</span>
          <span className="font-mono">Tampilan 3D</span>
        </div>
      </div>
    </section>
  );
}
