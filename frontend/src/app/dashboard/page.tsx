"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  Plus,
  Search,
  Trash2,
  Wallet,
  PiggyBank,
  ShoppingBag,
  RefreshCw,
} from "lucide-react";
import { Header } from "../../components/Header";
import { MetricCard, formatRupiah } from "../../components/MetricCard";
import { TransactionModal } from "../../components/TransactionModal";
import {
  apiFetch,
  clearAuthSession,
  getStoredAccessToken,
  logoutUser,
} from "../../lib/api";
import {
  Bill,
  DebtSummary,
  OverviewData,
  SavingsPot,
  Subscription,
  TodayData,
  Transaction,
  UnpaidItem,
  UserProfile,
  WishlistItem,
} from "../../types";

interface DebtsApiResponse {
  piutang: DebtSummary[];
  hutang_saya: DebtSummary[];
}

interface UnpaidApiResponse {
  items: UnpaidItem[];
  total_belum_dibayar_langganan_tagihan: number;
  saldo_bebas: number;
  peringatan?: string;
}

const EMPTY_OVERVIEW: OverviewData = {
  saldo: 0,
  piutang_total: 0,
  hutang_saya_total: 0,
  belum_dibayar_total: 0,
  belum_dibayar_jumlah: 0,
  kekayaan_bersih: 0,
};

const EMPTY_TODAY: TodayData = {
  tanggal: "",
  masuk_hari_ini: 0,
  keluar_hari_ini: 0,
  jumlah_transaksi: 0,
  saldo_awal_hari: 0,
  saldo_sekarang: 0,
  selisih_hari_ini: 0,
  pemasukan_per_sumber_hari_ini: [],
  transaksi: [],
};

