"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
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
  },
  {
    id: 1,
    title: "Pisahkan Pos Tabungan",
    description:
      "Sisihkan uang untuk Dana Darurat atau barang impian. Uang di tabungan tetap milik Anda, tetapi saldo jajan otomatis berkurang supaya tidak ikut terpakai.",
    metricLabel: "Uang Disisihkan",
    metricValue: "Rp 20.000",
  },
  {
    id: 2,
    title: "Hitung Sisa Sebelum Belanja",
    description:
      "Cek dulu apakah saldo jajan cukup untuk membeli barang wishlist dan membayar tagihan minggu ini. Jatah belanja harian ikut dihitung otomatis.",
    metricLabel: "Uang Boleh Dipakai",
    metricValue: "Rp 45.353",
  },
];

export function KasKu3DScrollShowcase() {
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const mountRef = useRef<HTMLDivElement | null>(null);
  const progressRef = useRef<number>(0);
  const [activeStage, setActiveStage] = useState<number>(0);
  const [progressPct, setProgressPct] = useState<number>(0);

  // Track native scroll progress (works smoothly both scrolling down and scrolling up)
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
      progressRef.current = clamped;
      setProgressPct(Math.round(clamped * 100));

      if (clamped < 0.34) {
        setActiveStage(0);
      } else if (clamped < 0.68) {
        setActiveStage(1);
      } else {
        setActiveStage(2);
      }
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

  // Three.js 3D Finance Scene driven by scroll progress + subtle mouse tilt
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const width = container.clientWidth || 640;
    const height = container.clientHeight || 520;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 0.6, 7.2);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    // Studio Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.5);
    keyLight.position.set(5, 8, 6);
    scene.add(keyLight);

    const skyRim = new THREE.PointLight(0x38bdf8, 5, 20);
    skyRim.position.set(-5, 2, 4);
    scene.add(skyRim);

    const warmFill = new THREE.PointLight(0xfef3c7, 1.8, 15);
    warmFill.position.set(4, -3, 3);
    scene.add(warmFill);

    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    // === STAGE 1 OBJECTS: 3D Titanium Financial Card + Orbiting Coins ===
    const cardGroup = new THREE.Group();
    rootGroup.add(cardGroup);

    // Sleek Titanium Card Body (3.4 x 2.15 x 0.1)
    const cardGeo = new THREE.BoxGeometry(3.4, 2.15, 0.09);
    const cardMat = new THREE.MeshStandardMaterial({
      color: 0x16191f,
      metalness: 0.85,
      roughness: 0.22,
    });
    const cardMesh = new THREE.Mesh(cardGeo, cardMat);
    cardGroup.add(cardMesh);

    // Brushed Silver Edge Frame
    const cardEdgeGeo = new THREE.EdgesGeometry(cardGeo);
    const cardEdgeMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.75,
    });
    const cardEdges = new THREE.LineSegments(cardEdgeGeo, cardEdgeMat);
    cardMesh.add(cardEdges);

    // Gold/Brass EMV Chip
    const chipGeo = new THREE.BoxGeometry(0.46, 0.34, 0.02);
    const chipMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      metalness: 0.9,
      roughness: 0.2,
    });
    const chipMesh = new THREE.Mesh(chipGeo, chipMat);
    chipMesh.position.set(-1.05, 0.25, 0.055);
    cardMesh.add(chipMesh);

    // Card Accent Stripe (Sky Blue)
    const stripeGeo = new THREE.BoxGeometry(3.1, 0.06, 0.015);
    const stripeMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const stripeMesh = new THREE.Mesh(stripeGeo, stripeMat);
    stripeMesh.position.set(0, -0.58, 0.055);
    cardMesh.add(stripeMesh);

    // Floating 3D Metallic Coins around Card
    const coinGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.06, 32);
    const coinMat = new THREE.MeshStandardMaterial({
      color: 0xe4e4e2,
      metalness: 0.85,
      roughness: 0.18,
    });
    const coin1 = new THREE.Mesh(coinGeo, coinMat);
    coin1.rotation.x = Math.PI / 2.4;
    coin1.position.set(2.05, 0.85, 0.5);
    cardGroup.add(coin1);

    const coin2 = new THREE.Mesh(coinGeo, coinMat);
    coin2.rotation.x = Math.PI / 2.2;
    coin2.rotation.z = 0.4;
    coin2.position.set(-2.0, -0.75, 0.6);
    cardGroup.add(coin2);

    // === STAGE 2 OBJECTS: 3D Savings Pots / Vault Cylinders ===
    const vaultGroup = new THREE.Group();
    rootGroup.add(vaultGroup);

    const potSpecs = [
      { x: -1.35, h: 1.3, color: 0xbbbcbc },
      { x: 0, h: 2.15, color: 0x38bdf8 },
      { x: 1.35, h: 1.65, color: 0xe4e4e2 },
    ];
    const potMeshes: THREE.Mesh[] = [];
    const potGeos: THREE.BufferGeometry[] = [];
    const potMats: THREE.Material[] = [];

    potSpecs.forEach((spec) => {
      const geo = new THREE.CylinderGeometry(0.48, 0.48, spec.h, 36);
      const mat = new THREE.MeshStandardMaterial({
        color: spec.color,
        metalness: 0.72,
        roughness: 0.25,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(spec.x, spec.h / 2 - 0.9, 0);
      vaultGroup.add(mesh);
      potMeshes.push(mesh);
      potGeos.push(geo);
      potMats.push(mat);
    });

    // Vault Base Plate
    const baseGeo = new THREE.BoxGeometry(4.2, 0.08, 1.5);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x1c1f26,
      metalness: 0.8,
      roughness: 0.3,
    });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.set(0, -0.94, 0);
    vaultGroup.add(baseMesh);

    // === STAGE 3 OBJECTS: 3D Financial Bar Chart & Projection ===
    const chartGroup = new THREE.Group();
    rootGroup.add(chartGroup);

    const barHeights = [1.1, 1.8, 1.35, 2.35, 1.95];
    const barColors = [0x6b6d72, 0xbbbcbc, 0x0284c7, 0x38bdf8, 0xffffff];
    const barMeshes: THREE.Mesh[] = [];
    const barGeos: THREE.BufferGeometry[] = [];
    const barMats: THREE.Material[] = [];

    barHeights.forEach((h, idx) => {
      const geo = new THREE.BoxGeometry(0.46, h, 0.46);
      const mat = new THREE.MeshStandardMaterial({
        color: barColors[idx],
        metalness: 0.65,
        roughness: 0.22,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set((idx - 2) * 0.72, h / 2 - 0.95, 0);
      chartGroup.add(mesh);
      barMeshes.push(mesh);
      barGeos.push(geo);
      barMats.push(mat);
    });

    // Chart Grid Floor
    const gridHelper = new THREE.GridHelper(4.4, 11, 0x38bdf8, 0x2a2e39);
    gridHelper.position.y = -0.95;
    chartGroup.add(gridHelper);

    // Subtle Pointer Tilt
    let pointerX = 0;
    let pointerY = 0;
    const onPointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      pointerX = ((e.clientX - rect.left) / rect.width - 0.5) * 0.45;
      pointerY = ((e.clientY - rect.top) / rect.height - 0.5) * 0.3;
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        const h = entry.contentRect.height;
        if (w > 0 && h > 0) {
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        }
      }
    });
    resizeObserver.observe(container);

    let frameId = 0;
    let elapsed = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      if (!prefersReducedMotion) {
        elapsed += delta;
      }

      const p = progressRef.current; // 0.0 -> 1.0

      // Smoothly interpolate visibility / scale / position of each finance stage
      // Stage 1 (Card): visible 0.0 -> 0.42
      const s1 = p < 0.34 ? 1 : Math.max(0, 1 - (p - 0.34) / 0.14);
      cardGroup.visible = s1 > 0.02;
      cardGroup.scale.setScalar(0.5 + 0.5 * s1);
      cardGroup.position.y = (1 - s1) * -1.4;
      cardGroup.rotation.y = p * Math.PI * 1.4 + Math.sin(elapsed * 0.8) * 0.15;
      cardGroup.rotation.x = Math.cos(elapsed * 0.6) * 0.08 + 0.12;
      coin1.rotation.z = elapsed * 1.1;
      coin2.rotation.z = -elapsed * 0.9;

      // Stage 2 (Savings Vault): visible 0.28 -> 0.74
      let s2 = 0;
      if (p >= 0.25 && p < 0.38) {
        s2 = (p - 0.25) / 0.13;
      } else if (p >= 0.38 && p <= 0.64) {
        s2 = 1;
      } else if (p > 0.64 && p < 0.78) {
        s2 = Math.max(0, 1 - (p - 0.64) / 0.14);
      }
      vaultGroup.visible = s2 > 0.02;
      vaultGroup.scale.setScalar(0.5 + 0.5 * s2);
      vaultGroup.position.y = (1 - s2) * 1.2;
      vaultGroup.rotation.y = (p - 0.35) * Math.PI * 1.2 + elapsed * 0.25;
      potMeshes.forEach((m, i) => {
        m.scale.y = Math.max(0.1, s2);
        m.position.y = (potSpecs[i].h * m.scale.y) / 2 - 0.9;
      });

      // Stage 3 (3D Bar Chart): visible 0.62 -> 1.0
      const s3 = p < 0.6 ? 0 : Math.min(1, (p - 0.6) / 0.15);
      chartGroup.visible = s3 > 0.02;
      chartGroup.scale.setScalar(0.5 + 0.5 * s3);
      chartGroup.rotation.y = -0.35 + (p - 0.68) * 0.8 + Math.sin(elapsed * 0.5) * 0.1;
      chartGroup.rotation.x = 0.2;
      barMeshes.forEach((m, i) => {
        m.scale.y = Math.max(0.08, s3);
        m.position.y = (barHeights[i] * m.scale.y) / 2 - 0.95;
      });

      // Camera & Pointer Parallax
      rootGroup.rotation.y += (pointerX - rootGroup.rotation.y) * 0.06;
      rootGroup.rotation.x += (pointerY - rootGroup.rotation.x) * 0.06;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      window.removeEventListener("pointermove", onPointerMove);

      cardGeo.dispose();
      cardMat.dispose();
      cardEdgeGeo.dispose();
      cardEdgeMat.dispose();
      chipGeo.dispose();
      chipMat.dispose();
      stripeGeo.dispose();
      stripeMat.dispose();
      coinGeo.dispose();
      coinMat.dispose();
      baseGeo.dispose();
      baseMat.dispose();
      potGeos.forEach((g) => g.dispose());
      potMats.forEach((m) => m.dispose());
      barGeos.forEach((g) => g.dispose());
      barMats.forEach((m) => m.dispose());
      renderer.dispose();

      if (domElParentCheck(renderer.domElement, container)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  const scrollToStage = (idx: number) => {
    const el = sectionRef.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    const totalScrollable = el.offsetHeight - window.innerHeight;
    const targetFrac = idx === 0 ? 0.12 : idx === 1 ? 0.5 : 0.88;
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
      className="relative h-[280vh] bg-black text-white border-y border-white/15"
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
                    ? "bg-white text-black"
                    : "bg-white/10 text-[#bbbcbc] hover:text-white"
                }`}
              >
                {st.title}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-28 h-1 bg-white/15 overflow-hidden rounded-full">
                <div
                  className="h-full bg-[#38bdf8] transition-all duration-150"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <span className="font-mono text-xs text-[#bbbcbc] num-tabular w-9 text-right">
                {progressPct}%
              </span>
            </div>

            <a
              href="#fitur"
              className="inline-flex items-center gap-1 text-xs text-[#bbbcbc] hover:text-white transition-colors"
            >
              <span>Lewati</span>
              <ArrowDown className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Center 3D Finance Canvas + Narrative */}
        <div className="max-w-7xl w-full mx-auto px-5 sm:px-8 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-5 space-y-5 z-10">
            <h2 className="font-display text-4xl sm:text-5xl text-white">
              {currentStage.title}
            </h2>
            <p className="text-sm sm:text-base text-[#bbbcbc] leading-relaxed">
              {currentStage.description}
            </p>

            <div className="pt-4 border-t border-white/15 flex items-baseline justify-between">
              <span className="text-xs uppercase tracking-wider text-[#bbbcbc]">
                {currentStage.metricLabel}
              </span>
              <span className="font-mono text-2xl font-semibold text-[#38bdf8] num-tabular">
                {currentStage.metricValue}
              </span>
            </div>

            <div className="pt-2">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 text-sm font-medium text-white hover:text-[#38bdf8] transition-colors"
              >
                <span>Buka di Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          <div className="lg:col-span-7 h-[320px] sm:h-[460px] lg:h-[520px] relative">
            <div
              ref={mountRef}
              className="w-full h-full"
              aria-label="Visualisasi 3D Keuangan KasKu"
            />
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

function domElParentCheck(el: HTMLElement, parent: HTMLElement): boolean {
  return el.parentNode === parent;
}
