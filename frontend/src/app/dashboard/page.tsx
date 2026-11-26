"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  ExternalLink,
  ImagePlus,
  Link2,
  Plus,
  RefreshCw,
  Search,
  ShoppingBag,
  Trash2,
  Wallet,
  PiggyBank,
} from "lucide-react";
import { Header } from "../../components/Header";
import { MetricCard, formatRupiah } from "../../components/MetricCard";
import { TransactionModal } from "../../components/TransactionModal";
import {
  apiFetch,
  clearAuthSession,
  getStoredAccessToken,
  logoutUser,
  uploadWishlistImage,
} from "../../lib/api";
import {
  Bill,
  DebtSummary,
  OverviewData,
  SavingsMovement,
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

interface DebtDetailResponse {
  riwayat?: Transaction[];
  transaksi?: Transaction[];
}

interface FetchLinkResponse {
  ok: boolean;
  situs: string;
  link_asli: string;
  link_akhir: string;
  nama: string;
  harga?: number | null;
  gambar_kandidat?: string;
  pesan?: string;
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
  const [successMsg, setSuccessMsg] = useState("");

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
  const [savingsMovements, setSavingsMovements] = useState<SavingsMovement[]>([]);
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);

  // Debt payment & history states
  const [activeDebtPay, setActiveDebtPay] = useState<{
    kind: "piutang" | "hutang";
    nama: string;
  } | null>(null);
  const [debtPayAmount, setDebtPayAmount] = useState("");
  const [debtPayNote, setDebtPayNote] = useState("");
  const [expandedDebtHistory, setExpandedDebtHistory] = useState<Record<string, Transaction[]>>({});

  // Subscription & Bill form states
  const [subName, setSubName] = useState("");
  const [subAmount, setSubAmount] = useState("");
  const [subCycle, setSubCycle] = useState<"mingguan" | "bulanan" | "3_bulanan" | "tahunan">("bulanan");
  const [subFirstDue, setSubFirstDue] = useState("");

  const [billTitle, setBillTitle] = useState("");
  const [billAmount, setBillAmount] = useState("");
  const [billDueDate, setBillDueDate] = useState("");

  // Savings form states
  const [potName, setPotName] = useState("");
  const [potTarget, setPotTarget] = useState("");
  const [potNote, setPotNote] = useState("");
  const [potActionAmounts, setPotActionAmounts] = useState<Record<string, string>>({});
  const [potActionNotes, setPotActionNotes] = useState<Record<string, string>>({});

  // Wishlist form states (with link fetch & photo upload/URL)
  const [wishLink, setWishLink] = useState("");
  const [wishName, setWishName] = useState("");
  const [wishPrice, setWishPrice] = useState("");
  const [wishPriority, setWishPriority] = useState<"rendah" | "sedang" | "tinggi">("sedang");
  const [wishImageURL, setWishImageURL] = useState("");
  const [wishImageID, setWishImageID] = useState("");
  const [wishPreviewURL, setWishPreviewURL] = useState("");
  const [wishNote, setWishNote] = useState("");
  const [wishPriceSource, setWishPriceSource] = useState<"manual" | "link">("manual");
  const [fetchingLink, setFetchingLink] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const loadAllData = useCallback(async () => {
    setLoading(true);
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
        movementsRes,
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
        apiFetch<{ pos?: SavingsPot[]; pots?: SavingsPot[] } | SavingsPot[]>("/api/savings"),
        apiFetch<SavingsMovement[]>("/api/savings/movements"),
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
        : Array.isArray(savingsRes?.pos)
        ? savingsRes.pos
        : Array.isArray(savingsRes?.pots)
        ? savingsRes.pots
        : [];
      setSavingsPots(potsArray);
      setSavingsMovements(Array.isArray(movementsRes) ? movementsRes : []);

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
      setSuccessMsg("");
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

  const handleSubmitDebtPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDebtPay) return;
    const nominal = Number(debtPayAmount);
    if (nominal <= 0) {
      setErrorMsg("Nominal pembayaran harus lebih dari 0.");
      return;
    }

    try {
      setErrorMsg("");
      setSuccessMsg("");
      const isPiutang = activeDebtPay.kind === "piutang";
      await apiFetch("/api/transactions", {
        method: "POST",
        body: JSON.stringify({
          date: new Date().toISOString().split("T")[0],
          type: isPiutang ? "masuk" : "keluar",
          category: isPiutang ? "Terima Bayar Hutang" : "Bayar Hutang Saya",
          party: activeDebtPay.nama,
          source: isPiutang ? activeDebtPay.nama : "",
          note:
            debtPayNote.trim() ||
            `Pembayaran ${isPiutang ? "piutang" : "hutang"} ${formatRupiah(nominal)}`,
          amount: nominal,
          items: [],
        }),
      });
      const paidName = activeDebtPay.nama;
      setActiveDebtPay(null);
      setDebtPayAmount("");
      setDebtPayNote("");
      setSuccessMsg(`Pembayaran untuk ${paidName} berhasil dicatat.`);
      await loadAllData();
      // Refresh expanded history if open
      if (expandedDebtHistory[paidName]) {
        const res = await apiFetch<DebtDetailResponse>(
          `/api/debts/${encodeURIComponent(paidName)}`
        );
        const list = res.riwayat || res.transaksi || [];
        setExpandedDebtHistory((prev) => ({ ...prev, [paidName]: list }));
      }
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : "Gagal mencatat pembayaran."
      );
    }
  };

  const handleToggleDebtHistory = async (nama: string) => {
    if (expandedDebtHistory[nama]) {
      setExpandedDebtHistory((prev) => {
        const copy = { ...prev };
        delete copy[nama];
        return copy;
      });
      return;
    }
    try {
      const res = await apiFetch<DebtDetailResponse>(
        `/api/debts/${encodeURIComponent(nama)}`
      );
      const list = res.riwayat || res.transaksi || [];
      setExpandedDebtHistory((prev) => ({ ...prev, [nama]: list }));
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : "Gagal mengambil riwayat catatan."
      );
    }
  };

  const handlePaySubscription = async (id: string) => {
    try {
      setErrorMsg("");
      setSuccessMsg("");
      await apiFetch(`/api/subscriptions/${id}/pay`, { method: "POST" });
      setSuccessMsg("Pembayaran langganan berhasil dicatat.");
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
      setSuccessMsg("");
      await apiFetch(`/api/bills/${id}/pay`, { method: "POST" });
      setSuccessMsg("Tagihan berhasil dibayar.");
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
      setSuccessMsg("");
      await apiFetch("/api/savings", {
        method: "POST",
        body: JSON.stringify({
          name: potName.trim(),
          target_amount: Number(potTarget),
          note: potNote.trim(),
        }),
      });
      setPotName("");
      setPotTarget("");
      setPotNote("");
      setSuccessMsg("Pos tabungan berhasil dibuat.");
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
      setSuccessMsg("");
      const customNote = (potActionNotes[potId] || "").trim();
      await apiFetch(`/api/savings/${potId}/${action}`, {
        method: "POST",
        body: JSON.stringify({
          amount,
          date: new Date().toISOString().split("T")[0],
          note:
            customNote ||
            (action === "deposit" ? "Setor tabungan" : "Tarik tabungan"),
        }),
      });
      setPotActionAmounts((prev) => ({ ...prev, [potId]: "" }));
      setPotActionNotes((prev) => ({ ...prev, [potId]: "" }));
      setSuccessMsg(
        action === "deposit"
          ? "Setoran tabungan berhasil dicatat."
          : "Penarikan tabungan berhasil dicatat."
      );
      await loadAllData();
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : "Gagal memproses mutasi tabungan."
      );
    }
  };

  const handleFetchWishlistLink = async () => {
    const url = wishLink.trim();
    if (!url) {
      setErrorMsg("Masukkan link produk terlebih dahulu.");
      return;
    }
    setFetchingLink(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const meta = await apiFetch<FetchLinkResponse>("/api/wishlist/fetch-link", {
        method: "POST",
        body: JSON.stringify({ url }),
      });
      if (meta.link_akhir) setWishLink(meta.link_akhir);
      if (meta.nama) setWishName(meta.nama);
      if (meta.harga && meta.harga > 0) {
        setWishPrice(String(meta.harga));
        setWishPriceSource("link");
      }
      if (meta.gambar_kandidat) {
        setWishImageURL(meta.gambar_kandidat);
        setWishPreviewURL(meta.gambar_kandidat);
        setWishImageID("");
      }
      if (!meta.ok && meta.pesan) {
        setErrorMsg(meta.pesan);
      } else {
        setSuccessMsg("Data produk berhasil diambil dari link.");
      }
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : "Gagal mengambil data dari link."
      );
    } finally {
      setFetchingLink(false);
    }
  };

  const handleUploadWishlistFile = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    setErrorMsg("");
    try {
      const uploaded = await uploadWishlistImage(file);
      setWishImageID(uploaded.image_id);
      setWishPreviewURL(uploaded.preview_url);
      setWishImageURL("");
      setSuccessMsg("Foto produk berhasil diunggah.");
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : "Gagal mengunggah foto produk."
      );
    } finally {
      setUploadingImage(false);
    }
  };

  const handleCreateWishlist = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setErrorMsg("");
      setSuccessMsg("");
      await apiFetch("/api/wishlist", {
        method: "POST",
        body: JSON.stringify({
          name: wishName.trim(),
          price: Number(wishPrice),
          priority: wishPriority,
          category: "Belanja",
          link: wishLink.trim() || undefined,
          image_id: wishImageID || undefined,
          image_url: !wishImageID && wishImageURL.trim() ? wishImageURL.trim() : undefined,
          price_source: wishPriceSource,
          note: wishNote.trim(),
        }),
      });
      setWishLink("");
      setWishName("");
      setWishPrice("");
      setWishImageURL("");
      setWishImageID("");
      setWishPreviewURL("");
      setWishNote("");
      setWishPriceSource("manual");
      setSuccessMsg("Item wishlist berhasil disimpan.");
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
      setSuccessMsg("");
      await apiFetch(`/api/wishlist/${id}/buy`, {
        method: "POST",
        body: JSON.stringify({ source: "bebas" }),
      });
      setSuccessMsg("Pembelian wishlist berhasil dicatat.");
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
              className="font-semibold underline cursor-pointer"
            >
              Tutup
            </button>
          </div>
        )}

        {successMsg && (
          <div className="mb-5 flex items-center justify-between rounded-sm border border-[#10b981]/40 bg-[#ecfdf5] px-4 py-3 text-xs text-[#059669]">
            <span>{successMsg}</span>
            <button
              type="button"
              onClick={() => setSuccessMsg("")}
              className="font-semibold underline cursor-pointer"
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

        {/* VIEW 3: DEBTS WITH PARTIAL PAYMENT & NOTES */}
        {activeTab === "debts" && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Piutang */}
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
                  {piutangList.map((d) => {
                    const isPaying =
                      activeDebtPay?.kind === "piutang" &&
                      activeDebtPay?.nama === d.nama;
                    const history = expandedDebtHistory[d.nama];

                    return (
                      <div
                        key={d.nama}
                        className="rounded-sm border border-[#0b110e]/10 p-4 space-y-3"
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
                        <div className="h-1.5 w-full rounded-full bg-[#eef1ef] overflow-hidden">
                          <div
                            className="h-full bg-[#10b981]"
                            style={{ width: `${Math.min(100, d.persen)}%` }}
                          />
                        </div>

                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          {d.sisa > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                setActiveDebtPay(
                                  isPaying ? null : { kind: "piutang", nama: d.nama }
                                );
                                setDebtPayAmount(String(d.sisa));
                                setDebtPayNote("");
                              }}
                              className="rounded-sm bg-[#10b981] px-3 py-1.5 text-xs font-semibold text-[#070a09] hover:bg-[#34d399] cursor-pointer"
                            >
                              {isPaying ? "Batal" : "Update / Cicil Bayar"}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleToggleDebtHistory(d.nama)}
                            className="rounded-sm border border-[#0b110e]/15 px-3 py-1.5 text-xs font-medium text-[#0b110e] hover:bg-[#eef1ef] cursor-pointer"
                          >
                            {history ? "Tutup Catatan" : "Lihat Catatan"}
                          </button>
                        </div>

                        {isPaying && (
                          <form
                            onSubmit={handleSubmitDebtPayment}
                            className="rounded-sm border border-[#10b981]/30 bg-[#f7f8f7] p-3 space-y-2.5"
                          >
                            <div className="text-xs font-semibold text-[#0b110e]">
                              Catat Pembayaran dari {d.nama}
                            </div>
                            <input
                              type="number"
                              required
                              min={1}
                              max={d.sisa}
                              placeholder="Nominal dibayar (Rp)"
                              value={debtPayAmount}
                              onChange={(e) => setDebtPayAmount(e.target.value)}
                              className="w-full rounded-sm border border-[#0b110e]/15 bg-white px-3 py-1.5 text-xs focus:border-[#10b981] focus:outline-none"
                            />
                            <input
                              type="text"
                              placeholder="Catatan (mis. Baru dibayar Rp 10.000, sisa menyusul)"
                              value={debtPayNote}
                              onChange={(e) => setDebtPayNote(e.target.value)}
                              className="w-full rounded-sm border border-[#0b110e]/15 bg-white px-3 py-1.5 text-xs focus:border-[#10b981] focus:outline-none"
                            />
                            <button
                              type="submit"
                              className="w-full rounded-sm bg-[#059669] hover:bg-[#10b981] text-white py-1.5 text-xs font-semibold cursor-pointer"
                            >
                              Simpan Pembayaran
                            </button>
                          </form>
                        )}

                        {history && (
                          <div className="rounded-sm border border-[#0b110e]/10 bg-[#f7f8f7] p-3 space-y-2">
                            <div className="text-[11px] font-semibold uppercase tracking-wider text-[#47544d]">
                              Riwayat & Catatan ({history.length})
                            </div>
                            {history.length === 0 ? (
                              <p className="text-xs text-[#47544d]">
                                Belum ada riwayat transaksi.
                              </p>
                            ) : (
                              <div className="space-y-1.5">
                                {history.map((h) => (
                                  <div
                                    key={h.id}
                                    className="flex items-start justify-between gap-2 text-xs border-b border-[#0b110e]/10 pb-1.5 last:border-0 last:pb-0"
                                  >
                                    <div>
                                      <div className="font-medium text-[#0b110e]">
                                        {h.category} ·{" "}
                                        <span className="font-mono text-[#47544d]">
                                          {h.date}
                                        </span>
                                      </div>
                                      <div className="text-[11px] text-[#47544d]">
                                        {h.note || "Tanpa catatan"}
                                      </div>
                                    </div>
                                    <span
                                      className={`font-mono font-semibold num-tabular ${
                                        h.type === "masuk"
                                          ? "text-[#059669]"
                                          : "text-[#0b110e]"
                                      }`}
                                    >
                                      {h.type === "masuk" ? "+" : "-"}
                                      {formatRupiah(h.amount)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Hutang Saya */}
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
                  {hutangSayaList.map((d) => {
                    const isPaying =
                      activeDebtPay?.kind === "hutang" &&
                      activeDebtPay?.nama === d.nama;
                    const history = expandedDebtHistory[d.nama];

                    return (
                      <div
                        key={d.nama}
                        className="rounded-sm border border-[#0b110e]/10 p-4 space-y-3"
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
                        <div className="h-1.5 w-full rounded-full bg-[#eef1ef] overflow-hidden">
                          <div
                            className="h-full bg-[#10b981]"
                            style={{ width: `${Math.min(100, d.persen)}%` }}
                          />
                        </div>

                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          {d.sisa > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                setActiveDebtPay(
                                  isPaying ? null : { kind: "hutang", nama: d.nama }
                                );
                                setDebtPayAmount(String(d.sisa));
                                setDebtPayNote("");
                              }}
                              className="rounded-sm bg-[#10b981] px-3 py-1.5 text-xs font-semibold text-[#070a09] hover:bg-[#34d399] cursor-pointer"
                            >
                              {isPaying ? "Batal" : "Bayar / Cicil"}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleToggleDebtHistory(d.nama)}
                            className="rounded-sm border border-[#0b110e]/15 px-3 py-1.5 text-xs font-medium text-[#0b110e] hover:bg-[#eef1ef] cursor-pointer"
                          >
                            {history ? "Tutup Catatan" : "Lihat Catatan"}
                          </button>
                        </div>

                        {isPaying && (
                          <form
                            onSubmit={handleSubmitDebtPayment}
                            className="rounded-sm border border-[#10b981]/30 bg-[#f7f8f7] p-3 space-y-2.5"
                          >
                            <div className="text-xs font-semibold text-[#0b110e]">
                              Bayar Hutang ke {d.nama}
                            </div>
                            <input
                              type="number"
                              required
                              min={1}
                              max={d.sisa}
                              placeholder="Nominal dibayar (Rp)"
                              value={debtPayAmount}
                              onChange={(e) => setDebtPayAmount(e.target.value)}
                              className="w-full rounded-sm border border-[#0b110e]/15 bg-white px-3 py-1.5 text-xs focus:border-[#10b981] focus:outline-none"
                            />
                            <input
                              type="text"
                              placeholder="Catatan (mis. Baru dibayar segini)"
                              value={debtPayNote}
                              onChange={(e) => setDebtPayNote(e.target.value)}
                              className="w-full rounded-sm border border-[#0b110e]/15 bg-white px-3 py-1.5 text-xs focus:border-[#10b981] focus:outline-none"
                            />
                            <button
                              type="submit"
                              className="w-full rounded-sm bg-[#059669] hover:bg-[#10b981] text-white py-1.5 text-xs font-semibold cursor-pointer"
                            >
                              Simpan Pembayaran
                            </button>
                          </form>
                        )}

                        {history && (
                          <div className="rounded-sm border border-[#0b110e]/10 bg-[#f7f8f7] p-3 space-y-2">
                            <div className="text-[11px] font-semibold uppercase tracking-wider text-[#47544d]">
                              Riwayat & Catatan ({history.length})
                            </div>
                            {history.length === 0 ? (
                              <p className="text-xs text-[#47544d]">
                                Belum ada riwayat transaksi.
                              </p>
                            ) : (
                              <div className="space-y-1.5">
                                {history.map((h) => (
                                  <div
                                    key={h.id}
                                    className="flex items-start justify-between gap-2 text-xs border-b border-[#0b110e]/10 pb-1.5 last:border-0 last:pb-0"
                                  >
                                    <div>
                                      <div className="font-medium text-[#0b110e]">
                                        {h.category} ·{" "}
                                        <span className="font-mono text-[#47544d]">
                                          {h.date}
                                        </span>
                                      </div>
                                      <div className="text-[11px] text-[#47544d]">
                                        {h.note || "Tanpa catatan"}
                                      </div>
                                    </div>
                                    <span className="font-mono font-semibold num-tabular">
                                      {formatRupiah(h.amount)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
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

        {/* VIEW 5: SAVINGS (FIXED POS + MOVEMENTS HISTORY) */}
        {activeTab === "savings" && (
          <div className="space-y-6">
            <div className="rounded-sm border border-[#0b110e]/10 bg-white p-5">
              <h2 className="font-display text-xl text-[#0b110e] mb-4">
                Buat Pos Tabungan Baru
              </h2>
              <form
                onSubmit={handleCreateSavingsPot}
                className="grid grid-cols-1 sm:grid-cols-4 gap-3"
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
                <input
                  type="text"
                  placeholder="Catatan pos (opsional)"
                  value={potNote}
                  onChange={(e) => setPotNote(e.target.value)}
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
                  const target = pot.target || 0;
                  const saldo = pot.saldo || 0;
                  const pct =
                    target > 0
                      ? Math.min(100, Math.round((saldo / target) * 100))
                      : 0;
                  return (
                    <div
                      key={pot.id}
                      className="rounded-sm border border-[#0b110e]/10 bg-white p-5 space-y-4"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold text-base">{pot.name}</h3>
                          {pot.note && (
                            <p className="text-xs text-[#47544d] mt-0.5">{pot.note}</p>
                          )}
                          <p className="text-xs font-mono text-[#47544d] num-tabular mt-1">
                            {formatRupiah(saldo)}
                            {target > 0 ? ` / ${formatRupiah(target)} (${pct}%)` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="h-2 w-full rounded-full bg-[#eef1ef] overflow-hidden">
                        <div
                          className="h-full bg-[#10b981]"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="space-y-2">
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
                        <input
                          type="text"
                          placeholder="Catatan mutasi tabungan (opsional)"
                          value={potActionNotes[pot.id] || ""}
                          onChange={(e) =>
                            setPotActionNotes((prev) => ({
                              ...prev,
                              [pot.id]: e.target.value,
                            }))
                          }
                          className="w-full rounded-sm border border-[#0b110e]/15 bg-[#f7f8f7] px-3 py-1.5 text-xs focus:border-[#10b981] focus:outline-none"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Savings Movements History */}
            <div className="rounded-sm border border-[#0b110e]/10 bg-white p-5 space-y-3">
              <h3 className="font-display text-lg text-[#0b110e]">
                Catatan Mutasi Tabungan ({savingsMovements.length})
              </h3>
              {savingsMovements.length === 0 ? (
                <p className="py-6 text-center text-xs text-[#47544d]">
                  Belum ada catatan setor atau tarik tabungan.
                </p>
              ) : (
                <div className="divide-y divide-[#0b110e]/10">
                  {savingsMovements.map((m) => (
                    <div
                      key={m.id}
                      className="py-2.5 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-semibold text-[#0b110e]">
                          {m.pot_name} ·{" "}
                          <span className="uppercase font-mono text-[#059669]">
                            {m.type}
                          </span>
                        </div>
                        <div className="text-[#47544d]">
                          {m.note || "Tanpa catatan"} ·{" "}
                          <span className="font-mono">{m.date}</span>
                        </div>
                      </div>
                      <span
                        className={`font-mono font-semibold num-tabular ${
                          m.type === "setor" ? "text-[#059669]" : "text-[#0b110e]"
                        }`}
                      >
                        {m.type === "setor" ? "+" : "-"}
                        {formatRupiah(m.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW 6: WISHLIST (LINK FETCH + PHOTO UPLOAD/PREVIEW) */}
        {activeTab === "wishlist" && (
          <div className="space-y-6">
            <div className="rounded-sm border border-[#0b110e]/10 bg-white p-5 space-y-4">
              <h2 className="font-display text-xl text-[#0b110e]">
                Tambah Item Wishlist
              </h2>

              {/* Fetch from Link */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Link2 className="h-3.5 w-3.5 text-[#47544d] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="url"
                    placeholder="Tempel link produk (Shopee, Tokopedia, dll)..."
                    value={wishLink}
                    onChange={(e) => setWishLink(e.target.value)}
                    className="w-full rounded-sm border border-[#0b110e]/15 bg-[#f7f8f7] pl-9 pr-3 py-2 text-xs focus:border-[#10b981] focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleFetchWishlistLink}
                  disabled={fetchingLink}
                  className="rounded-sm bg-[#0b110e] hover:bg-[#10b981] hover:text-[#070a09] disabled:opacity-60 text-white px-4 py-2 text-xs font-semibold transition-colors cursor-pointer"
                >
                  {fetchingLink ? "Mengambil..." : "Ambil Data dari Link"}
                </button>
              </div>

              <form onSubmit={handleCreateWishlist} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <input
                  type="text"
                  required
                  placeholder="Nama barang"
                  value={wishName}
                  onChange={(e) => setWishName(e.target.value)}
                  className="sm:col-span-4 rounded-sm border border-[#0b110e]/15 bg-[#f7f8f7] px-3 py-2 text-xs focus:border-[#10b981] focus:outline-none"
                />
                <input
                  type="number"
                  required
                  min={1}
                  placeholder="Harga (Rp)"
                  value={wishPrice}
                  onChange={(e) => {
                    setWishPrice(e.target.value);
                    setWishPriceSource("manual");
                  }}
                  className="sm:col-span-3 rounded-sm border border-[#0b110e]/15 bg-[#f7f8f7] px-3 py-2 text-xs focus:border-[#10b981] focus:outline-none"
                />
                <select
                  value={wishPriority}
                  onChange={(e) =>
                    setWishPriority(
                      e.target.value as "rendah" | "sedang" | "tinggi"
                    )
                  }
                  className="sm:col-span-2 rounded-sm border border-[#0b110e]/15 bg-[#f7f8f7] px-3 py-2 text-xs focus:border-[#10b981] focus:outline-none"
                >
                  <option value="tinggi">Prioritas Tinggi</option>
                  <option value="sedang">Prioritas Sedang</option>
                  <option value="rendah">Prioritas Rendah</option>
                </select>
                <input
                  type="text"
                  placeholder="Catatan (opsional)"
                  value={wishNote}
                  onChange={(e) => setWishNote(e.target.value)}
                  className="sm:col-span-3 rounded-sm border border-[#0b110e]/15 bg-[#f7f8f7] px-3 py-2 text-xs focus:border-[#10b981] focus:outline-none"
                />

                {/* Photo URL or Upload */}
                <div className="sm:col-span-6 flex items-center gap-2">
                  <input
                    type="url"
                    placeholder="URL foto produk (otomatis dari link atau tempel manual)"
                    value={wishImageURL}
                    onChange={(e) => {
                      setWishImageURL(e.target.value);
                      setWishPreviewURL(e.target.value);
                      setWishImageID("");
                    }}
                    className="flex-1 rounded-sm border border-[#0b110e]/15 bg-[#f7f8f7] px-3 py-2 text-xs focus:border-[#10b981] focus:outline-none"
                  />
                  <label className="inline-flex items-center gap-1.5 rounded-sm border border-[#0b110e]/15 bg-[#eef1ef] px-3 py-2 text-xs font-medium text-[#0b110e] hover:bg-[#10b981]/20 cursor-pointer shrink-0">
                    <ImagePlus className="h-3.5 w-3.5" />
                    <span>{uploadingImage ? "Mengunggah..." : "Upload Foto"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleUploadWishlistFile}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="sm:col-span-3 flex items-center">
                  {wishPreviewURL && (
                    <img
                      src={wishPreviewURL}
                      alt="Preview produk"
                      className="h-10 w-10 rounded-sm object-cover border border-[#0b110e]/15"
                    />
                  )}
                </div>

                <button
                  type="submit"
                  className="sm:col-span-3 rounded-sm bg-[#10b981] hover:bg-[#34d399] text-[#070a09] py-2 px-4 text-xs font-semibold cursor-pointer"
                >
                  + Simpan Wishlist
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
                    className="rounded-sm border border-[#0b110e]/10 bg-white overflow-hidden flex flex-col justify-between"
                  >
                    {item.foto_url ? (
                      <div className="aspect-[16/10] w-full bg-[#eef1ef] overflow-hidden border-b border-[#0b110e]/10">
                        <img
                          src={item.foto_url}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="aspect-[16/10] w-full bg-[#eef1ef] flex items-center justify-center border-b border-[#0b110e]/10 text-[#47544d]/40">
                        <ShoppingBag className="h-8 w-8" />
                      </div>
                    )}

                    <div className="p-5 flex-1 flex flex-col justify-between gap-4">
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
                        {item.note && (
                          <p className="mt-1 text-xs text-[#47544d]">{item.note}</p>
                        )}
                        {item.link && (
                          <a
                            href={item.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[#059669] hover:underline"
                          >
                            <span>{item.situs || "Buka Link Produk"}</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
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
