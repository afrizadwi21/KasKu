"use client";

import React from "react";
import Link from "next/link";
import { Plus, LogOut } from "lucide-react";

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenModal: () => void;
  onLogout: () => void;
  userName: string;
  userEmail?: string;
}

export function Header({
  activeTab,
  setActiveTab,
  onOpenModal,
  onLogout,
  userName,
  userEmail,
}: HeaderProps) {
  const tabs = [
    { id: "dashboard", label: "Dashboard" },
    { id: "transactions", label: "Transaksi" },
    { id: "debts", label: "Piutang & Hutang" },
    { id: "subscriptions", label: "Langganan & Tagihan" },
    { id: "savings", label: "Tabungan" },
    { id: "wishlist", label: "Wishlist" },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#f4f7f5]/10 bg-[#070a09]/95 text-[#f4f7f5] backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
            <rect width="28" height="28" rx="6" fill="#0e1412" stroke="#10b981" strokeWidth="1.5" />
            <path
              d="M9 8.5V19.5M9 14L17.5 8.5M12.5 11.8L18.5 19.5"
              stroke="#10b981"
              strokeWidth="2.2"
              strokeLinecap="square"
            />
          </svg>
          <span className="font-display text-lg tracking-tight text-[#f4f7f5]">
            KasKu
          </span>
        </Link>

        {/* Topbar Navigation Tabs */}
        <nav
          aria-label="Navigasi Dashboard"
          className="hidden lg:flex items-center gap-1 rounded-sm border border-[#f4f7f5]/10 bg-[#0e1412] p-1"
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-sm px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                  isActive
                    ? "bg-[#10b981] text-[#070a09] font-semibold"
                    : "text-[#a3b8ad] hover:text-[#f4f7f5]"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Action & User Controls */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onOpenModal}
            className="flex items-center gap-1.5 rounded-sm bg-[#10b981] px-3.5 py-1.5 text-xs font-semibold text-[#070a09] transition-colors hover:bg-[#34d399] active:scale-[0.98] cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Catat Kas</span>
          </button>

          <div className="hidden sm:flex items-center gap-2.5 border-l border-[#f4f7f5]/15 pl-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#10b981]/20 border border-[#10b981]/40 text-xs font-semibold text-[#34d399]">
              {userName ? userName.charAt(0).toUpperCase() : "U"}
            </div>
            <div className="leading-tight">
              <div className="text-xs font-medium text-[#f4f7f5]">{userName}</div>
              {userEmail && (
                <div className="text-[10px] text-[#a3b8ad] max-w-[140px] truncate">
                  {userEmail}
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onLogout}
            title="Keluar dari akun"
            className="inline-flex items-center gap-1.5 rounded-sm border border-[#f4f7f5]/15 bg-[#0e1412] px-2.5 py-1.5 text-xs font-medium text-[#a3b8ad] hover:border-red-500/40 hover:text-red-300 transition-colors cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Keluar</span>
          </button>
        </div>
      </div>

      {/* Mobile & Tablet Topbar Tabs */}
      <div className="flex lg:hidden overflow-x-auto border-t border-[#f4f7f5]/10 px-4 py-2 bg-[#0e1412]">
        <div className="flex gap-1.5">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap rounded-sm px-3 py-1 text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-[#10b981] text-[#070a09] font-semibold"
                    : "bg-[#070a09] text-[#a3b8ad] hover:text-[#f4f7f5]"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
