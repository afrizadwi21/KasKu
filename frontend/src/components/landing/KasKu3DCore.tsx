"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";

type CoreMode = "bebas" | "tabungan" | "wishlist";

const MODE_CONFIG: Record<
  CoreMode,
  {
    label: string;
    metric: string;
    caption: string;
    ringColor: number;
    speedMultiplier: number;
  }
> = {
  bebas: {
    label: "Saldo Bebas",
    metric: "Rp 45.353",
    caption: "Orbit luar memisahkan kas operasional harian dari dana mengendap.",
    ringColor: 0x38bdf8,
    speedMultiplier: 1.0,
  },
  tabungan: {
    label: "Pos Tabungan",
    metric: "Rp 20.000",
    caption: "Inti tertutup mengunci target tabungan dengan proteksi row-lock.",
    ringColor: 0xbbbcbc,
    speedMultiplier: 0.65,
  },
  wishlist: {
    label: "Simulasi Beli",
    metric: "Rp 15.353",
    caption: "Proyeksi 3D menguji sisa jatah harian sebelum transaksi terjadi.",
    ringColor: 0x0284c7,
    speedMultiplier: 1.45,
  },
};

export function KasKu3DCore({
  compact = false,
  className = "",
}: {
  compact?: boolean;
  className?: string;
}) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [mode, setMode] = useState<CoreMode>("bebas");
  const modeRef = useRef<CoreMode>("bebas");

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const width = container.clientWidth || 480;
    const height = container.clientHeight || 420;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(0, 0.4, 6.2);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    // Studio Aerospace Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    keyLight.position.set(5, 6, 5);
    scene.add(keyLight);

    const rimLight = new THREE.PointLight(0x38bdf8, 4.5, 18);
    rimLight.position.set(-4, -2, 3);
    scene.add(rimLight);

    const group = new THREE.Group();
    scene.add(group);

    // 1. Inner Precision Core (Anodized Silver Icosahedron)
    const coreGeo = new THREE.IcosahedronGeometry(1.05, 1);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0xe4e4e2,
      metalness: 0.78,
      roughness: 0.24,
      flatShading: true,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    group.add(coreMesh);

    // 2. Wireframe Cage around Core
    const wireGeo = new THREE.IcosahedronGeometry(1.22, 1);
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.32,
    });
    const wireMesh = new THREE.Mesh(wireGeo, wireMat);
    group.add(wireMesh);

    // 3. Three Orbital Telemetry Rings
    const ring1Geo = new THREE.TorusGeometry(1.85, 0.022, 16, 100);
    const ring1Mat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      metalness: 0.6,
      roughness: 0.2,
    });
    const ring1 = new THREE.Mesh(ring1Geo, ring1Mat);
    ring1.rotation.x = Math.PI / 2.6;
    ring1.rotation.y = Math.PI / 6;
    group.add(ring1);

    const ring2Geo = new THREE.TorusGeometry(2.25, 0.016, 16, 100);
    const ring2Mat = new THREE.MeshStandardMaterial({
      color: 0xbbbcbc,
      metalness: 0.8,
      roughness: 0.25,
    });
    const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
    ring2.rotation.x = -Math.PI / 3.2;
    ring2.rotation.y = -Math.PI / 5;
    group.add(ring2);

    const ring3Geo = new THREE.TorusGeometry(2.62, 0.012, 16, 120);
    const ring3Mat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.35,
    });
    const ring3 = new THREE.Mesh(ring3Geo, ring3Mat);
    ring3.rotation.x = Math.PI / 2;
    group.add(ring3);

    // 4. Orbiting Telemetry Nodes
    const nodeGeo = new THREE.SphereGeometry(0.065, 16, 16);
    const nodeMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const node1 = new THREE.Mesh(nodeGeo, nodeMat);
    const node2 = new THREE.Mesh(nodeGeo, nodeMat);
    ring1.add(node1);
    ring2.add(node2);
    node1.position.set(1.85, 0, 0);
    node2.position.set(-2.25, 0, 0);

    // Pointer Drag & Tilt Interaction
    let isDragging = false;
    let prevX = 0;
    let prevY = 0;
    let targetRotX = 0.22;
    let targetRotY = -0.3;

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      prevX = e.clientX;
      prevY = e.clientY;
      container.style.cursor = "grabbing";
    };

    const onPointerMove = (e: PointerEvent) => {
      if (isDragging) {
        const dx = e.clientX - prevX;
        const dy = e.clientY - prevY;
        targetRotY += dx * 0.008;
        targetRotX += dy * 0.008;
        prevX = e.clientX;
        prevY = e.clientY;
      } else {
        const rect = container.getBoundingClientRect();
        const nx = (e.clientX - rect.left) / rect.width - 0.5;
        const ny = (e.clientY - rect.top) / rect.height - 0.5;
        targetRotY = nx * 0.65;
        targetRotX = ny * 0.45 + 0.15;
      }
    };

    const onPointerUp = () => {
      isDragging = false;
      container.style.cursor = "grab";
    };

    const domEl = renderer.domElement;
    container.style.cursor = "grab";
    domEl.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    // Resize Observer
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

    // Animation Loop
    let frameId = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const cfg = MODE_CONFIG[modeRef.current];

      // Smooth color transition on ring1 & wire
      const targetColor = new THREE.Color(cfg.ringColor);
      ring1Mat.color.lerp(targetColor, 0.06);
      wireMat.color.lerp(targetColor, 0.06);

      if (!prefersReducedMotion) {
        const spd = cfg.speedMultiplier;
        coreMesh.rotation.y += delta * 0.28 * spd;
        coreMesh.rotation.x += delta * 0.12 * spd;
        wireMesh.rotation.y -= delta * 0.18 * spd;

        ring1.rotation.z += delta * 0.45 * spd;
        ring2.rotation.z -= delta * 0.32 * spd;
        ring3.rotation.z += delta * 0.15 * spd;
      }

      group.rotation.x += (targetRotX - group.rotation.x) * 0.08;
      group.rotation.y += (targetRotY - group.rotation.y) * 0.08;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      domEl.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);

      coreGeo.dispose();
      coreMat.dispose();
      wireGeo.dispose();
      wireMat.dispose();
      ring1Geo.dispose();
      ring1Mat.dispose();
      ring2Geo.dispose();
      ring2Mat.dispose();
      ring3Geo.dispose();
      ring3Mat.dispose();
      nodeGeo.dispose();
      nodeMat.dispose();
      renderer.dispose();

      if (domEl.parentNode === container) {
        container.removeChild(domEl);
      }
    };
  }, []);

  const currentInfo = MODE_CONFIG[mode];

  return (
    <div
      className={`relative rounded-sm border border-white/15 bg-black/80 backdrop-blur-md overflow-hidden ${className}`}
    >
      {/* Top 3D Stage Controls */}
      <div className="relative z-10 px-4 py-3 border-b border-white/10 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {(["bebas", "tabungan", "wishlist"] as CoreMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`px-2.5 py-1 rounded-sm text-xs font-medium transition-colors ${
                mode === m
                  ? "bg-white text-black"
                  : "text-white/65 hover:text-white hover:bg-white/10"
              }`}
            >
              {MODE_CONFIG[m].label}
            </button>
          ))}
        </div>
        <span className="font-mono text-[11px] text-[#bbbcbc]">
          3D WebGL • Geser untuk putar
        </span>
      </div>

      {/* Three.js Canvas Mount */}
      <div
        ref={mountRef}
        className={`w-full ${compact ? "h-[300px] sm:h-[340px]" : "h-[360px] sm:h-[420px]"}`}
        aria-label="Model 3D Interaktif Arsitektur Keuangan KasKu"
      />

      {/* Bottom Live Telemetry Readout */}
      <div className="relative z-10 px-5 py-4 border-t border-white/10 bg-black/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="text-xs text-[#bbbcbc]">{currentInfo.label}</div>
          <div className="font-mono text-lg font-semibold text-white num-tabular">
            {currentInfo.metric}
          </div>
        </div>
        <p className="text-xs text-[#bbbcbc] max-w-xs leading-relaxed">
          {currentInfo.caption}
        </p>
      </div>
    </div>
  );
}
