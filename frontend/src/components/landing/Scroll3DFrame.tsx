"use client";

import React, { useEffect, useRef } from "react";

interface Scroll3DFrameProps {
  children: React.ReactNode;
  className?: string;
  intensity?: number;
  direction?: "left" | "right" | "center";
  glare?: boolean;
}

export function Scroll3DFrame({
  children,
  className = "",
  intensity = 1,
  direction = "center",
  glare = true,
}: Scroll3DFrameProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const glareRef = useRef<HTMLDivElement | null>(null);
  const pointerRef = useRef({ x: 0, y: 0, active: false });

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    let currentOffset = 0;
    let currentPx = 0;
    let currentPy = 0;
    let rafId = 0;

    const dirSign = direction === "left" ? -1 : direction === "right" ? 1 : 0;

    const tick = () => {
      const el = wrapperRef.current;
      const inner = innerRef.current;
      if (el && inner) {
        const rect = el.getBoundingClientRect();
        const vh = window.innerHeight || 800;
        const elCenter = rect.top + rect.height / 2;
        const targetOffset = Math.max(-1.2, Math.min(1.2, (vh / 2 - elCenter) / (vh * 0.65)));

        // Slow, realistic physical damping (lerp)
        currentOffset += (targetOffset - currentOffset) * 0.055;

        const targetPx = pointerRef.current.active ? pointerRef.current.x : 0;
        const targetPy = pointerRef.current.active ? pointerRef.current.y : 0;
        currentPx += (targetPx - currentPx) * 0.07;
        currentPy += (targetPy - currentPy) * 0.07;

        const scrollRotX = currentOffset * 12 * intensity;
        const scrollRotY =
          (currentOffset * 9 * dirSign + (dirSign === 0 ? currentOffset * 5 : 0)) * intensity;
        const scrollTranslateY = -currentOffset * 22 * intensity;
        const distFromCenter = Math.min(1, Math.abs(currentOffset));
        const scrollScale = 1.03 - distFromCenter * 0.06 * intensity;

        const finalRotX = scrollRotX - currentPy * 12;
        const finalRotY = scrollRotY + currentPx * 14;

        inner.style.transform = `translate3d(0, ${scrollTranslateY.toFixed(2)}px, 0) rotateX(${finalRotX.toFixed(2)}deg) rotateY(${finalRotY.toFixed(2)}deg) scale(${scrollScale.toFixed(4)})`;

        if (glareRef.current) {
          const glareX = pointerRef.current.active ? 50 + currentPx * 60 : 50 + currentOffset * 28;
          const glareY = pointerRef.current.active ? 50 + currentPy * 60 : 50 - currentOffset * 28;
          glareRef.current.style.background = `radial-gradient(circle at ${glareX.toFixed(1)}% ${glareY.toFixed(1)}%, rgba(255, 91, 20, 0.17), transparent 58%)`;
          glareRef.current.style.opacity = `${(1 - distFromCenter * 0.65).toFixed(2)}`;
        }
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [intensity, direction]);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = wrapperRef.current;
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

  return (
    <div
      ref={wrapperRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={`[perspective:1400px] ${className}`}
    >
      <div
        ref={innerRef}
        className="relative will-change-transform"
        style={{ transformStyle: "preserve-3d" }}
      >
        {children}

        {glare && (
          <div
            ref={glareRef}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-[inherit]"
          />
        )}
      </div>
    </div>
  );
}