export default function DashboardPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const [activeTab, setActiveTab] = useState("dashboard");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "masuk" | "keluar">("all");

  const [overview, setOverview] = useState<OverviewData>(EMPTY_OVERVIEW);
  const [todayData, setTodayData] = useState<TodayData>(EMPTY_TODAY);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [piutangList, setPiutangList] = useState<DebtSummary[]>([]);
  const [hutangSayaList, setHutangSayaList] = useState<DebtSummary[]>([]);
  const [unpaidList, setUnpaidList] = useState<UnpaidItem[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [savingsPots, setSavingsPots] = useState<SavingsPot[]>([]);
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);

  // Inline create form states (real user input, no dummy defaults)
  const [subName, setSubName] = useState("");
  const [subAmount, setSubAmount] = useState("");
  const [subCycle, setSubCycle] = useState<"mingguan" | "bulanan" | "3_bulanan" | "tahunan">("bulanan");
  const [subFirstDue, setSubFirstDue] = useState("");

  const [billTitle, setBillTitle] = useState("");
  const [billAmount, setBillAmount] = useState("");
  const [billDueDate, setBillDueDate] = useState("");

  const [potName, setPotName] = useState("");
  const [potTarget, setPotTarget] = useState("");
  const [potActionAmounts, setPotActionAmounts] = useState<Record<string, string>>({});

  const [wishName, setWishName] = useState("");
  const [wishPrice, setWishPrice] = useState("");
  const [wishPriority, setWishPriority] = useState<"rendah" | "sedang" | "tinggi">("sedang");

  const loadAllData = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const [
        meData,
        overviewRes,
        todayRes,
        txRes,
        debtsRes,
        unpaidRes,
        subsRes,
        billsRes,
        savingsRes,
        wishlistRes,
      ] = await Promise.all([
        apiFetch<UserProfile>("/api/me"),
        apiFetch<OverviewData>("/api/overview"),
        apiFetch<TodayData>("/api/today"),
        apiFetch<Transaction[]>("/api/transactions"),
        apiFetch<DebtsApiResponse>("/api/debts"),
        apiFetch<UnpaidApiResponse>("/api/unpaid"),
        apiFetch<Subscription[]>("/api/subscriptions"),
        apiFetch<Bill[]>("/api/bills"),
        apiFetch<{ pots?: SavingsPot[] } | SavingsPot[]>("/api/savings"),
        apiFetch<{ items?: WishlistItem[] } | WishlistItem[]>("/api/wishlist"),
      ]);

      setUser(meData);
      setOverview(overviewRes || EMPTY_OVERVIEW);
      setTodayData(todayRes || EMPTY_TODAY);
      setTransactions(Array.isArray(txRes) ? txRes : []);
      setPiutangList(Array.isArray(debtsRes?.piutang) ? debtsRes.piutang : []);
      setHutangSayaList(Array.isArray(debtsRes?.hutang_saya) ? debtsRes.hutang_saya : []);
      setUnpaidList(Array.isArray(unpaidRes?.items) ? unpaidRes.items : []);
      setSubscriptions(Array.isArray(subsRes) ? subsRes : []);
      setBills(Array.isArray(billsRes) ? billsRes : []);

      const potsArray = Array.isArray(savingsRes)
        ? savingsRes
        : Array.isArray(savingsRes?.pots)
        ? savingsRes.pots
        : [];
      setSavingsPots(potsArray);

      const wishArray = Array.isArray(wishlistRes)
        ? wishlistRes
        : Array.isArray(wishlistRes?.items)
        ? wishlistRes.items
        : [];
      setWishlistItems(wishArray);

      setAuthChecked(true);
    } catch (err: unknown) {
      if (err instanceof Error && err.message === "UNAUTHORIZED") {
        clearAuthSession();
        router.replace("/login");
        return;
      }
      setErrorMsg(
        err instanceof Error ? err.message : "Gagal memuat data dari server."
      );
      setAuthChecked(true);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const token = getStoredAccessToken();
    if (!token) {
      clearAuthSession();
      router.replace("/login");
      return;
    }
    const todayStr = new Date().toISOString().split("T")[0];
    setSubFirstDue(todayStr);
    setBillDueDate(todayStr);
    loadAllData();
  }, [router, loadAllData]);

  const handleLogout = async () => {
    await logoutUser();
    router.replace("/login");
  };

  const handleCreateTransaction = async (data: {
    date: string;
    type: "masuk" | "keluar";
    category: string;
    party: string;
    source: string;
    note: string;
    amount: number;
    items: { name: string; qty: number; unit_price: number; subtotal: number }[];
  }) => {
    try {
      setErrorMsg("");
      await apiFetch("/api/transactions", {
        method: "POST",
        body: JSON.stringify(data),
      });
      await loadAllData();
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : "Gagal menyimpan transaksi."
      );
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    try {
      setErrorMsg("");
      await apiFetch(`/api/transactions/${id}`, { method: "DELETE" });
      await loadAllData();
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : "Gagal menghapus transaksi."
      );
    }
  };

  const handlePaySubscription = async (id: string) => {
    try {
      setErrorMsg("");
      await apiFetch(`/api/subscriptions/${id}/pay`, { method: "POST" });
      await loadAllData();
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : "Gagal membayar langganan."
      );
    }
  };

  const handleCreateSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setErrorMsg("");
      await apiFetch("/api/subscriptions", {
        method: "POST",
        body: JSON.stringify({
          name: subName.trim(),
          amount: Number(subAmount),
          cycle: subCycle,
          first_due: subFirstDue,
        }),
      });
      setSubName("");
      setSubAmount("");
      await loadAllData();
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : "Gagal menambah langganan."
      );
    }
  };

  const handlePayBill = async (id: string) => {
    try {
      setErrorMsg("");
      await apiFetch(`/api/bills/${id}/pay`, { method: "POST" });
      await loadAllData();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Gagal membayar tagihan.");
    }
  };

  const handleCreateBill = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setErrorMsg("");
      await apiFetch("/api/bills", {
        method: "POST",
        body: JSON.stringify({
          title: billTitle.trim(),
          amount: Number(billAmount),
          due_date: billDueDate,
          note: "",
        }),
      });
      setBillTitle("");
      setBillAmount("");
      await loadAllData();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Gagal menambah tagihan.");
    }
  };

  const handleCreateSavingsPot = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setErrorMsg("");
      await apiFetch("/api/savings", {
        method: "POST",
        body: JSON.stringify({
          name: potName.trim(),
          target_amount: Number(potTarget),
          note: "",
        }),
      });
      setPotName("");
      setPotTarget("");
      await loadAllData();
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : "Gagal membuat pos tabungan."
      );
    }
  };

  const handleSavingsAction = async (
    potId: string,
    action: "deposit" | "withdraw"
  ) => {
    const amount = Number(potActionAmounts[potId] || 0);
    if (amount <= 0) {
      setErrorMsg("Masukkan nominal lebih dari 0.");
      return;
    }
    try {
      setErrorMsg("");
      await apiFetch(`/api/savings/${potId}/${action}`, {
        method: "POST",
        body: JSON.stringify({
          amount,
          date: new Date().toISOString().split("T")[0],
          note: action === "deposit" ? "Setor tabungan" : "Tarik tabungan",
        }),
      });
      setPotActionAmounts((prev) => ({ ...prev, [potId]: "" }));
      await loadAllData();
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : "Gagal memproses mutasi tabungan."
      );
    }
  };

  const handleCreateWishlist = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setErrorMsg("");
      await apiFetch("/api/wishlist", {
        method: "POST",
        body: JSON.stringify({
          name: wishName.trim(),
          price: Number(wishPrice),
          priority: wishPriority,
          category: "Belanja",
          note: "",
        }),
      });
      setWishName("");
      setWishPrice("");
      await loadAllData();
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : "Gagal menambah wishlist."
      );
    }
  };

  const handleBuyWishlist = async (id: string) => {
    try {
      setErrorMsg("");
      await apiFetch(`/api/wishlist/${id}/buy`, {
        method: "POST",
        body: JSON.stringify({ source: "bebas" }),
      });
      await loadAllData();
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : "Gagal membeli item wishlist."
      );
    }
  };

  const handleDeleteWishlist = async (id: string) => {
    try {
      setErrorMsg("");
      await apiFetch(`/api/wishlist/${id}`, { method: "DELETE" });
      await loadAllData();
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : "Gagal menghapus item wishlist."
      );
    }
  };

  if (!authChecked || !user) {
    return (
      <div className="min-h-screen bg-[#070a09] text-[#f4f7f5] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 mx-auto rounded-full border-2 border-[#10b981] border-t-transparent animate-spin" />
          <p className="text-xs font-mono text-[#a3b8ad]">
            Memverifikasi sesi akun...
          </p>
        </div>
      </div>
    );
  }

  const filteredTransactions = transactions.filter((t) => {
    const matchesType = typeFilter === "all" || t.type === typeFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      t.category.toLowerCase().includes(q) ||
      t.party.toLowerCase().includes(q) ||
      t.source.toLowerCase().includes(q) ||
      t.note.toLowerCase().includes(q);
    return matchesType && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#f7f8f7] text-[#0b110e]">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenModal={() => setIsModalOpen(true)}
        onLogout={handleLogout}
        userName={user.name}
        userEmail={user.email}
      />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {errorMsg && (
          <div className="mb-5 flex items-center justify-between rounded-sm border border-red-300 bg-red-50 px-4 py-3 text-xs text-red-800">
            <span>{errorMsg}</span>
            <button
              type="button"
              onClick={() => setErrorMsg("")}
              className="font-semibold underline"
            >
              Tutup
            </button>
          </div>
        )}

        {/* VIEW 1: DASHBOARD OVERVIEW */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="font-display text-2xl sm:text-3xl tracking-tight text-[#0b110e]">
                  Ringkasan Keuangan
                </h1>
                <p className="text-xs text-[#47544d]">
                  Data real dari akun {user.email}
                </p>
              </div>
              <button
                type="button"
                onClick={loadAllData}
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-sm border border-[#0b110e]/15 bg-white px-3 py-1.5 text-xs font-medium text-[#0b110e] hover:bg-[#eef1ef] transition-colors cursor-pointer"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                <span>Segarkan</span>
              </button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                title="Saldo Tersedia"
                value={overview.saldo}
                subtitle={`Kekayaan Bersih: ${formatRupiah(overview.kekayaan_bersih)}`}
                badgeText="Kas Aktif"
                badgeVariant="income"
              />
              <MetricCard
                title="Masuk Hari Ini"
                value={todayData.masuk_hari_ini}
                subtitle={`${todayData.pemasukan_per_sumber_hari_ini.length} sumber pemasukan`}
                badgeText="Hari Ini"
                badgeVariant="income"
              />
              <MetricCard
                title="Keluar Hari Ini"
                value={todayData.keluar_hari_ini}
                subtitle={`Selisih: ${todayData.selisih_hari_ini >= 0 ? "+" : ""}${formatRupiah(todayData.selisih_hari_ini)}`}
                badgeText="Hari Ini"
                badgeVariant="expense"
              />
              <MetricCard
                title="Piutang Berjalan"
                value={overview.piutang_total}
                subtitle={`${piutangList.filter((d) => d.sisa > 0).length} orang belum lunas`}
                badgeText={overview.piutang_total > 0 ? "Aktif" : "Kosong"}
                badgeVariant="neutral"
              />
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Left: Recent Transactions */}
              <div className="lg:col-span-2 rounded-sm border border-[#0b110e]/10 bg-white p-5">
                <div className="flex items-center justify-between border-b border-[#0b110e]/10 pb-3">
                  <div>
                    <h2 className="text-sm font-semibold text-[#0b110e]">
                      Mutasi Transaksi Terbaru
                    </h2>
                    <p className="text-xs text-[#47544d]">
                      Total {transactions.length} transaksi tercatat
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab("transactions")}
                    className="text-xs font-medium text-[#059669] hover:underline cursor-pointer"
                  >
                    Lihat Semua
                  </button>
                </div>

                {transactions.length === 0 ? (
                  <div className="py-12 text-center space-y-3">
                    <Wallet className="h-8 w-8 mx-auto text-[#47544d]/40" />
                    <p className="text-sm text-[#47544d]">
                      Belum ada transaksi tercatat.
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(true)}
                      className="inline-flex items-center gap-1.5 rounded-sm bg-[#10b981] px-3.5 py-2 text-xs font-semibold text-[#070a09] hover:bg-[#34d399] cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Catat Transaksi Pertama</span>
                    </button>
                  </div>
                ) : (
                  <div className="mt-3 divide-y divide-[#0b110e]/10">
                    {transactions.slice(0, 6).map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center justify-between py-3 text-sm"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-8 w-8 items-center justify-center rounded-sm ${
                              t.type === "masuk"
                                ? "bg-[#ecfdf5] text-[#059669]"
                                : "bg-red-50 text-red-600"
                            }`}
                          >
                            {t.type === "masuk" ? (
                              <ArrowDownRight className="h-4 w-4" />
                            ) : (
                              <ArrowUpRight className="h-4 w-4" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-[#0b110e]">
                              {t.category}
                              {t.party && (
                                <span className="text-[#47544d]"> — {t.party}</span>
                              )}
                            </div>
                            <div className="text-xs text-[#47544d]">
                              {t.note || t.source || "Tanpa catatan"} · {t.date}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div
                            className={`font-semibold font-mono num-tabular ${
                              t.type === "masuk" ? "text-[#059669]" : "text-[#0b110e]"
                            }`}
                          >
                            {t.type === "masuk" ? "+" : "-"}
                            {formatRupiah(t.amount)}
                          </div>
                          <div className="text-[11px] font-mono text-[#47544d] num-tabular">
                            Saldo: {formatRupiah(t.saldo_setelah)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Column: Piutang & Kewajiban */}
              <div className="space-y-6">
                <div className="rounded-sm border border-[#0b110e]/10 bg-white p-5">
                  <div className="flex items-center justify-between border-b border-[#0b110e]/10 pb-3">
                    <h2 className="text-sm font-semibold text-[#0b110e]">
                      Piutang Aktif
                    </h2>
                    <button
                      type="button"
                      onClick={() => setActiveTab("debts")}
                      className="text-xs font-medium text-[#059669] hover:underline cursor-pointer"
                    >
                      Detail
                    </button>
                  </div>
                  {piutangList.filter((d) => d.sisa > 0).length === 0 ? (
                    <p className="py-6 text-center text-xs text-[#47544d]">
                      Tidak ada piutang berjalan.
                    </p>
                  ) : (
                    <div className="mt-3 space-y-3">
                      {piutangList
                        .filter((d) => d.sisa > 0)
                        .map((d) => (
                          <div
                            key={d.nama}
                            className="rounded-sm border border-[#0b110e]/10 bg-[#f7f8f7] p-3"
                          >
                            <div className="flex items-center justify-between text-xs font-medium">
                              <span>{d.nama}</span>
                              <span className="font-mono font-semibold text-[#059669] num-tabular">
                                Sisa {formatRupiah(d.sisa)}
                              </span>
                            </div>
                            <div className="mt-2 h-1.5 w-full rounded-full bg-[#0b110e]/10 overflow-hidden">
                              <div
                                className="h-full bg-[#10b981]"
                                style={{ width: `${Math.min(100, d.persen)}%` }}
                              />
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                <div className="rounded-sm border border-[#0b110e]/10 bg-white p-5">
                  <div className="flex items-center justify-between border-b border-[#0b110e]/10 pb-3">
                    <h2 className="text-sm font-semibold text-[#0b110e]">
                      Belum Dibayar
                    </h2>
                    <span className="font-mono text-xs text-[#47544d] num-tabular">
                      {unpaidList.length} item
                    </span>
                  </div>
                  {unpaidList.length === 0 ? (
                    <p className="py-6 text-center text-xs text-[#47544d]">
                      Semua tagihan & langganan aman.
                    </p>
                  ) : (
                    <div className="mt-3 space-y-2.5">
                      {unpaidList.slice(0, 5).map((item, idx) => (
                        <div
                          key={`${item.jenis}-${item.nama}-${idx}`}
                          className="flex items-center justify-between text-xs py-1.5 border-b border-[#0b110e]/5 last:border-0"
                        >
                          <div>
                            <div className="font-medium text-[#0b110e]">{item.nama}</div>
                            <div className="text-[11px] text-[#47544d]">
                              {item.jenis} · {item.status}
                            </div>
                          </div>
                          <span className="font-mono font-semibold num-tabular">
                            {formatRupiah(item.jumlah)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: TRANSACTIONS */}
        {activeTab === "transactions" && (
          <div className="rounded-sm border border-[#0b110e]/10 bg-white p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#0b110e]/10 pb-4">
              <div>
                <h1 className="font-display text-2xl text-[#0b110e]">
                  Riwayat Transaksi
                </h1>
                <p className="text-xs text-[#47544d]">
                  Total {filteredTransactions.length} transaksi ditampilkan
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="h-3.5 w-3.5 text-[#47544d] absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Cari kategori, pihak, catatan..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="rounded-sm border border-[#0b110e]/15 bg-[#f7f8f7] pl-8 pr-3 py-1.5 text-xs focus:border-[#10b981] focus:outline-none"
                  />
                </div>
                <select
                  value={typeFilter}
                  onChange={(e) =>
                    setTypeFilter(e.target.value as "all" | "masuk" | "keluar")
                  }
                  className="rounded-sm border border-[#0b110e]/15 bg-[#f7f8f7] px-2.5 py-1.5 text-xs focus:border-[#10b981] focus:outline-none"
                >
                  <option value="all">Semua</option>
                  <option value="masuk">Masuk (+)</option>
                  <option value="keluar">Keluar (-)</option>
                </select>
              </div>
            </div>

            {filteredTransactions.length === 0 ? (
              <p className="py-10 text-center text-sm text-[#47544d]">
                Tidak ada transaksi yang cocok.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#0b110e]/10 text-[#47544d]">
                      <th className="py-2.5 font-medium">Tanggal</th>
                      <th className="py-2.5 font-medium">Kategori</th>
                      <th className="py-2.5 font-medium">Pihak / Sumber</th>
                      <th className="py-2.5 font-medium">Catatan</th>
                      <th className="py-2.5 font-medium text-right">Nominal</th>
                      <th className="py-2.5 font-medium text-right">Saldo</th>
                      <th className="py-2.5 font-medium text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#0b110e]/10">
                    {filteredTransactions.map((t) => (
                      <tr key={t.id} className="hover:bg-[#f7f8f7]">
                        <td className="py-3 font-mono num-tabular">{t.date}</td>
                        <td className="py-3 font-medium">{t.category}</td>
                        <td className="py-3 text-[#47544d]">
                          {t.party || t.source || "-"}
                        </td>
                        <td className="py-3 text-[#47544d]">{t.note || "-"}</td>
                        <td
                          className={`py-3 text-right font-mono font-semibold num-tabular ${
                            t.type === "masuk" ? "text-[#059669]" : "text-[#0b110e]"
                          }`}
                        >
                          {t.type === "masuk" ? "+" : "-"}
                          {formatRupiah(t.amount)}
                        </td>
                        <td className="py-3 text-right font-mono num-tabular text-[#47544d]">
                          {formatRupiah(t.saldo_setelah)}
                        </td>
                        <td className="py-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteTransaction(t.id)}
                            title="Hapus transaksi"
                            className="p-1 text-[#47544d] hover:text-red-600 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* VIEW 3: DEBTS */}
        {activeTab === "debts" && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="rounded-sm border border-[#0b110e]/10 bg-white p-5 space-y-4">
              <h2 className="font-display text-xl text-[#0b110e]">
                Piutang (Orang Berhutang ke Anda)
              </h2>
              {piutangList.length === 0 ? (
                <p className="py-8 text-center text-xs text-[#47544d]">
                  Belum ada catatan piutang.
                </p>
              ) : (
                <div className="space-y-3">
                  {piutangList.map((d) => (
                    <div
                      key={d.nama}
                      className="rounded-sm border border-[#0b110e]/10 p-4 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm">{d.nama}</span>
                        <span className="rounded-full bg-[#ecfdf5] px-2.5 py-0.5 text-[11px] font-semibold text-[#059669]">
                          {d.status}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs text-[#47544d] font-mono num-tabular">
                        <span>Total: {formatRupiah(d.total)}</span>
                        <span>Dibayar: {formatRupiah(d.dibayar)}</span>
                        <span className="font-semibold text-[#0b110e]">
                          Sisa: {formatRupiah(d.sisa)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-sm border border-[#0b110e]/10 bg-white p-5 space-y-4">
              <h2 className="font-display text-xl text-[#0b110e]">
                Hutang Saya
              </h2>
              {hutangSayaList.length === 0 ? (
                <p className="py-8 text-center text-xs text-[#47544d]">
                  Tidak ada catatan hutang aktif.
                </p>
              ) : (
                <div className="space-y-3">
                  {hutangSayaList.map((d) => (
                    <div
                      key={d.nama}
                      className="rounded-sm border border-[#0b110e]/10 p-4 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm">{d.nama}</span>
                        <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700">
                          {d.status}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs text-[#47544d] font-mono num-tabular">
                        <span>Total: {formatRupiah(d.total)}</span>
                        <span>Dibayar: {formatRupiah(d.dibayar)}</span>
                        <span className="font-semibold text-[#0b110e]">
                          Sisa: {formatRupiah(d.sisa)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW 4: SUBSCRIPTIONS & BILLS */}
        {activeTab === "subscriptions" && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Subscriptions */}
            <div className="rounded-sm border border-[#0b110e]/10 bg-white p-5 space-y-5">
              <h2 className="font-display text-xl text-[#0b110e]">
                Langganan Rutin
              </h2>

              <form onSubmit={handleCreateSubscription} className="grid grid-cols-2 gap-2.5">
                <input
                  type="text"
                  required
                  placeholder="Nama langganan (mis. Internet)"
                  value={subName}
                  onChange={(e) => setSubName(e.target.value)}
                  className="col-span-2 sm:col-span-1 rounded-sm border border-[#0b110e]/15 bg-[#f7f8f7] px-3 py-2 text-xs focus:border-[#10b981] focus:outline-none"
                />
                <input
                  type="number"
                  required
                  min={1}
                  placeholder="Nominal (Rp)"
                  value={subAmount}
                  onChange={(e) => setSubAmount(e.target.value)}
                  className="col-span-2 sm:col-span-1 rounded-sm border border-[#0b110e]/15 bg-[#f7f8f7] px-3 py-2 text-xs focus:border-[#10b981] focus:outline-none"
                />
                <select
                  value={subCycle}
                  onChange={(e) =>
                    setSubCycle(
                      e.target.value as "mingguan" | "bulanan" | "3_bulanan" | "tahunan"
                    )
                  }
                  className="rounded-sm border border-[#0b110e]/15 bg-[#f7f8f7] px-3 py-2 text-xs focus:border-[#10b981] focus:outline-none"
                >
                  <option value="mingguan">Mingguan</option>
                  <option value="bulanan">Bulanan</option>
                  <option value="3_bulanan">3 Bulanan</option>
                  <option value="tahunan">Tahunan</option>
                </select>
                <input
                  type="date"
                  required
                  value={subFirstDue}
                  onChange={(e) => setSubFirstDue(e.target.value)}
                  className="rounded-sm border border-[#0b110e]/15 bg-[#f7f8f7] px-3 py-2 text-xs focus:border-[#10b981] focus:outline-none"
                />
                <button
                  type="submit"
                  className="col-span-2 rounded-sm bg-[#0b110e] hover:bg-[#10b981] hover:text-[#070a09] text-white py-2 text-xs font-semibold transition-colors cursor-pointer"
                >
                  + Tambah Langganan
                </button>
              </form>

              {subscriptions.length === 0 ? (
                <p className="py-6 text-center text-xs text-[#47544d]">
                  Belum ada langganan terdaftar.
                </p>
              ) : (
                <div className="space-y-3">
                  {subscriptions.map((sub) => (
                    <div
                      key={sub.id}
                      className="flex items-center justify-between rounded-sm border border-[#0b110e]/10 p-3.5"
                    >
                      <div>
                        <div className="text-sm font-semibold">{sub.name}</div>
                        <div className="text-xs text-[#47544d] flex items-center gap-2 mt-0.5">
                          <Calendar className="h-3 w-3" />
                          <span>
                            {sub.cycle} · Jatuh tempo {sub.jatuh_tempo} · {sub.status}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm font-semibold num-tabular">
                          {formatRupiah(sub.amount)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handlePaySubscription(sub.id)}
                          className="rounded-sm bg-[#10b981] px-3 py-1.5 text-xs font-semibold text-[#070a09] hover:bg-[#34d399] cursor-pointer"
                        >
                          Bayar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bills */}
            <div className="rounded-sm border border-[#0b110e]/10 bg-white p-5 space-y-5">
              <h2 className="font-display text-xl text-[#0b110e]">
                Tagihan Sekali Bayar
              </h2>

              <form onSubmit={handleCreateBill} className="grid grid-cols-2 gap-2.5">
                <input
                  type="text"
                  required
                  placeholder="Nama tagihan"
                  value={billTitle}
                  onChange={(e) => setBillTitle(e.target.value)}
                  className="col-span-2 rounded-sm border border-[#0b110e]/15 bg-[#f7f8f7] px-3 py-2 text-xs focus:border-[#10b981] focus:outline-none"
                />
                <input
                  type="number"
                  required
                  min={1}
                  placeholder="Nominal (Rp)"
                  value={billAmount}
                  onChange={(e) => setBillAmount(e.target.value)}
                  className="rounded-sm border border-[#0b110e]/15 bg-[#f7f8f7] px-3 py-2 text-xs focus:border-[#10b981] focus:outline-none"
                />
                <input
                  type="date"
                  required
                  value={billDueDate}
                  onChange={(e) => setBillDueDate(e.target.value)}
                  className="rounded-sm border border-[#0b110e]/15 bg-[#f7f8f7] px-3 py-2 text-xs focus:border-[#10b981] focus:outline-none"
                />
                <button
                  type="submit"
                  className="col-span-2 rounded-sm bg-[#0b110e] hover:bg-[#10b981] hover:text-[#070a09] text-white py-2 text-xs font-semibold transition-colors cursor-pointer"
                >
                  + Tambah Tagihan
                </button>
              </form>

              {bills.length === 0 ? (
                <p className="py-6 text-center text-xs text-[#47544d]">
                  Belum ada tagihan terdaftar.
                </p>
              ) : (
                <div className="space-y-3">
                  {bills.map((bill) => (
                    <div
                      key={bill.id}
                      className="flex items-center justify-between rounded-sm border border-[#0b110e]/10 p-3.5"
                    >
                      <div>
                        <div className="text-sm font-semibold">{bill.title}</div>
                        <div className="text-xs text-[#47544d]">
                          Jatuh tempo {bill.due_date} · {bill.status}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm font-semibold num-tabular">
                          {formatRupiah(bill.amount)}
                        </span>
                        {!bill.paid ? (
                          <button
                            type="button"
                            onClick={() => handlePayBill(bill.id)}
                            className="rounded-sm bg-[#10b981] px-3 py-1.5 text-xs font-semibold text-[#070a09] hover:bg-[#34d399] cursor-pointer"
                          >
                            Bayar
                          </button>
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-[#059669]" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW 5: SAVINGS */}
        {activeTab === "savings" && (
          <div className="space-y-6">
            <div className="rounded-sm border border-[#0b110e]/10 bg-white p-5">
              <h2 className="font-display text-xl text-[#0b110e] mb-4">
                Buat Pos Tabungan Baru
              </h2>
              <form
                onSubmit={handleCreateSavingsPot}
                className="grid grid-cols-1 sm:grid-cols-3 gap-3"
              >
                <input
                  type="text"
                  required
                  placeholder="Nama pos (mis. Dana Darurat)"
                  value={potName}
                  onChange={(e) => setPotName(e.target.value)}
                  className="rounded-sm border border-[#0b110e]/15 bg-[#f7f8f7] px-3 py-2 text-xs focus:border-[#10b981] focus:outline-none"
                />
                <input
                  type="number"
                  required
                  min={1}
                  placeholder="Target nominal (Rp)"
                  value={potTarget}
                  onChange={(e) => setPotTarget(e.target.value)}
                  className="rounded-sm border border-[#0b110e]/15 bg-[#f7f8f7] px-3 py-2 text-xs focus:border-[#10b981] focus:outline-none"
                />
                <button
                  type="submit"
                  className="rounded-sm bg-[#10b981] hover:bg-[#34d399] text-[#070a09] py-2 px-4 text-xs font-semibold cursor-pointer"
                >
                  + Buat Pos Tabungan
                </button>
              </form>
            </div>

            {savingsPots.length === 0 ? (
              <div className="rounded-sm border border-[#0b110e]/10 bg-white py-12 text-center">
                <PiggyBank className="h-8 w-8 mx-auto text-[#47544d]/40 mb-2" />
                <p className="text-sm text-[#47544d]">
                  Belum ada pos tabungan. Buat pos pertama Anda di atas.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {savingsPots.map((pot) => {
                  const pct =
                    pot.target_amount > 0
                      ? Math.min(100, Math.round((pot.saved_amount / pot.target_amount) * 100))
                      : 0;
                  return (
                    <div
                      key={pot.id}
                      className="rounded-sm border border-[#0b110e]/10 bg-white p-5 space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-base">{pot.name}</h3>
                          <p className="text-xs font-mono text-[#47544d] num-tabular">
                            {formatRupiah(pot.saved_amount)} / {formatRupiah(pot.target_amount)} ({pct}%)
                          </p>
                        </div>
                      </div>
                      <div className="h-2 w-full rounded-full bg-[#eef1ef] overflow-hidden">
                        <div
                          className="h-full bg-[#10b981]"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={1}
                          placeholder="Nominal (Rp)"
                          value={potActionAmounts[pot.id] || ""}
                          onChange={(e) =>
                            setPotActionAmounts((prev) => ({
                              ...prev,
                              [pot.id]: e.target.value,
                            }))
                          }
                          className="flex-1 rounded-sm border border-[#0b110e]/15 bg-[#f7f8f7] px-3 py-1.5 text-xs focus:border-[#10b981] focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleSavingsAction(pot.id, "deposit")}
                          className="rounded-sm bg-[#10b981] px-3 py-1.5 text-xs font-semibold text-[#070a09] hover:bg-[#34d399] cursor-pointer"
                        >
                          Setor
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSavingsAction(pot.id, "withdraw")}
                          className="rounded-sm border border-[#0b110e]/15 px-3 py-1.5 text-xs font-medium text-[#0b110e] hover:bg-[#eef1ef] cursor-pointer"
                        >
                          Tarik
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* VIEW 6: WISHLIST */}
        {activeTab === "wishlist" && (
          <div className="space-y-6">
            <div className="rounded-sm border border-[#0b110e]/10 bg-white p-5">
              <h2 className="font-display text-xl text-[#0b110e] mb-4">
                Tambah Item Wishlist
              </h2>
              <form
                onSubmit={handleCreateWishlist}
                className="grid grid-cols-1 sm:grid-cols-4 gap-3"
              >
                <input
                  type="text"
                  required
                  placeholder="Nama barang"
                  value={wishName}
                  onChange={(e) => setWishName(e.target.value)}
                  className="rounded-sm border border-[#0b110e]/15 bg-[#f7f8f7] px-3 py-2 text-xs focus:border-[#10b981] focus:outline-none"
                />
                <input
                  type="number"
                  required
                  min={1}
                  placeholder="Harga (Rp)"
                  value={wishPrice}
                  onChange={(e) => setWishPrice(e.target.value)}
                  className="rounded-sm border border-[#0b110e]/15 bg-[#f7f8f7] px-3 py-2 text-xs focus:border-[#10b981] focus:outline-none"
                />
                <select
                  value={wishPriority}
                  onChange={(e) =>
                    setWishPriority(
                      e.target.value as "rendah" | "sedang" | "tinggi"
                    )
                  }
                  className="rounded-sm border border-[#0b110e]/15 bg-[#f7f8f7] px-3 py-2 text-xs focus:border-[#10b981] focus:outline-none"
                >
                  <option value="tinggi">Prioritas Tinggi</option>
                  <option value="sedang">Prioritas Sedang</option>
                  <option value="rendah">Prioritas Rendah</option>
                </select>
                <button
                  type="submit"
                  className="rounded-sm bg-[#10b981] hover:bg-[#34d399] text-[#070a09] py-2 px-4 text-xs font-semibold cursor-pointer"
                >
                  + Tambah Wishlist
                </button>
              </form>
            </div>

            {wishlistItems.length === 0 ? (
              <div className="rounded-sm border border-[#0b110e]/10 bg-white py-12 text-center">
                <ShoppingBag className="h-8 w-8 mx-auto text-[#47544d]/40 mb-2" />
                <p className="text-sm text-[#47544d]">
                  Belum ada item wishlist.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {wishlistItems.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-sm border border-[#0b110e]/10 bg-white p-5 flex flex-col justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs uppercase font-mono text-[#059669]">
                          {item.priority}
                        </span>
                        <span className="text-xs text-[#47544d]">{item.status}</span>
                      </div>
                      <h3 className="mt-1 font-semibold text-base text-[#0b110e]">
                        {item.name}
                      </h3>
                      <p className="mt-1 font-mono text-lg font-bold text-[#0b110e] num-tabular">
                        {formatRupiah(item.price)}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-2 pt-3 border-t border-[#0b110e]/10">
                      {item.status === "aktif" ? (
                        <button
                          type="button"
                          onClick={() => handleBuyWishlist(item.id)}
                          className="flex-1 rounded-sm bg-[#10b981] py-1.5 text-xs font-semibold text-[#070a09] hover:bg-[#34d399] cursor-pointer"
                        >
                          Beli Sekarang
                        </button>
                      ) : (
                        <span className="text-xs font-medium text-[#059669]">
                          Sudah Dibeli
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteWishlist(item.id)}
                        title="Hapus wishlist"
                        className="p-1.5 text-[#47544d] hover:text-red-600 cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateTransaction}
      />
    </div>
  );
}
