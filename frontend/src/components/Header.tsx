"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowLeftRight,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  ListOrdered,
  LogOut,
  Menu,
  Moon,
  PiggyBank,
  Plus,
  ShoppingBag,
  Sun,
  User,
  X,
} from "lucide-react";

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenModal: () => void;
  onLogout: () => void;
  userName: string;
  userEmail?: string;
  isDark: boolean;
  onToggleTheme: () => void;
}

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "transactions", label: "Transaksi", icon: ListOrdered },
  { id: "debts", label: "Piutang & Hutang", icon: ArrowLeftRight },
  { id: "subscriptions", label: "Langganan & Tagihan", icon: CalendarClock },
  { id: "savings", label: "Tabungan", icon: PiggyBank },
  { id: "wishlist", label: "Wishlist", icon: ShoppingBag },
  { id: "profile", label: "Profil & Analitik", icon: User },
];

export function Header({
  activeTab,
  setActiveTab,
  onOpenModal,
  onLogout,
  userName,
  userEmail,
  isDark,
  onToggleTheme,
}: HeaderProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSelectTab = (id: string) => {
    setActiveTab(id);
    setMobileOpen(false);
  };

  const borderCls = isDark ? "border-[#f4f7f5]/10" : "border-[#0b110e]/10";
  const mutedCls = isDark ? "text-[#a3b8ad]" : "text-[#47544d]";

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex flex-col justify-between shrink-0 sticky top-0 h-screen border-r transition-all duration-200 ${
          collapsed ? "w-20" : "w-64"
        } ${
          isDark
            ? "border-[#f4f7f5]/10 bg-[#0b110e] text-[#f4f7f5]"
            : "border-[#0b110e]/10 bg-white text-[#0b110e]"
        }`}
      >
        <div>
          {/* Brand + Collapse Button */}
          <div className={`h-16 px-4 flex items-center justify-between border-b ${borderCls}`}>
            <Link href="/" className="flex items-center gap-2.5 overflow-hidden">
              <svg
                width="28"
                height="28"
                viewBox="0 0 28 28"
                fill="none"
                aria-hidden="true"
                className="shrink-0"
              >
                <rect
                  width="28"
                  height="28"
                  rx="6"
                  fill="#070a09"
                  stroke="#10b981"
                  strokeWidth="1.5"
                />
                <path
                  d="M9 8.5V19.5M9 14L17.5 8.5M12.5 11.8L18.5 19.5"
                  stroke="#10b981"
                  strokeWidth="2.2"
                  strokeLinecap="square"
                />
              </svg>
              {!collapsed && (
                <span className="font-display text-lg tracking-tight truncate">
                  KasKu
                </span>
              )}
            </Link>

            <button
              type="button"
              onClick={() => setCollapsed((v) => !v)}
              aria-label={collapsed ? "Perluas sidebar" : "Ciutkan sidebar"}
              className={`p-1.5 rounded-md border cursor-pointer ${
                isDark
                  ? "border-[#f4f7f5]/15 text-[#a3b8ad] hover:bg-[#121c18]"
                  : "border-[#0b110e]/10 text-[#47544d] hover:bg-[#eef1ef]"
              }`}
            >
              {collapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* User Profile Card */}
          <div className={`px-3 py-4 border-b ${borderCls}`}>
            <button
              type="button"
              onClick={() => handleSelectTab("profile")}
              className={`w-full text-left flex items-center gap-3 rounded-lg p-2 transition-colors cursor-pointer ${
                collapsed ? "justify-center" : ""
              } ${
                isDark
                  ? "bg-[#0e1412] hover:bg-[#121c18]"
                  : "bg-[#f7f8f7] hover:bg-[#eef1ef]"
              }`}
            >
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#10b981]/15 border border-[#10b981]/40 text-xs font-bold ${
                  isDark ? "text-[#34d399]" : "text-[#059669]"
                }`}
              >
                {userName ? userName.charAt(0).toUpperCase() : "U"}
              </div>
              {!collapsed && (
                <div className="min-w-0 leading-tight">
                  <div className="text-xs font-semibold truncate">{userName}</div>
                  {userEmail && (
                    <div className={`text-[11px] truncate ${mutedCls}`}>
                      {userEmail}
                    </div>
                  )}
                </div>
              )}
            </button>
          </div>

          {/* Navigation Menu */}
          <nav aria-label="Menu Sidebar" className="p-3 space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectTab(item.id)}
                  title={collapsed ? item.label : undefined}
                  className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-medium transition-colors cursor-pointer ${
                    collapsed ? "justify-center" : ""
                  } ${
                    isActive
                      ? isDark
                        ? "bg-[#10b981]/15 text-[#34d399] font-semibold"
                        : "bg-[#ecfdf5] text-[#059669] font-semibold"
                      : isDark
                      ? "text-[#a3b8ad] hover:bg-[#121c18] hover:text-[#f4f7f5]"
                      : "text-[#47544d] hover:bg-[#f7f8f7] hover:text-[#0b110e]"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Action + Theme + Logout */}
        <div className={`p-3 pb-16 border-t ${borderCls} space-y-3`}>
          <button
            type="button"
            onClick={onOpenModal}
            title="Catat Kas"
            className="w-full flex items-center justify-center gap-2 rounded-full bg-[#10b981] hover:bg-[#34d399] text-[#070a09] py-2.5 px-3 text-xs font-semibold shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 shrink-0" />
            {!collapsed && <span>Catat Kas</span>}
          </button>

          <div
            className={`grid gap-2 ${
              collapsed ? "grid-cols-1" : "grid-cols-2"
            }`}
          >
            <button
              type="button"
              onClick={onToggleTheme}
              title={isDark ? "Ubah ke Light Mode" : "Ubah ke Dark Mode"}
              className={`flex flex-col items-center justify-center gap-1 rounded-lg border py-2 px-2 text-[11px] font-medium cursor-pointer transition-colors ${
                isDark
                  ? "border-[#f4f7f5]/15 bg-[#0e1412] text-[#f4f7f5] hover:bg-[#121c18]"
                  : "border-[#0b110e]/10 bg-[#f7f8f7] text-[#0b110e] hover:bg-[#eef1ef]"
              }`}
            >
              {isDark ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-[#34d399]" />
                  {!collapsed && <span>Light Mode</span>}
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-[#059669]" />
                  {!collapsed && <span>Dark Mode</span>}
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onLogout}
              title="Keluar dari akun"
              className={`flex flex-col items-center justify-center gap-1 rounded-lg border py-2 px-2 text-[11px] font-medium cursor-pointer transition-colors ${
                isDark
                  ? "border-red-500/20 bg-red-950/30 text-red-300 hover:bg-red-950/50"
                  : "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
              }`}
            >
              <LogOut className="w-3.5 h-3.5" />
              {!collapsed && <span>Logout</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header
        className={`lg:hidden sticky top-0 z-40 w-full border-b backdrop-blur-md ${
          isDark
            ? "border-[#f4f7f5]/10 bg-[#070a09]/95 text-[#f4f7f5]"
            : "border-[#0b110e]/10 bg-white/95 text-[#0b110e]"
        }`}
      >
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Buka menu"
              className={`p-1.5 rounded-md border ${borderCls}`}
            >
              <Menu className="w-4 h-4" />
            </button>
            <Link href="/" className="flex items-center gap-2">
              <svg width="24" height="24" viewBox="0 0 28 28" fill="none" aria-hidden="true">
                <rect width="28" height="28" rx="6" fill="#070a09" stroke="#10b981" strokeWidth="1.5" />
                <path
                  d="M9 8.5V19.5M9 14L17.5 8.5M12.5 11.8L18.5 19.5"
                  stroke="#10b981"
                  strokeWidth="2.2"
                  strokeLinecap="square"
                />
              </svg>
              <span className="font-display text-base tracking-tight">KasKu</span>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleTheme}
              aria-label="Ganti tema"
              className={`p-2 rounded-md border ${borderCls}`}
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-[#34d399]" />
              ) : (
                <Moon className="w-4 h-4 text-[#059669]" />
              )}
            </button>
            <button
              type="button"
              onClick={onOpenModal}
              className="inline-flex items-center gap-1 rounded-full bg-[#10b981] px-3 py-1.5 text-xs font-semibold text-[#070a09]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Catat</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/60"
            onClick={() => setMobileOpen(false)}
          />
          <div
            className={`relative z-10 w-64 max-w-[80vw] h-full flex flex-col justify-between border-r p-4 ${
              isDark
                ? "bg-[#0b110e] text-[#f4f7f5] border-[#f4f7f5]/10"
                : "bg-white text-[#0b110e] border-[#0b110e]/10"
            }`}
          >
            <div className="space-y-4">
              <div className={`flex items-center justify-between pb-3 border-b ${borderCls}`}>
                <span className="font-display text-lg">KasKu</span>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="p-1 rounded-md"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleSelectTab("profile")}
                className={`w-full text-left flex items-center gap-2.5 p-2 rounded-lg ${
                  isDark ? "bg-[#0e1412]" : "bg-[#f7f8f7]"
                }`}
              >
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full bg-[#10b981]/20 text-xs font-bold ${
                    isDark ? "text-[#34d399]" : "text-[#059669]"
                  }`}
                >
                  {userName ? userName.charAt(0).toUpperCase() : "U"}
                </div>
                <div className="min-w-0 leading-tight">
                  <div className="text-xs font-semibold truncate">{userName}</div>
                  {userEmail && (
                    <div className={`text-[11px] truncate ${mutedCls}`}>
                      {userEmail}
                    </div>
                  )}
                </div>
              </button>

              <nav className="space-y-1">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectTab(item.id)}
                      className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-medium ${
                        isActive
                          ? isDark
                            ? "bg-[#10b981]/15 text-[#34d399] font-semibold"
                            : "bg-[#ecfdf5] text-[#059669] font-semibold"
                          : mutedCls
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            <button
              type="button"
              onClick={onLogout}
              className={`w-full flex items-center justify-center gap-2 rounded-lg border py-2.5 text-xs font-medium ${
                isDark
                  ? "border-red-500/20 bg-red-950/30 text-red-300"
                  : "border-red-200 bg-red-50 text-red-700"
              }`}
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar with Center Raised FAB */}
      <nav
        aria-label="Navigasi Bawah Mobile"
        className={`lg:hidden fixed bottom-0 left-0 right-0 w-full max-w-[100vw] z-40 rounded-t-2xl border-t shadow-[0_-8px_30px_-10px_rgba(0,0,0,0.18)] backdrop-blur-md ${
          isDark
            ? "border-[#f4f7f5]/10 bg-[#0b110e]/95 text-[#f4f7f5]"
            : "border-[#0b110e]/10 bg-white/95 text-[#0b110e]"
        }`}
      >
        <div className="grid grid-cols-5 items-center h-16 px-1">
          {[
            { id: "dashboard", label: "Beranda", icon: LayoutDashboard },
            { id: "transactions", label: "Riwayat", icon: ListOrdered },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectTab(item.id)}
                className={`min-w-0 w-full h-16 flex flex-col items-center justify-center gap-1 text-[10px] font-medium leading-none whitespace-nowrap transition-colors cursor-pointer touch-manipulation ${
                  isActive
                    ? isDark
                      ? "text-[#34d399]"
                      : "text-[#059669]"
                    : mutedCls
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}

          {/* Center Raised FAB */}
          <div className="min-w-0 w-full h-16 flex flex-col items-center justify-end pb-2">
            <button
              type="button"
              onClick={onOpenModal}
              aria-label="Catat Kas"
              className={`-mt-6 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#10b981] text-[#070a09] shadow-lg ring-4 transition-transform active:scale-95 cursor-pointer touch-manipulation ${
                isDark ? "ring-[#070a09]" : "ring-[#f7f8f7]"
              }`}
            >
              <Plus className="w-6 h-6" />
            </button>
            <span
              className={`mt-1 text-[10px] leading-none font-medium whitespace-nowrap ${
                isDark ? "text-[#34d399]" : "text-[#059669]"
              }`}
            >
              Catat
            </span>
          </div>

          {[
            { id: "savings", label: "Tabungan", icon: PiggyBank },
            { id: "profile", label: "Profil", icon: User },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectTab(item.id)}
                className={`min-w-0 w-full h-16 flex flex-col items-center justify-center gap-1 text-[10px] font-medium leading-none whitespace-nowrap transition-colors cursor-pointer touch-manipulation ${
                  isActive
                    ? isDark
                      ? "text-[#34d399]"
                      : "text-[#059669]"
                    : mutedCls
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
