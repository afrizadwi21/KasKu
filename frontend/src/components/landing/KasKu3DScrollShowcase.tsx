"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowRight } from "lucide-react";

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
  const [progress, setProgress] = useState<number>(0);
  const [pointer, setPointer] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Track native scroll progress smoothly on both scroll down & scroll up
  useEffect(() => {
    let rafId = 0;

    const updateProgress = () => {
      const el = sectionRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const totalScrollable = el.offsetHeight - window.innerHeight;
      if (totalScrollable <= 0) return;

      const raw = -rect.top / totalScrollable;
      const clamped = Math.max(0, Math.min(1, raw));
      setProgress(clamped);
    };

    const onScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(updateProgress);
    };

    updateProgress();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = stageRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    setPointer({ x: nx, y: ny });
  };

  const handlePointerLeave = () => {
    setPointer({ x: 0, y: 0 });
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

  const activeStage = progress < 0.34 ? 0 : progress < 0.68 ? 1 : 2;
  const progressPct = Math.round(progress * 100);
  const currentStage = STAGES[activeStage];

  // Continuous 3D spatial transform driven by scroll up/down + pointer tilt
  const localPhase =
    activeStage === 0
      ? progress / 0.34
      : activeStage === 1
      ? (progress - 0.34) / 0.34
      : (progress - 0.68) / 0.32;

  const scrollRotateY = (localPhase - 0.5) * 18 + pointer.x * 16;
  const scrollRotateX = (0.5 - localPhase) * 10 - pointer.y * 12;
  const scrollScale = 0.96 + Math.sin(localPhase * Math.PI) * 0.08;

  return (
    <section
      ref={sectionRef}
      id="showcase-3d"
      className="relative h-[280vh] bg-[#140a05] text-[#f8f4ee] border-y border-[#f8f4ee]/15"
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
                    ? "bg-[#ff5b14] text-white"
                    : "bg-[#f8f4ee]/10 text-[#ffc9a3]/80 hover:text-[#f8f4ee]"
                }`}
              >
                {st.title}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-28 h-1 bg-[#f8f4ee]/15 overflow-hidden rounded-full">
                <div
                  className="h-full bg-[#ff5b14] transition-all duration-150"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <span className="font-mono text-xs text-[#ffc9a3]/80 num-tabular w-9 text-right">
                {progressPct}%
              </span>
            </div>

            <a
              href="#cara-kerja"
              className="inline-flex items-center gap-1 text-xs text-[#ffc9a3]/80 hover:text-[#f8f4ee] transition-colors"
            >
              <span>Lewati</span>
              <ArrowDown className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Center 3D Product Render Stage + Narrative */}
        <div className="max-w-7xl w-full mx-auto px-5 sm:px-8 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-5 space-y-5 z-10">
            <h2 className="font-display text-4xl sm:text-5xl text-[#f8f4ee]">
              {currentStage.title}
            </h2>
            <p className="text-sm sm:text-base text-[#ffc9a3]/85 leading-relaxed">
              {currentStage.description}
            </p>

            <div className="pt-4 border-t border-[#f8f4ee]/15 flex items-baseline justify-between">
              <span className="text-xs uppercase tracking-wider text-[#ffc9a3]/75">
                {currentStage.metricLabel}
              </span>
              <span className="font-mono text-2xl font-semibold text-[#ff7a2e] num-tabular">
                {currentStage.metricValue}
              </span>
            </div>

            <div className="pt-2">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 text-sm font-medium text-[#f8f4ee] hover:text-[#ff7a2e] transition-colors"
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
              className="relative w-full h-full max-w-2xl transition-transform duration-150 ease-out will-change-transform"
              style={{
                transform: `rotateX(${scrollRotateX}deg) rotateY(${scrollRotateY}deg) scale(${scrollScale})`,
                transformStyle: "preserve-3d",
              }}
            >
              {STAGES.map((stage) => {
                const isActive = activeStage === stage.id;
                return (
                  <div
                    key={stage.id}
                    className={`absolute inset-0 flex items-center justify-center transition-all duration-500 ease-out ${
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
