"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Menu, X } from "lucide-react";

const NAV_LINKS = [
  { label: "Cara Kerja", href: "#cara-kerja" },
  { label: "Fitur", href: "#fitur" },
  { label: "Simulasi", href: "#simulasi" },
  { label: "Privasi", href: "#privasi" },
];

export function LandingNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[#f7f8f7]/95 backdrop-blur-md border-b border-[#0b110e]/10 text-[#0b110e]"
          : "bg-transparent border-b border-[#f4f7f5]/15 text-[#f4f7f5]"
      }`}
    >
      <div className="max-w-7xl mx-auto px-5 sm:px-8 h-16 sm:h-20 flex items-center justify-between">
        {/* Brand Wordmark */}
        <Link
          href="/"
          className="flex items-center gap-3 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10b981] rounded-md"
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 28 28"
            fill="none"
            aria-hidden="true"
            className="transition-transform duration-300 group-hover:scale-105"
          >
            <rect
              x="2"
              y="2"
              width="24"
              height="24"
              rx="4"
              stroke="currentColor"
              strokeWidth="1.75"
            />
            <path
              d="M9 8.5V19.5M9 14L17.5 8.5M12.5 11.8L18.5 19.5"
              stroke="#10b981"
              strokeWidth="2.2"
              strokeLinecap="square"
            />
          </svg>
          <span className="font-display text-xl tracking-tight">
            KasKu
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8" aria-label="Navigasi utama">
          {NAV_LINKS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={`text-sm font-medium tracking-wide transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10b981] rounded-sm ${
                scrolled
                  ? "text-[#47544d] hover:text-[#0b110e]"
                  : "text-[#f4f7f5]/80 hover:text-[#f4f7f5]"
              }`}
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className={`hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-sm text-sm font-semibold transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10b981] ${
              scrolled
                ? "bg-[#059669] text-white hover:bg-[#047857]"
                : "bg-[#10b981] text-[#070a09] hover:bg-[#34d399]"
            }`}
          >
            <span>Buka Dashboard</span>
            <ArrowUpRight className="w-4 h-4" />
          </Link>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label={mobileOpen ? "Tutup menu navigasi" : "Buka menu navigasi"}
            aria-expanded={mobileOpen}
            className={`md:hidden p-2 rounded-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10b981] ${
              scrolled ? "hover:bg-[#eef1ef]" : "hover:bg-white/10"
            }`}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden bg-[#f7f8f7] text-[#0b110e] border-b border-[#0b110e]/10 px-5 py-4 space-y-3">
          <nav className="flex flex-col space-y-2" aria-label="Navigasi mobile">
            {NAV_LINKS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="py-2 text-sm font-medium text-[#47544d] hover:text-[#0b110e] border-b border-[#0b110e]/10 last:border-b-0"
              >
                {item.label}
              </a>
            ))}
          </nav>
          <Link
            href="/dashboard"
            onClick={() => setMobileOpen(false)}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-sm text-sm font-semibold bg-[#059669] text-white hover:bg-[#047857]"
          >
            <span>Buka Dashboard</span>
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </header>
  );
}
