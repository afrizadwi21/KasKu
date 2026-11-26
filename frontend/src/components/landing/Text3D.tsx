"use client";

import React, { useEffect, useRef } from "react";

interface Text3DProps {
  as?: "h1" | "h2" | "h3";
  variant?: "light" | "dark";
  children: React.ReactNode;
  className?: string;
}

export function Text3D({
  as: Tag = "h2",
  variant = "dark",
  children,
  className = "",
}: Text3DProps) {
  const ref = useRef<HTMLHeadingElement | null>(null);

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    let currentOffset = 0;
    let rafId = 0;

    const tick = () => {
      const el = ref.current;
      if (el) {
        const rect = el.getBoundingClientRect();
        const vh = window.innerHeight || 800;
        const elCenter = rect.top + rect.height / 2;
        const targetOffset = Math.max(-1.2, Math.min(1.2, (vh / 2 - elCenter) / (vh * 0.65)));

        // Slow, realistic inertia damping on scroll up & down
        currentOffset += (targetOffset - currentOffset) * 0.055;

        const rotX = currentOffset * 20;
        const rotY = currentOffset * -7;
        const translateY = -currentOffset * 12;

        el.style.transform = `perspective(1000px) translate3d(0, ${translateY.toFixed(2)}px, 0) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg)`;
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const textShadow =
    variant === "light"
      ? "0 1px 0 #064e3b, 0 2px 0 #043a2c, 0 3px 0 #02261d, 0 4px 0 #01140f, 0 12px 24px rgba(0, 0, 0, 0.55)"
      : "0 1px 0 #d5ded9, 0 2px 0 #c3d0c9, 0 3px 0 #b1c2b9, 0 4px 0 #9fb4a9, 0 10px 20px rgba(7, 10, 9, 0.14)";

  return (
    <Tag
      ref={ref}
      className={`font-display will-change-transform ${className}`}
      style={{ textShadow }}
    >
      {children}
    </Tag>
  );
}
