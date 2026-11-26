"use client";

import React, { useEffect, useRef, useState } from "react";

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
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    let rafId = 0;

    const update = () => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || 800;
      const elCenter = rect.top + rect.height / 2;
      const vpCenter = vh / 2;
      const norm = Math.max(-1.2, Math.min(1.2, (vpCenter - elCenter) / (vh * 0.65)));
      setOffset(norm);
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

  const rotX = offset * 11;
  const rotY = offset * -5;
  const translateY = -offset * 8;

  const textShadow =
    variant === "light"
      ? "0 1px 0 #7a2306, 0 2px 0 #5e1a04, 0 3px 0 #431102, 0 4px 0 #2a0a01, 0 12px 24px rgba(0, 0, 0, 0.55)"
      : "0 1px 0 #ddd2c3, 0 2px 0 #cfc1ae, 0 3px 0 #c0ae97, 0 4px 0 #b09b81, 0 10px 20px rgba(20, 10, 5, 0.16)";

  return (
    <Tag
      ref={ref}
      className={`font-display transition-transform duration-150 ease-out will-change-transform ${className}`}
      style={{
        transform: `perspective(1000px) translate3d(0, ${translateY}px, 0) rotateX(${rotX}deg) rotateY(${rotY}deg)`,
        textShadow,
      }}
    >
      {children}
    </Tag>
  );
}
