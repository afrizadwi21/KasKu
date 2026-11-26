import React from "react";
import { LandingNavbar } from "../components/landing/LandingNavbar";
import { LandingHero } from "../components/landing/LandingHero";
import { KasKu3DScrollShowcase } from "../components/landing/KasKu3DScrollShowcase";
import { KasKu3DTextCylinder } from "../components/landing/KasKu3DTextCylinder";
import { LandingFeatures } from "../components/landing/LandingFeatures";
import { LandingFooter } from "../components/landing/LandingFooter";

export default function LandingPage() {
  return (
    <div className="landing-theme min-h-screen flex flex-col bg-[#f8f4ee] text-[#1a0e08]">
      <LandingNavbar />
      <main className="flex-1">
        <LandingHero />
        <KasKu3DScrollShowcase />
        <KasKu3DTextCylinder />
        <LandingFeatures />
      </main>
      <LandingFooter />
    </div>
  );
}
