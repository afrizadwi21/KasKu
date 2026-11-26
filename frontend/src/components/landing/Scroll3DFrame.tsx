"use client";

import React, { useEffect, useRef, useState } from "react";

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
  const [viewportOffset, setViewportOffset] = useState(0); // -1 (below) -> 0 (center) -> +1 (above)
  const [pointer, setPointer] = useState({ x: 0, y: 0, active: false });

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    let rafId = 0;

    const update = () => {
      const el = wrapperRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || 800;
      const elCenter = rect.top + rect.height / 2;
      const vpCenter = vh / 2;
      // Normalized -1.2 to +1.2 as element travels up or down the viewport
      const norm = Math.max(-1.2, Math.min(1.2, (vpCenter - elCenter) / (vh * 0.65)));
      setViewportOffset(norm);
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

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = wrapperRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    setPointer({ x: nx, y: ny, active: true });
  };

  const handlePointerLeave = () => {
    setPointer({ x: 0, y: 0, active: false });
  };

  const dirSign = direction === "left" ? -1 : direction === "right" ? 1 : 0;
  const scrollRotX = viewportOffset * 9 * intensity;
  const scrollRotY = (viewportOffset * 7 * dirSign + (dirSign === 0 ? viewportOffset * 4 : 0)) * intensity;
  const scrollTranslateY = -viewportOffset * 18 * intensity;
  const distFromCenter = Math.min(1, Math.abs(viewportOffset));
  const scrollScale = 1.02 - distFromCenter * 0.05 * intensity;

  const finalRotX = scrollRotX - (pointer.active ? pointer.y * 12 : 0);
  const finalRotY = scrollRotY + (pointer.active ? pointer.x * 14 : 0);

  const glareX = pointer.active ? 50 + pointer.x * 60 : 50 + viewportOffset * 25;
  const glareY = pointer.active ? 50 + pointer.y * 60 : 50 - viewportOffset * 25;

  return (
    <div
      ref={wrapperRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={`[perspective:1400px] ${className}`}
    >
      <div
        className="relative transition-transform duration-200 ease-out will-change-transform"
        style={{
          transform: `translate3d(0, ${scrollTranslateY}px, 0) rotateX(${finalRotX}deg) rotateY(${finalRotY}deg) scale(${scrollScale})`,
          transformStyle: "preserve-3d",
        }}
      >
        {children}

        {glare && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-[inherit] transition-opacity duration-300"
            style={{
              background: `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(56, 189, 248, 0.14), transparent 55%)`,
              opacity: 1 - distFromCenter * 0.65,
            }}
          />
        )}
      </div>
    </div>
  );
}
