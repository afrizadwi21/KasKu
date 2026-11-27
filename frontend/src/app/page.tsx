import React from "react";
import { LandingNavbar } from "../components/landing/LandingNavbar";
import { LandingHero } from "../components/landing/LandingHero";
import { KasKu3DScrollShowcase } from "../components/landing/KasKu3DScrollShowcase";
import { LandingFeatures } from "../components/landing/LandingFeatures";
import { LandingFooter } from "../components/landing/LandingFooter";

export default function LandingPage() {
  return (
    <div className="landing-theme min-h-screen flex flex-col bg-[#f7f8f7] text-[#0b110e]">
      <LandingNavbar />
      <main className="flex-1">
        <LandingHero />
        <KasKu3DScrollShowcase />
        <LandingFeatures />
      </main>
      <LandingFooter />
    </div>
  );
}
