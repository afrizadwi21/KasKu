"use client";

import React from "react";
import { Plus, Wallet, ArrowDownRight, ArrowUpRight, ShieldCheck } from "lucide-react";

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenModal: () => void;
  userName?: string;
}

export function Header({ activeTab, setActiveTab, onOpenModal, userName = "Afriza" }: HeaderProps) {
  const tabs = [
    { id: "dashboard", label: "Dashboard" },
    { id: "transactions", label: "Transaksi" },
    { id: "debts", label: "Piutang & Hutang" },
    { id: "subscriptions", label: "Langganan & Tagihan" },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-200 bg-white/90 backdrop-blur-md dark:border-zinc-800 dark:bg-[#0b0d11]/90">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-700 text-white shadow-xs dark:bg-teal-600">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-base tracking-tight text-zinc-900 dark:text-zinc-50">
                KasKu
              </span>
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                Multi-User
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 hidden sm:block">
              Financial Precision Ledger
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50/80 p-1 dark:border-zinc-800 dark:bg-zinc-900/60">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                  isActive
                    ? "bg-white text-zinc-950 shadow-xs dark:bg-zinc-800 dark:text-zinc-50"
                    : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Action & User Pill */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenModal}
            className="flex items-center gap-1.5 rounded-md bg-teal-700 px-3.5 py-1.5 text-xs font-medium text-white transition-all hover:bg-teal-800 active:scale-98 dark:bg-teal-600 dark:hover:bg-teal-500"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Catat Kas</span>
          </button>

          <div className="hidden sm:flex items-center gap-2 border-l border-zinc-200 pl-3 dark:border-zinc-800">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              {userName.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              {userName}
            </span>
          </div>
        </div>
      </div>

      {/* Mobile Tab Bar */}
      <div className="flex md:hidden overflow-x-auto border-t border-zinc-200 px-4 py-2 dark:border-zinc-800">
        <div className="flex gap-1.5">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap rounded-md px-3 py-1 text-xs font-medium ${
                  isActive
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
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
