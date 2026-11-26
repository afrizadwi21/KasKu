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
  PiggyBank,
  Plus,
  Search,
  ShoppingBag,
  Trash2,
  Wallet,
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

  const [isDark, setIsDark] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [profileName, setProfileName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [analyticsYear, setAnalyticsYear] = useState<string>("2026");
  const [wishPreviewBroken, setWishPreviewBroken] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "masuk" | "keluar">("all");
  const [txMonthFilter, setTxMonthFilter] = useState<string>("all");
  const [savingsFilter, setSavingsFilter] = useState<"all" | "umum" | "wishlist">("all");
  const [wishSearch, setWishSearch] = useState("");
  const [wishPriorityFilter, setWishPriorityFilter] = useState<"all" | "tinggi" | "sedang" | "rendah">("all");
  const [wishStatusFilter, setWishStatusFilter] = useState<"all" | "aktif" | "dibeli">("all");
  const [wishSavingPotChoice, setWishSavingPotChoice] = useState<string>("");
  const [wishDepositAmounts, setWishDepositAmounts] = useState<Record<string, string>>({});
  const [brokenWishlistImgs, setBrokenWishlistImgs] = useState<Record<string, boolean>>({});

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

  // Debt view filter & payment states
  const [debtDirection, setDebtDirection] = useState<"piutang" | "hutang">("piutang");
  const [debtStatusFilter, setDebtStatusFilter] = useState<"aktif" | "lunas">("aktif");
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

  // Wishlist form states
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

  const loadAllData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
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
      setProfileName(meData?.name || "");
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
    const savedTheme = localStorage.getItem("kasku_theme");
    const initialDark = savedTheme === "dark";
    setIsDark(initialDark);
    document.documentElement.classList.toggle("dark", initialDark);
    const token = getStoredAccessToken();
    if (!token) {
      clearAuthSession();
      router.replace("/login");
      return;
    }
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    setAnalyticsYear(String(now.getFullYear()));
    setSubFirstDue(todayStr);
    setBillDueDate(todayStr);
    loadAllData();
  }, [router, loadAllData]);

  // Real-time background sync every 5 seconds + on window focus/tab visible
  useEffect(() => {
    const syncNow = () => {
      if (document.visibilityState === "visible" && getStoredAccessToken()) {
        loadAllData(true);
      }
    };
    const intervalId = setInterval(syncNow, 5000);
    window.addEventListener("focus", syncNow);
    document.addEventListener("visibilitychange", syncNow);
    return () => {
      clearInterval(intervalId);
      window.removeEventListener("focus", syncNow);
      document.removeEventListener("visibilitychange", syncNow);
    };
  }, [loadAllData]);

  const handleToggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev;
      localStorage.setItem("kasku_theme", next ? "dark" : "light");
      document.documentElement.classList.toggle("dark", next);
      return next;
    });
  };

  const handleUpdateProfileName = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = profileName.trim();
    if (!trimmed) return;
    setSavingProfile(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const res = await apiFetch<{ message?: string; user?: UserProfile; name?: string }>("/api/me", {
        method: "PUT",
        body: JSON.stringify({ name: trimmed }),
      });
      const newName = res.user?.name || res.name || trimmed;
      setUser((prev) => {
        const nextUser = prev ? { ...prev, name: newName } : { id: "", name: newName, email: "" };
        localStorage.setItem("kasku_user", JSON.stringify(nextUser));
        return nextUser;
      });
      setProfileName(newName);
      setSuccessMsg("Profil berhasil diperbarui.");
      await loadAllData(true);
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : "Gagal memperbarui profil."
      );
    } finally {
      setSavingProfile(false);
    }
  };

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
      let linkedPotId: string | undefined = undefined;

      if (wishSavingPotChoice === "auto") {
        const createdPot = await apiFetch<{ id?: string; pos?: { id: string } }>("/api/savings", {
          method: "POST",
          body: JSON.stringify({
            name: `Wishlist: ${wishName.trim()}`,
            target_amount: Number(wishPrice),
            note: `Tabungan khusus wishlist ${wishName.trim()}`,
          }),
        });
        linkedPotId = createdPot.id || createdPot.pos?.id;
      } else if (wishSavingPotChoice) {
        linkedPotId = wishSavingPotChoice;
      }

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
          saving_pot_id: linkedPotId,
        }),
      });
      setWishLink("");
      setWishName("");
      setWishPrice("");
      setWishImageURL("");
      setWishImageID("");
      setWishPreviewURL("");
      setWishNote("");
      setWishSavingPotChoice("");
      setWishPriceSource("manual");
      setSuccessMsg("Item wishlist berhasil disimpan.");
      await loadAllData();
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : "Gagal menambah wishlist."
      );
    }
  };

  const handleDepositWishlistPot = async (potId: string, itemId: string, itemName: string) => {
    const amount = Number(wishDepositAmounts[itemId] || 0);
    if (amount <= 0) {
      setErrorMsg("Masukkan nominal setoran tabungan wishlist lebih dari 0.");
      return;
    }
    try {
      setErrorMsg("");
      setSuccessMsg("");
      await apiFetch(`/api/savings/${potId}/deposit`, {
        method: "POST",
        body: JSON.stringify({
          amount,
          date: new Date().toISOString().split("T")[0],
          note: `Setor tabungan wishlist: ${itemName}`,
        }),
      });
      setWishDepositAmounts((prev) => ({ ...prev, [itemId]: "" }));
      setSuccessMsg(`Setoran tabungan wishlist ${itemName} berhasil dicatat.`);
      await loadAllData();
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : "Gagal menyetor ke tabungan wishlist."
      );
    }
  };

  const handleBuyWishlist = async (id: string, source: "bebas" | "pos" = "bebas") => {
    try {
      setErrorMsg("");
      setSuccessMsg("");
      await apiFetch(`/api/wishlist/${id}/buy`, {
        method: "POST",
        body: JSON.stringify({ source }),
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

  const txMonths = Array.from(
    new Set(transactions.map((t) => (t.date || "").slice(0, 7)).filter((m) => m.length === 7))
  ).sort((a, b) => b.localeCompare(a));

  const formatMonthLabel = (ym: string) => {
    const [yr, mo] = ym.split("-");
    const names = [
      "Januari", "Februari", "Maret", "April", "Mei", "Juni",
      "Juli", "Agustus", "September", "Oktober", "November", "Desember",
    ];
    const idx = Number(mo) - 1;
    return idx >= 0 && idx < 12 ? `${names[idx]} ${yr}` : ym;
  };

  const filteredTransactions = transactions.filter((t) => {
    const matchesType = typeFilter === "all" || t.type === typeFilter;
    const matchesMonth =
      txMonthFilter === "all" || (t.date || "").startsWith(txMonthFilter);
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      t.category.toLowerCase().includes(q) ||
      t.party.toLowerCase().includes(q) ||
      t.source.toLowerCase().includes(q) ||
      t.note.toLowerCase().includes(q);
    return matchesType && matchesMonth && matchesSearch;
  });

  const groupedTransactions = filteredTransactions.reduce<Record<string, Transaction[]>>(
    (acc, t) => {
      const key = (t.date || "").slice(0, 7) || "Lainnya";
      if (!acc[key]) acc[key] = [];
      acc[key].push(t);
      return acc;
    },
    {}
  );

  const wishlistPotIds = new Set(
    wishlistItems
      .map((w) => w.saving_pot_id)
      .filter((id): id is string => Boolean(id))
  );
  const isWishlistPot = (pot: SavingsPot) =>
    wishlistPotIds.has(pot.id) || pot.name.toLowerCase().startsWith("wishlist:");

  const filteredSavingsPots = savingsPots.filter((pot) => {
    if (savingsFilter === "wishlist") return isWishlistPot(pot);
    if (savingsFilter === "umum") return !isWishlistPot(pot);
    return true;
  });

  const filteredWishlistItems = wishlistItems.filter((item) => {
    const matchesPriority =
      wishPriorityFilter === "all" || item.priority === wishPriorityFilter;
    const matchesStatus =
      wishStatusFilter === "all" || item.status === wishStatusFilter;
    const q = wishSearch.toLowerCase();
    const matchesSearch =
      !q ||
      item.name.toLowerCase().includes(q) ||
      (item.note || "").toLowerCase().includes(q) ||
      (item.situs || "").toLowerCase().includes(q);
    return matchesPriority && matchesStatus && matchesSearch;
  });

  const activeDebtsSource =
    debtDirection === "piutang" ? piutangList : hutangSayaList;
  const filteredDebts = activeDebtsSource.filter((d) =>
    debtStatusFilter === "aktif" ? d.sisa > 0 : d.sisa <= 0
  );

  const inputClass = isDark
    ? "rounded-lg border border-[#f4f7f5]/15 bg-[#070a09] px-3 py-2 text-xs text-[#f4f7f5] placeholder:text-[#a3b8ad]/50 focus:border-[#10b981] focus:outline-none"
    : "rounded-lg border border-[#0b110e]/15 bg-[#f7f8f7] px-3 py-2 text-xs text-[#0b110e] placeholder:text-[#47544d]/70 focus:border-[#10b981] focus:outline-none";
  const cardClass = isDark
    ? "rounded-xl border border-[#f4f7f5]/10 bg-[#0e1412] text-[#f4f7f5]"
    : "rounded-xl border border-[#0b110e]/10 bg-white text-[#0b110e]";

  return (
    <div className={isDark ? "dark" : ""}>
      <div
        className={`min-h-screen flex flex-col lg:flex-row transition-colors ${
          isDark ? "bg-[#070a09] text-[#f4f7f5]" : "bg-[#f7f8f7] text-[#0b110e]"
        }`}
      >
        <Header
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenModal={() => setIsModalOpen(true)}
          onLogout={handleLogout}
          userName={user.name}
          userEmail={user.email}
          isDark={isDark}
          onToggleTheme={handleToggleTheme}
        />

        <main className="flex-1 min-w-0 px-4 py-6 sm:px-8 max-w-6xl w-full mx-auto">
          {errorMsg && (
            <div className="mb-5 flex items-center justify-between rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-xs text-red-800 dark:border-red-500/30 dark:bg-red-950/40 dark:text-red-200">
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
            <div className="mb-5 flex items-center justify-between rounded-lg border border-[#10b981]/40 bg-[#ecfdf5] px-4 py-3 text-xs text-[#059669] dark:bg-[#10b981]/15 dark:text-[#34d399]">
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
                  <h1 className="font-display text-2xl sm:text-3xl tracking-tight">
                    Ringkasan Keuangan
                  </h1>
                  <p className="text-xs text-[#47544d] dark:text-[#a3b8ad]">
                    Data real dari akun {user.email}
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-[#10b981]/30 bg-[#10b981]/10 px-3 py-1 text-[11px] font-mono text-[#059669]">
                  <span className="h-2 w-2 rounded-full bg-[#10b981] animate-pulse" />
                  <span>Sinkronisasi Real-time</span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard
                  title="Saldo Tersedia"
                  value={overview.saldo}
                  subtitle={`Kekayaan Bersih: ${formatRupiah(overview.kekayaan_bersih)}`}
                  badgeText="Kas Aktif"
                  badgeVariant="income"
                  isDark={isDark}
                />
                <MetricCard
                  title="Masuk Hari Ini"
                  value={todayData.masuk_hari_ini}
                  subtitle={`${todayData.pemasukan_per_sumber_hari_ini.length} sumber pemasukan`}
                  badgeText="Hari Ini"
                  badgeVariant="income"
                  isDark={isDark}
                />
                <MetricCard
                  title="Keluar Hari Ini"
                  value={todayData.keluar_hari_ini}
                  subtitle={`Selisih: ${todayData.selisih_hari_ini >= 0 ? "+" : ""}${formatRupiah(todayData.selisih_hari_ini)}`}
                  badgeText="Hari Ini"
                  badgeVariant="expense"
                  isDark={isDark}
                />
                <MetricCard
                  title="Piutang Berjalan"
                  value={overview.piutang_total}
                  subtitle={`${piutangList.filter((d) => d.sisa > 0).length} orang belum lunas`}
                  badgeText={overview.piutang_total > 0 ? "Aktif" : "Kosong"}
                  badgeVariant="neutral"
                  isDark={isDark}
                />
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className={`lg:col-span-2 p-5 ${cardClass}`}>
                  <div className="flex items-center justify-between border-b border-[#0b110e]/10 dark:border-[#f4f7f5]/10 pb-3">
                    <div>
                      <h2 className="text-sm font-semibold">Mutasi Transaksi Terbaru</h2>
                      <p className="text-xs text-[#47544d] dark:text-[#a3b8ad]">
                        Total {transactions.length} transaksi tercatat
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab("transactions")}
                      className="text-xs font-medium text-[#059669] dark:text-[#34d399] hover:underline cursor-pointer"
                    >
                      Lihat Semua
                    </button>
                  </div>

                  {transactions.length === 0 ? (
                    <div className="py-12 text-center space-y-3">
                      <Wallet className="h-8 w-8 mx-auto text-[#47544d]/40 dark:text-[#a3b8ad]/40" />
                      <p className="text-sm text-[#47544d] dark:text-[#a3b8ad]">
                        Belum ada transaksi tercatat.
                      </p>
                      <button
                        type="button"
                        onClick={() => setIsModalOpen(true)}
                        className="inline-flex items-center gap-1.5 rounded-full bg-[#10b981] px-4 py-2 text-xs font-semibold text-[#070a09] hover:bg-[#34d399] cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Catat Transaksi Pertama</span>
                      </button>
                    </div>
                  ) : (
                    <div className="mt-3 divide-y divide-[#0b110e]/10 dark:divide-[#f4f7f5]/10">
                      {transactions.slice(0, 6).map((t) => (
                        <div
                          key={t.id}
                          className="flex items-center justify-between py-3 text-sm"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                                t.type === "masuk"
                                  ? "bg-[#ecfdf5] text-[#059669] dark:bg-[#10b981]/15 dark:text-[#34d399]"
                                  : "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400"
                              }`}
                            >
                              {t.type === "masuk" ? (
                                <ArrowDownRight className="h-4 w-4" />
                              ) : (
                                <ArrowUpRight className="h-4 w-4" />
                              )}
                            </div>
                            <div>
                              <div className="font-medium">
                                {t.category}
                                {t.party && (
                                  <span className="text-[#47544d] dark:text-[#a3b8ad]">
                                    {" "}
                                    — {t.party}
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-[#47544d] dark:text-[#a3b8ad]">
                                {t.note || t.source || "Tanpa catatan"} · {t.date}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div
                              className={`font-semibold font-mono num-tabular ${
                                t.type === "masuk"
                                  ? "text-[#059669] dark:text-[#34d399]"
                                  : ""
                              }`}
                            >
                              {t.type === "masuk" ? "+" : "-"}
                              {formatRupiah(t.amount)}
                            </div>
                            <div className="text-[11px] font-mono text-[#47544d] dark:text-[#a3b8ad] num-tabular">
                              Saldo: {formatRupiah(t.saldo_setelah)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-6">
                  <div className={`p-5 ${cardClass}`}>
                    <div className="flex items-center justify-between border-b border-[#0b110e]/10 dark:border-[#f4f7f5]/10 pb-3">
                      <h2 className="text-sm font-semibold">Piutang Aktif</h2>
                      <button
                        type="button"
                        onClick={() => setActiveTab("debts")}
                        className="text-xs font-medium text-[#059669] dark:text-[#34d399] hover:underline cursor-pointer"
                      >
                        Detail
                      </button>
                    </div>
                    {piutangList.filter((d) => d.sisa > 0).length === 0 ? (
                      <p className="py-6 text-center text-xs text-[#47544d] dark:text-[#a3b8ad]">
                        Tidak ada piutang berjalan.
                      </p>
                    ) : (
                      <div className="mt-3 space-y-3">
                        {piutangList
                          .filter((d) => d.sisa > 0)
                          .map((d) => (
                            <div
                              key={d.nama}
                              className="rounded-lg border border-[#0b110e]/10 bg-[#f7f8f7] dark:border-[#f4f7f5]/10 dark:bg-[#070a09] p-3"
                            >
                              <div className="flex items-center justify-between text-xs font-medium">
                                <span>{d.nama}</span>
                                <span className="font-mono font-semibold text-[#059669] dark:text-[#34d399] num-tabular">
                                  Sisa {formatRupiah(d.sisa)}
                                </span>
                              </div>
                              <div className="mt-2 h-1.5 w-full rounded-full bg-[#0b110e]/10 dark:bg-[#f4f7f5]/10 overflow-hidden">
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

                  <div className={`p-5 ${cardClass}`}>
                    <div className="flex items-center justify-between border-b border-[#0b110e]/10 dark:border-[#f4f7f5]/10 pb-3">
                      <h2 className="text-sm font-semibold">Belum Dibayar</h2>
                      <span className="font-mono text-xs text-[#47544d] dark:text-[#a3b8ad] num-tabular">
                        {unpaidList.length} item
                      </span>
                    </div>
                    {unpaidList.length === 0 ? (
                      <p className="py-6 text-center text-xs text-[#47544d] dark:text-[#a3b8ad]">
                        Semua tagihan & langganan aman.
                      </p>
                    ) : (
                      <div className="mt-3 space-y-2.5">
                        {unpaidList.slice(0, 5).map((item, idx) => (
                          <div
                            key={`${item.jenis}-${item.nama}-${idx}`}
                            className="flex items-center justify-between text-xs py-1.5 border-b border-[#0b110e]/5 dark:border-[#f4f7f5]/5 last:border-0"
                          >
                            <div>
                              <div className="font-medium">{item.nama}</div>
                              <div className="text-[11px] text-[#47544d] dark:text-[#a3b8ad]">
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
            <div className={`p-5 space-y-4 ${cardClass}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#0b110e]/10 dark:border-[#f4f7f5]/10 pb-4">
                <div>
                  <h1 className="font-display text-2xl">Riwayat Transaksi</h1>
                  <p className="text-xs text-[#47544d] dark:text-[#a3b8ad]">
                    Total {filteredTransactions.length} transaksi ditampilkan
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="h-3.5 w-3.5 text-[#47544d] dark:text-[#a3b8ad] absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Cari kategori, pihak, catatan..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className={`${inputClass} pl-8`}
                    />
                  </div>
                  <select
                    value={txMonthFilter}
                    onChange={(e) => setTxMonthFilter(e.target.value)}
                    className={inputClass}
                  >
                    <option value="all">Semua Bulan</option>
                    {txMonths.map((ym) => (
                      <option key={ym} value={ym}>
                        {formatMonthLabel(ym)}
                      </option>
                    ))}
                  </select>
                  <select
                    value={typeFilter}
                    onChange={(e) =>
                      setTypeFilter(e.target.value as "all" | "masuk" | "keluar")
                    }
                    className={inputClass}
                  >
                    <option value="all">Semua</option>
                    <option value="masuk">Masuk (+)</option>
                    <option value="keluar">Keluar (-)</option>
                  </select>
                </div>
              </div>

              {filteredTransactions.length === 0 ? (
                <p className="py-10 text-center text-sm text-[#47544d] dark:text-[#a3b8ad]">
                  Tidak ada transaksi yang cocok.
                </p>
              ) : (
                <div className="space-y-6">
                  {Object.entries(groupedTransactions)
                    .sort((a, b) => b[0].localeCompare(a[0]))
                    .map(([ym, monthTxs]) => {
                      const monthMasuk = monthTxs
                        .filter((x) => x.type === "masuk")
                        .reduce((s, x) => s + x.amount, 0);
                      const monthKeluar = monthTxs
                        .filter((x) => x.type === "keluar")
                        .reduce((s, x) => s + x.amount, 0);

                      return (
                        <div key={ym} className="space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#f7f8f7] dark:bg-[#070a09] px-3.5 py-2 border border-[#0b110e]/10 dark:border-[#f4f7f5]/10">
                            <span className="font-display text-sm tracking-tight">
                              {formatMonthLabel(ym)} ({monthTxs.length})
                            </span>
                            <div className="flex items-center gap-4 text-xs font-mono num-tabular">
                              <span className="text-[#059669] dark:text-[#34d399]">
                                +{formatRupiah(monthMasuk)}
                              </span>
                              <span className="text-red-500">
                                -{formatRupiah(monthKeluar)}
                              </span>
                            </div>
                          </div>

                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                              <thead>
                                <tr className="border-b border-[#0b110e]/10 dark:border-[#f4f7f5]/10 text-[#47544d] dark:text-[#a3b8ad]">
                                  <th className="py-2 font-medium">Tanggal</th>
                                  <th className="py-2 font-medium">Kategori</th>
                                  <th className="py-2 font-medium">Pihak / Sumber</th>
                                  <th className="py-2 font-medium">Catatan</th>
                                  <th className="py-2 font-medium text-right">Nominal</th>
                                  <th className="py-2 font-medium text-right">Saldo</th>
                                  <th className="py-2 font-medium text-right">Aksi</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#0b110e]/10 dark:divide-[#f4f7f5]/10">
                                {monthTxs.map((t) => (
                                  <tr key={t.id} className="hover:bg-[#f7f8f7] dark:hover:bg-[#070a09]/50">
                                    <td className="py-3 font-mono num-tabular">{t.date}</td>
                                    <td className="py-3 font-medium">{t.category}</td>
                                    <td className="py-3 text-[#47544d] dark:text-[#a3b8ad]">
                                      {t.party || t.source || "-"}
                                    </td>
                                    <td className="py-3 text-[#47544d] dark:text-[#a3b8ad]">
                                      {t.note || "-"}
                                    </td>
                                    <td
                                      className={`py-3 text-right font-mono font-semibold num-tabular ${
                                        t.type === "masuk"
                                          ? "text-[#059669] dark:text-[#34d399]"
                                          : ""
                                      }`}
                                    >
                                      {t.type === "masuk" ? "+" : "-"}
                                      {formatRupiah(t.amount)}
                                    </td>
                                    <td className="py-3 text-right font-mono num-tabular text-[#47544d] dark:text-[#a3b8ad]">
                                      {formatRupiah(t.saldo_setelah)}
                                    </td>
                                    <td className="py-3 text-right">
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteTransaction(t.id)}
                                        title="Hapus transaksi"
                                        className="p-1 text-[#47544d] hover:text-red-600 dark:text-[#a3b8ad] dark:hover:text-red-400 cursor-pointer"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}

          {/* VIEW 3: DEBTS (INSPIRED BY REFERENCE UI + PARTIAL PAY & NOTES) */}
          {activeTab === "debts" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h1 className="font-display text-2xl sm:text-3xl">
                  Utang Piutang
                </h1>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#10b981] hover:bg-[#34d399] px-4 py-2 text-xs font-semibold text-[#070a09] cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Tambah Catatan</span>
                </button>
              </div>

              {/* 2 Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-xl border border-[#10b981]/25 bg-[#ecfdf5] dark:bg-[#10b981]/10 p-5 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-medium text-[#059669] dark:text-[#34d399]">
                    <ArrowDownRight className="w-4 h-4" />
                    <span>Total Piutang Aktif</span>
                  </div>
                  <div className="font-mono text-2xl font-bold text-[#059669] dark:text-[#34d399] num-tabular">
                    {formatRupiah(overview.piutang_total)}
                  </div>
                  <p className="text-xs text-[#47544d] dark:text-[#a3b8ad]">
                    Uang yang dipinjamkan ke orang lain
                  </p>
                </div>

                <div className="rounded-xl border border-red-200 bg-red-50 dark:border-red-500/20 dark:bg-red-950/25 p-5 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-medium text-red-600 dark:text-red-400">
                    <ArrowUpRight className="w-4 h-4" />
                    <span>Total Utang Aktif</span>
                  </div>
                  <div className="font-mono text-2xl font-bold text-red-600 dark:text-red-400 num-tabular">
                    {formatRupiah(overview.hutang_saya_total)}
                  </div>
                  <p className="text-xs text-[#47544d] dark:text-[#a3b8ad]">
                    Uang yang dipinjam dari orang lain
                  </p>
                </div>
              </div>

              {/* Status Filter Pills */}
              <div className="inline-flex rounded-lg border border-[#0b110e]/10 bg-white dark:border-[#f4f7f5]/10 dark:bg-[#0e1412] p-1 gap-1">
                <button
                  type="button"
                  onClick={() => setDebtStatusFilter("aktif")}
                  className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                    debtStatusFilter === "aktif"
                      ? "bg-[#10b981] text-[#070a09]"
                      : "text-[#47544d] dark:text-[#a3b8ad]"
                  }`}
                >
                  Aktif
                </button>
                <button
                  type="button"
                  onClick={() => setDebtStatusFilter("lunas")}
                  className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                    debtStatusFilter === "lunas"
                      ? "bg-[#10b981] text-[#070a09]"
                      : "text-[#47544d] dark:text-[#a3b8ad]"
                  }`}
                >
                  Lunas
                </button>
              </div>

              {/* Segmented Direction Switcher */}
              <div className="grid grid-cols-2 rounded-xl border border-[#0b110e]/10 bg-white dark:border-[#f4f7f5]/10 dark:bg-[#0e1412] p-1 gap-1">
                <button
                  type="button"
                  onClick={() => setDebtDirection("piutang")}
                  className={`rounded-lg py-2.5 px-3 text-xs font-semibold transition-colors cursor-pointer ${
                    debtDirection === "piutang"
                      ? "bg-[#10b981] text-[#070a09]"
                      : "text-[#47544d] dark:text-[#a3b8ad]"
                  }`}
                >
                  Saya Meminjamkan (Piutang)
                </button>
                <button
                  type="button"
                  onClick={() => setDebtDirection("hutang")}
                  className={`rounded-lg py-2.5 px-3 text-xs font-semibold transition-colors cursor-pointer ${
                    debtDirection === "hutang"
                      ? "bg-[#10b981] text-[#070a09]"
                      : "text-[#47544d] dark:text-[#a3b8ad]"
                  }`}
                >
                  Saya Meminjam (Utang)
                </button>
              </div>

              {/* Filtered Debts List */}
              {filteredDebts.length === 0 ? (
                <div className={`py-14 text-center ${cardClass}`}>
                  <Wallet className="h-8 w-8 mx-auto text-[#47544d]/40 dark:text-[#a3b8ad]/40 mb-2" />
                  <p className="text-xs text-[#47544d] dark:text-[#a3b8ad]">
                    Tidak ada data untuk filter ini.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredDebts.map((d) => {
                    const isPaying =
                      activeDebtPay?.kind === debtDirection &&
                      activeDebtPay?.nama === d.nama;
                    const history = expandedDebtHistory[d.nama];

                    return (
                      <div key={d.nama} className={`p-5 space-y-3 ${cardClass}`}>
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-sm">{d.nama}</span>
                          <span className="rounded-full bg-[#ecfdf5] dark:bg-[#10b981]/15 px-2.5 py-0.5 text-[11px] font-semibold text-[#059669] dark:text-[#34d399]">
                            {d.status}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs text-[#47544d] dark:text-[#a3b8ad] font-mono num-tabular">
                          <span>Total: {formatRupiah(d.total)}</span>
                          <span>Dibayar: {formatRupiah(d.dibayar)}</span>
                          <span className="font-semibold text-[#0b110e] dark:text-[#f4f7f5]">
                            Sisa: {formatRupiah(d.sisa)}
                          </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-[#eef1ef] dark:bg-[#f4f7f5]/10 overflow-hidden">
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
                                  isPaying ? null : { kind: debtDirection, nama: d.nama }
                                );
                                setDebtPayAmount(String(d.sisa));
                                setDebtPayNote("");
                              }}
                              className="rounded-lg bg-[#10b981] px-3 py-1.5 text-xs font-semibold text-[#070a09] hover:bg-[#34d399] cursor-pointer"
                            >
                              {isPaying ? "Batal" : "Update / Cicil Bayar"}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleToggleDebtHistory(d.nama)}
                            className="rounded-lg border border-[#0b110e]/15 dark:border-[#f4f7f5]/15 px-3 py-1.5 text-xs font-medium hover:bg-[#eef1ef] dark:hover:bg-[#121c18] cursor-pointer"
                          >
                            {history ? "Tutup Catatan" : "Lihat Catatan"}
                          </button>
                        </div>

                        {isPaying && (
                          <form
                            onSubmit={handleSubmitDebtPayment}
                            className="rounded-lg border border-[#10b981]/30 bg-[#f7f8f7] dark:bg-[#070a09] p-3 space-y-2.5"
                          >
                            <div className="text-xs font-semibold">
                              Catat Pembayaran ({d.nama})
                            </div>
                            <input
                              type="number"
                              required
                              min={1}
                              max={d.sisa}
                              placeholder="Nominal dibayar (Rp)"
                              value={debtPayAmount}
                              onChange={(e) => setDebtPayAmount(e.target.value)}
                              className={`w-full ${inputClass}`}
                            />
                            <input
                              type="text"
                              placeholder="Catatan (mis. Baru dibayar Rp 10.000, sisa menyusul)"
                              value={debtPayNote}
                              onChange={(e) => setDebtPayNote(e.target.value)}
                              className={`w-full ${inputClass}`}
                            />
                            <button
                              type="submit"
                              className="w-full rounded-lg bg-[#059669] hover:bg-[#10b981] text-white py-1.5 text-xs font-semibold cursor-pointer"
                            >
                              Simpan Pembayaran
                            </button>
                          </form>
                        )}

                        {history && (
                          <div className="rounded-lg border border-[#0b110e]/10 dark:border-[#f4f7f5]/10 bg-[#f7f8f7] dark:bg-[#070a09] p-3 space-y-2">
                            <div className="text-[11px] font-semibold uppercase tracking-wider text-[#47544d] dark:text-[#a3b8ad]">
                              Riwayat & Catatan ({history.length})
                            </div>
                            {history.length === 0 ? (
                              <p className="text-xs text-[#47544d] dark:text-[#a3b8ad]">
                                Belum ada riwayat transaksi.
                              </p>
                            ) : (
                              <div className="space-y-1.5">
                                {history.map((h) => (
                                  <div
                                    key={h.id}
                                    className="flex items-start justify-between gap-2 text-xs border-b border-[#0b110e]/10 dark:border-[#f4f7f5]/10 pb-1.5 last:border-0 last:pb-0"
                                  >
                                    <div>
                                      <div className="font-medium">
                                        {h.category} ·{" "}
                                        <span className="font-mono text-[#47544d] dark:text-[#a3b8ad]">
                                          {h.date}
                                        </span>
                                      </div>
                                      <div className="text-[11px] text-[#47544d] dark:text-[#a3b8ad]">
                                        {h.note || "Tanpa catatan"}
                                      </div>
                                    </div>
                                    <span
                                      className={`font-mono font-semibold num-tabular ${
                                        h.type === "masuk"
                                          ? "text-[#059669] dark:text-[#34d399]"
                                          : ""
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
          )}

          {/* VIEW 4: SUBSCRIPTIONS & BILLS */}
          {activeTab === "subscriptions" && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className={`p-5 space-y-5 ${cardClass}`}>
                <h2 className="font-display text-xl">Langganan Rutin</h2>

                <form onSubmit={handleCreateSubscription} className="grid grid-cols-2 gap-2.5">
                  <input
                    type="text"
                    required
                    placeholder="Nama langganan (mis. Internet)"
                    value={subName}
                    onChange={(e) => setSubName(e.target.value)}
                    className={`col-span-2 sm:col-span-1 ${inputClass}`}
                  />
                  <input
                    type="number"
                    required
                    min={1}
                    placeholder="Nominal (Rp)"
                    value={subAmount}
                    onChange={(e) => setSubAmount(e.target.value)}
                    className={`col-span-2 sm:col-span-1 ${inputClass}`}
                  />
                  <select
                    value={subCycle}
                    onChange={(e) =>
                      setSubCycle(
                        e.target.value as "mingguan" | "bulanan" | "3_bulanan" | "tahunan"
                      )
                    }
                    className={inputClass}
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
                    className={inputClass}
                  />
                  <button
                    type="submit"
                    className="col-span-2 rounded-lg bg-[#0b110e] hover:bg-[#10b981] hover:text-[#070a09] text-white dark:bg-[#10b981] dark:text-[#070a09] dark:hover:bg-[#34d399] py-2 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    + Tambah Langganan
                  </button>
                </form>

                {subscriptions.length === 0 ? (
                  <p className="py-6 text-center text-xs text-[#47544d] dark:text-[#a3b8ad]">
                    Belum ada langganan terdaftar.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {subscriptions.map((sub) => (
                      <div
                        key={sub.id}
                        className="flex items-center justify-between rounded-lg border border-[#0b110e]/10 dark:border-[#f4f7f5]/10 p-3.5"
                      >
                        <div>
                          <div className="text-sm font-semibold">{sub.name}</div>
                          <div className="text-xs text-[#47544d] dark:text-[#a3b8ad] flex items-center gap-2 mt-0.5">
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
                            className="rounded-lg bg-[#10b981] px-3 py-1.5 text-xs font-semibold text-[#070a09] hover:bg-[#34d399] cursor-pointer"
                          >
                            Bayar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className={`p-5 space-y-5 ${cardClass}`}>
                <h2 className="font-display text-xl">Tagihan Sekali Bayar</h2>

                <form onSubmit={handleCreateBill} className="grid grid-cols-2 gap-2.5">
                  <input
                    type="text"
                    required
                    placeholder="Nama tagihan"
                    value={billTitle}
                    onChange={(e) => setBillTitle(e.target.value)}
                    className={`col-span-2 ${inputClass}`}
                  />
                  <input
                    type="number"
                    required
                    min={1}
                    placeholder="Nominal (Rp)"
                    value={billAmount}
                    onChange={(e) => setBillAmount(e.target.value)}
                    className={inputClass}
                  />
                  <input
                    type="date"
                    required
                    value={billDueDate}
                    onChange={(e) => setBillDueDate(e.target.value)}
                    className={inputClass}
                  />
                  <button
                    type="submit"
                    className="col-span-2 rounded-lg bg-[#0b110e] hover:bg-[#10b981] hover:text-[#070a09] text-white dark:bg-[#10b981] dark:text-[#070a09] dark:hover:bg-[#34d399] py-2 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    + Tambah Tagihan
                  </button>
                </form>

                {bills.length === 0 ? (
                  <p className="py-6 text-center text-xs text-[#47544d] dark:text-[#a3b8ad]">
                    Belum ada tagihan terdaftar.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {bills.map((bill) => (
                      <div
                        key={bill.id}
                        className="flex items-center justify-between rounded-lg border border-[#0b110e]/10 dark:border-[#f4f7f5]/10 p-3.5"
                      >
                        <div>
                          <div className="text-sm font-semibold">{bill.title}</div>
                          <div className="text-xs text-[#47544d] dark:text-[#a3b8ad]">
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
                              className="rounded-lg bg-[#10b981] px-3 py-1.5 text-xs font-semibold text-[#070a09] hover:bg-[#34d399] cursor-pointer"
                            >
                              Bayar
                            </button>
                          ) : (
                            <CheckCircle2 className="h-4 w-4 text-[#059669] dark:text-[#34d399]" />
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
              <div className={`p-5 ${cardClass}`}>
                <h2 className="font-display text-xl mb-4">Buat Pos Tabungan Baru</h2>
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
                    className={inputClass}
                  />
                  <input
                    type="number"
                    required
                    min={1}
                    placeholder="Target nominal (Rp)"
                    value={potTarget}
                    onChange={(e) => setPotTarget(e.target.value)}
                    className={inputClass}
                  />
                  <input
                    type="text"
                    placeholder="Catatan pos (opsional)"
                    value={potNote}
                    onChange={(e) => setPotNote(e.target.value)}
                    className={inputClass}
                  />
                  <button
                    type="submit"
                    className="rounded-lg bg-[#10b981] hover:bg-[#34d399] text-[#070a09] py-2 px-4 text-xs font-semibold cursor-pointer"
                  >
                    + Buat Pos Tabungan
                  </button>
                </form>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="inline-flex rounded-lg border border-[#0b110e]/10 bg-white dark:border-[#f4f7f5]/10 dark:bg-[#0e1412] p-1 gap-1">
                  <button
                    type="button"
                    onClick={() => setSavingsFilter("all")}
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold cursor-pointer ${
                      savingsFilter === "all"
                        ? "bg-[#10b981] text-[#070a09]"
                        : "text-[#47544d] dark:text-[#a3b8ad]"
                    }`}
                  >
                    Semua Pos
                  </button>
                  <button
                    type="button"
                    onClick={() => setSavingsFilter("umum")}
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold cursor-pointer ${
                      savingsFilter === "umum"
                        ? "bg-[#10b981] text-[#070a09]"
                        : "text-[#47544d] dark:text-[#a3b8ad]"
                    }`}
                  >
                    Tabungan Umum
                  </button>
                  <button
                    type="button"
                    onClick={() => setSavingsFilter("wishlist")}
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold cursor-pointer ${
                      savingsFilter === "wishlist"
                        ? "bg-[#10b981] text-[#070a09]"
                        : "text-[#47544d] dark:text-[#a3b8ad]"
                    }`}
                  >
                    Tabungan Wishlist
                  </button>
                </div>
              </div>

              {filteredSavingsPots.length === 0 ? (
                <div className={`py-12 text-center ${cardClass}`}>
                  <PiggyBank className="h-8 w-8 mx-auto text-[#47544d]/40 dark:text-[#a3b8ad]/40 mb-2" />
                  <p className="text-sm text-[#47544d] dark:text-[#a3b8ad]">
                    Belum ada pos tabungan untuk filter ini.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredSavingsPots.map((pot) => {
                    const target = pot.target || 0;
                    const saldo = pot.saldo || 0;
                    const pct =
                      target > 0
                        ? Math.min(100, Math.round((saldo / target) * 100))
                        : 0;
                    const isWishPot = isWishlistPot(pot);
                    return (
                      <div key={pot.id} className={`p-5 space-y-4 ${cardClass}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-semibold text-base">{pot.name}</h3>
                            {pot.note && (
                              <p className="text-xs text-[#47544d] dark:text-[#a3b8ad] mt-0.5">
                                {pot.note}
                              </p>
                            )}
                            <p className="text-xs font-mono text-[#47544d] dark:text-[#a3b8ad] num-tabular mt-1">
                              {formatRupiah(saldo)}
                              {target > 0 ? ` / ${formatRupiah(target)} (${pct}%)` : ""}
                            </p>
                          </div>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                              isWishPot
                                ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                                : "bg-[#ecfdf5] text-[#059669] dark:bg-[#10b981]/15 dark:text-[#34d399]"
                            }`}
                          >
                            {isWishPot ? "Tabungan Wishlist" : "Tabungan Umum"}
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-[#eef1ef] dark:bg-[#f4f7f5]/10 overflow-hidden">
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
                              className={`flex-1 ${inputClass}`}
                            />
                            <button
                              type="button"
                              onClick={() => handleSavingsAction(pot.id, "deposit")}
                              className="rounded-lg bg-[#10b981] px-3 py-1.5 text-xs font-semibold text-[#070a09] hover:bg-[#34d399] cursor-pointer"
                            >
                              Setor
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSavingsAction(pot.id, "withdraw")}
                              className="rounded-lg border border-[#0b110e]/15 dark:border-[#f4f7f5]/15 px-3 py-1.5 text-xs font-medium hover:bg-[#eef1ef] dark:hover:bg-[#121c18] cursor-pointer"
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
                            className={`w-full ${inputClass}`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className={`p-5 space-y-3 ${cardClass}`}>
                <h3 className="font-display text-lg">
                  Catatan Mutasi Tabungan ({savingsMovements.length})
                </h3>
                {savingsMovements.length === 0 ? (
                  <p className="py-6 text-center text-xs text-[#47544d] dark:text-[#a3b8ad]">
                    Belum ada catatan setor atau tarik tabungan.
                  </p>
                ) : (
                  <div className="divide-y divide-[#0b110e]/10 dark:divide-[#f4f7f5]/10">
                    {savingsMovements.map((m) => (
                      <div
                        key={m.id}
                        className="py-2.5 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-semibold">
                            {m.pot_name} ·{" "}
                            <span className="uppercase font-mono text-[#059669] dark:text-[#34d399]">
                              {m.type}
                            </span>
                          </div>
                          <div className="text-[#47544d] dark:text-[#a3b8ad]">
                            {m.note || "Tanpa catatan"} ·{" "}
                            <span className="font-mono">{m.date}</span>
                          </div>
                        </div>
                        <span
                          className={`font-mono font-semibold num-tabular ${
                            m.type === "setor"
                              ? "text-[#059669] dark:text-[#34d399]"
                              : ""
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

          {/* VIEW 6: WISHLIST */}
          {activeTab === "wishlist" && (
            <div className="space-y-6">
              <div className={`p-5 space-y-4 ${cardClass}`}>
                <h2 className="font-display text-xl">Tambah Item Wishlist</h2>

                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Link2 className="h-3.5 w-3.5 text-[#47544d] dark:text-[#a3b8ad] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="url"
                      placeholder="Tempel link produk (Shopee, Tokopedia, dll)..."
                      value={wishLink}
                      onChange={(e) => setWishLink(e.target.value)}
                      className={`w-full pl-9 ${inputClass}`}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleFetchWishlistLink}
                    disabled={fetchingLink}
                    className="rounded-lg bg-[#0b110e] hover:bg-[#10b981] hover:text-[#070a09] disabled:opacity-60 text-white dark:bg-[#10b981] dark:text-[#070a09] dark:hover:bg-[#34d399] px-4 py-2 text-xs font-semibold transition-colors cursor-pointer"
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
                    className={`sm:col-span-4 ${inputClass}`}
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
                    className={`sm:col-span-3 ${inputClass}`}
                  />
                  <select
                    value={wishPriority}
                    onChange={(e) =>
                      setWishPriority(
                        e.target.value as "rendah" | "sedang" | "tinggi"
                      )
                    }
                    className={`sm:col-span-2 ${inputClass}`}
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
                    className={`sm:col-span-3 ${inputClass}`}
                  />

                  <div className="sm:col-span-6 flex items-center gap-2">
                    <input
                      type="url"
                      placeholder="URL foto produk (otomatis dari link atau tempel manual)"
                      value={wishImageURL}
                      onChange={(e) => {
                        setWishImageURL(e.target.value);
                        setWishPreviewURL(e.target.value);
                        setWishPreviewBroken(false);
                        setWishImageID("");
                      }}
                      className={`flex-1 ${inputClass}`}
                    />
                    <label className="inline-flex items-center gap-1.5 rounded-lg border border-[#0b110e]/15 dark:border-[#f4f7f5]/15 bg-[#eef1ef] dark:bg-[#070a09] px-3 py-2 text-xs font-medium hover:bg-[#10b981]/20 cursor-pointer shrink-0">
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

                  <div className="sm:col-span-4 flex items-center gap-2">
                    <select
                      value={wishSavingPotChoice}
                      onChange={(e) => setWishSavingPotChoice(e.target.value)}
                      className={`w-full ${inputClass}`}
                    >
                      <option value="">Tanpa Tabungan Wishlist</option>
                      <option value="auto">+ Buat Pos Tabungan Wishlist Otomatis</option>
                      {savingsPots.map((pot) => (
                        <option key={pot.id} value={pot.id}>
                          Hubungkan ke Pos: {pot.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-5 flex items-center gap-2">
                    {wishPreviewURL && !wishPreviewBroken && (
                      <img
                        src={wishPreviewURL}
                        alt="Preview produk"
                        onError={() => setWishPreviewBroken(true)}
                        className="h-10 w-10 rounded-lg object-cover border border-[#0b110e]/15 dark:border-[#f4f7f5]/15"
                      />
                    )}
                    {wishPreviewURL && wishPreviewBroken && (
                      <span className="text-[11px] text-[#47544d] dark:text-[#a3b8ad]">
                        Foto tidak dapat dipratinjau (opsional).
                      </span>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="sm:col-span-3 rounded-lg bg-[#10b981] hover:bg-[#34d399] text-[#070a09] py-2 px-4 text-xs font-semibold cursor-pointer"
                  >
                    + Simpan Wishlist
                  </button>
                </form>
              </div>

              {/* Search & Priority Filters for Wishlist */}
              <div className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${cardClass}`}>
                <div className="relative flex-1">
                  <Search className="h-3.5 w-3.5 text-[#47544d] dark:text-[#a3b8ad] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Cari barang wishlist, catatan, situs..."
                    value={wishSearch}
                    onChange={(e) => setWishSearch(e.target.value)}
                    className={`w-full pl-9 ${inputClass}`}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={wishPriorityFilter}
                    onChange={(e) =>
                      setWishPriorityFilter(
                        e.target.value as "all" | "tinggi" | "sedang" | "rendah"
                      )
                    }
                    className={inputClass}
                  >
                    <option value="all">Semua Prioritas</option>
                    <option value="tinggi">Prioritas Tinggi</option>
                    <option value="sedang">Prioritas Sedang</option>
                    <option value="rendah">Prioritas Rendah</option>
                  </select>
                  <select
                    value={wishStatusFilter}
                    onChange={(e) =>
                      setWishStatusFilter(
                        e.target.value as "all" | "aktif" | "dibeli"
                      )
                    }
                    className={inputClass}
                  >
                    <option value="all">Semua Status</option>
                    <option value="aktif">Aktif</option>
                    <option value="dibeli">Sudah Dibeli</option>
                  </select>
                </div>
              </div>

              {filteredWishlistItems.length === 0 ? (
                <div className={`py-12 text-center ${cardClass}`}>
                  <ShoppingBag className="h-8 w-8 mx-auto text-[#47544d]/40 dark:text-[#a3b8ad]/40 mb-2" />
                  <p className="text-sm text-[#47544d] dark:text-[#a3b8ad]">
                    Belum ada item wishlist yang cocok.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredWishlistItems.map((item) => {
                    const hasPhoto = Boolean(item.foto_url) && !brokenWishlistImgs[item.id];
                    const saldoPos = item.saldo_pos || 0;
                    const wishPct =
                      item.price > 0
                        ? Math.min(100, Math.round((saldoPos / item.price) * 100))
                        : 0;

                    return (
                      <div
                        key={item.id}
                        className={`overflow-hidden flex flex-col justify-between ${cardClass}`}
                      >
                        {hasPhoto && (
                          <div className="aspect-[16/10] w-full bg-[#eef1ef] dark:bg-[#070a09] overflow-hidden border-b border-[#0b110e]/10 dark:border-[#f4f7f5]/10">
                            <img
                              src={item.foto_url as string}
                              alt={item.name}
                              onError={() =>
                                setBrokenWishlistImgs((prev) => ({
                                  ...prev,
                                  [item.id]: true,
                                }))
                              }
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}

                        <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                          <div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs uppercase font-mono text-[#059669] dark:text-[#34d399]">
                                {item.priority}
                              </span>
                              <span className="text-xs text-[#47544d] dark:text-[#a3b8ad]">
                                {item.status}
                              </span>
                            </div>
                            <h3 className="mt-1 font-semibold text-base">
                              {item.name}
                            </h3>
                            <p className="mt-1 font-mono text-lg font-bold num-tabular">
                              {formatRupiah(item.price)}
                            </p>
                            {item.note && (
                              <p className="mt-1 text-xs text-[#47544d] dark:text-[#a3b8ad]">
                                {item.note}
                              </p>
                            )}
                            {item.link && (
                              <a
                                href={item.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[#059669] dark:text-[#34d399] hover:underline"
                              >
                                <span>{item.situs || "Buka Link Produk"}</span>
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}

                            {/* Linked Tabungan Wishlist */}
                            {item.saving_pot_id && item.status === "aktif" && (
                              <div className="mt-3 rounded-lg border border-[#10b981]/25 bg-[#f7f8f7] dark:bg-[#070a09] p-3 space-y-2">
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="font-semibold text-[#059669] dark:text-[#34d399]">
                                    Tabungan Wishlist: {item.saving_pot_name}
                                  </span>
                                  <span className="font-mono num-tabular">
                                    {wishPct}%
                                  </span>
                                </div>
                                <div className="h-1.5 w-full rounded-full bg-[#0b110e]/10 dark:bg-[#f4f7f5]/10 overflow-hidden">
                                  <div
                                    className="h-full bg-[#10b981]"
                                    style={{ width: `${wishPct}%` }}
                                  />
                                </div>
                                <div className="text-[11px] font-mono text-[#47544d] dark:text-[#a3b8ad] num-tabular">
                                  Terkumpul: {formatRupiah(saldoPos)}
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="number"
                                    min={1}
                                    placeholder="Setor (Rp)"
                                    value={wishDepositAmounts[item.id] || ""}
                                    onChange={(e) =>
                                      setWishDepositAmounts((prev) => ({
                                        ...prev,
                                        [item.id]: e.target.value,
                                      }))
                                    }
                                    className={`flex-1 min-w-0 ${inputClass}`}
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleDepositWishlistPot(
                                        item.saving_pot_id as string,
                                        item.id,
                                        item.name
                                      )
                                    }
                                    className="rounded-lg bg-[#10b981] px-2.5 py-1.5 text-[11px] font-semibold text-[#070a09] hover:bg-[#34d399] cursor-pointer"
                                  >
                                    Setor
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center justify-between gap-2 pt-3 border-t border-[#0b110e]/10 dark:border-[#f4f7f5]/10">
                            {item.status === "aktif" ? (
                              <div className="flex-1 flex flex-wrap gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleBuyWishlist(item.id, "bebas")}
                                  className="flex-1 rounded-lg bg-[#10b981] py-1.5 px-2 text-xs font-semibold text-[#070a09] hover:bg-[#34d399] cursor-pointer"
                                >
                                  Beli (Saldo)
                                </button>
                                {item.saving_pot_id && (
                                  <button
                                    type="button"
                                    onClick={() => handleBuyWishlist(item.id, "pos")}
                                    className="rounded-lg border border-[#10b981] py-1.5 px-2 text-[11px] font-semibold text-[#059669] dark:text-[#34d399] hover:bg-[#10b981]/10 cursor-pointer"
                                  >
                                    Pakai Pos
                                  </button>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs font-medium text-[#059669] dark:text-[#34d399]">
                                Sudah Dibeli
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteWishlist(item.id)}
                              title="Hapus wishlist"
                              className="p-1.5 text-[#47544d] hover:text-red-600 dark:text-[#a3b8ad] dark:hover:text-red-400 cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* VIEW 7: PROFILE & ANALYTICS (MONTH-TO-MONTH, YEAR-TO-YEAR, CHARTS) */}
          {activeTab === "profile" && (() => {
            const MONTH_NAMES = [
              "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
              "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
            ];

            // Group transactions by year & month
            const yearsSet = new Set<string>([analyticsYear || "2026"]);
            const yearlyMap: Record<string, { masuk: number; keluar: number }> = {};
            const monthlyMap: Record<string, { masuk: number; keluar: number }[]> = {};
            const categoryMap: Record<string, number> = {};

            for (const tx of transactions) {
              const year = (tx.date || "").slice(0, 4);
              const monthIdx = Number((tx.date || "").slice(5, 7)) - 1;
              if (!year || year.length !== 4 || monthIdx < 0 || monthIdx > 11) continue;

              yearsSet.add(year);
              if (!yearlyMap[year]) yearlyMap[year] = { masuk: 0, keluar: 0 };
              if (!monthlyMap[year]) {
                monthlyMap[year] = Array.from({ length: 12 }, () => ({
                  masuk: 0,
                  keluar: 0,
                }));
              }

              if (tx.type === "masuk") {
                yearlyMap[year].masuk += tx.amount;
                monthlyMap[year][monthIdx].masuk += tx.amount;
              } else {
                yearlyMap[year].keluar += tx.amount;
                monthlyMap[year][monthIdx].keluar += tx.amount;
                if (year === analyticsYear) {
                  categoryMap[tx.category] = (categoryMap[tx.category] || 0) + tx.amount;
                }
              }
            }

            const availableYears = Array.from(yearsSet).sort((a, b) => Number(b) - Number(a));
            const monthsData =
              monthlyMap[analyticsYear] ||
              Array.from({ length: 12 }, () => ({ masuk: 0, keluar: 0 }));

            const maxMonthVal = Math.max(
              1,
              ...monthsData.map((m) => Math.max(m.masuk, m.keluar))
            );
            const yearTotals = yearlyMap[analyticsYear] || { masuk: 0, keluar: 0 };
            const topCategories = Object.entries(categoryMap).sort((a, b) => b[1] - a[1]);
            const maxCatVal = Math.max(1, topCategories[0]?.[1] || 1);

            return (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h1 className="font-display text-2xl sm:text-3xl">
                      Profil & Analitik Keuangan
                    </h1>
                    <p className="text-xs text-[#47544d] dark:text-[#a3b8ad]">
                      Kelola profil akun dan pantau tren pemasukan & pengeluaran Anda.
                    </p>
                  </div>
                  <select
                    value={analyticsYear}
                    onChange={(e) => setAnalyticsYear(e.target.value)}
                    aria-label="Pilih Tahun Analitik"
                    className={inputClass}
                  >
                    {availableYears.map((yr) => (
                      <option key={yr} value={yr}>
                        Tahun {yr}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Profile Card */}
                <div className={`p-5 ${cardClass}`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#10b981]/15 border border-[#10b981]/40 text-lg font-bold text-[#059669] dark:text-[#34d399]">
                        {user.name ? user.name.charAt(0).toUpperCase() : "U"}
                      </div>
                      <div>
                        <div className="font-semibold text-base">{user.name}</div>
                        <div className="text-xs text-[#47544d] dark:text-[#a3b8ad]">
                          {user.email}
                        </div>
                      </div>
                    </div>

                    <form
                      onSubmit={handleUpdateProfileName}
                      className="flex items-center gap-2"
                    >
                      <input
                        type="text"
                        required
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        placeholder="Ubah nama profil"
                        className={inputClass}
                      />
                      <button
                        type="submit"
                        disabled={savingProfile}
                        className="rounded-lg bg-[#10b981] hover:bg-[#34d399] px-3.5 py-2 text-xs font-semibold text-[#070a09] cursor-pointer"
                      >
                        {savingProfile ? "Menyimpan..." : "Simpan Nama"}
                      </button>
                    </form>
                  </div>
                </div>

                {/* Year Summary KPIs */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <MetricCard
                    title={`Total Pemasukan (${analyticsYear})`}
                    value={yearTotals.masuk}
                    badgeText="Masuk"
                    badgeVariant="income"
                    isDark={isDark}
                  />
                  <MetricCard
                    title={`Total Pengeluaran (${analyticsYear})`}
                    value={yearTotals.keluar}
                    badgeText="Keluar"
                    badgeVariant="expense"
                    isDark={isDark}
                  />
                  <MetricCard
                    title={`Selisih Bersih (${analyticsYear})`}
                    value={yearTotals.masuk - yearTotals.keluar}
                    badgeText={yearTotals.masuk >= yearTotals.keluar ? "Surplus" : "Defisit"}
                    badgeVariant={yearTotals.masuk >= yearTotals.keluar ? "income" : "expense"}
                    isDark={isDark}
                  />
                </div>

                {/* Dual-Bar Chart: Pemasukan vs Pengeluaran */}
                <div className={`p-5 space-y-4 ${cardClass}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h2 className="font-display text-lg">
                        Chart Pemasukan & Pengeluaran ({analyticsYear})
                      </h2>
                      <p className="text-xs text-[#47544d] dark:text-[#a3b8ad]">
                        Perbandingan arus kas masuk dan keluar tiap bulan
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-xs bg-[#10b981]" />
                        Pemasukan
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-xs bg-red-500" />
                        Pengeluaran
                      </span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <div className="h-56 flex items-end gap-2 sm:gap-3 border-b border-[#0b110e]/10 dark:border-[#f4f7f5]/10 pb-2">
                      {monthsData.map((m, idx) => {
                        const masukPct = Math.round((m.masuk / maxMonthVal) * 100);
                        const keluarPct = Math.round((m.keluar / maxMonthVal) * 100);
                        return (
                          <div
                            key={MONTH_NAMES[idx]}
                            className="flex-1 h-full flex flex-col justify-end items-center gap-1 group relative"
                          >
                            {/* Hover Tooltip */}
                            <div className="pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity absolute -top-2 z-20 rounded-md border border-[#0b110e]/15 bg-[#070a09] text-[#f4f7f5] px-2 py-1 text-[10px] font-mono whitespace-nowrap shadow-lg">
                              <div>{MONTH_NAMES[idx]} {analyticsYear}</div>
                              <div className="text-[#34d399]">+{formatRupiah(m.masuk)}</div>
                              <div className="text-red-400">-{formatRupiah(m.keluar)}</div>
                            </div>

                            <div className="w-full flex-1 flex items-end justify-center gap-1">
                              <div
                                className="w-2.5 sm:w-3.5 rounded-t-sm bg-[#10b981] transition-all duration-300"
                                style={{ height: `${Math.max(m.masuk > 0 ? 4 : 1, masukPct)}%` }}
                              />
                              <div
                                className="w-2.5 sm:w-3.5 rounded-t-sm bg-red-500 transition-all duration-300"
                                style={{ height: `${Math.max(m.keluar > 0 ? 4 : 1, keluarPct)}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex gap-2 sm:gap-3 pt-2">
                      {MONTH_NAMES.map((name) => (
                        <div
                          key={name}
                          className="flex-1 text-center text-[10px] sm:text-xs font-mono text-[#47544d] dark:text-[#a3b8ad]"
                        >
                          {name}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Month-to-Month Expense Table */}
                  <div className={`p-5 space-y-3 ${cardClass}`}>
                    <h2 className="font-display text-lg">
                      Analitik Bulan ke Bulan ({analyticsYear})
                    </h2>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-[#0b110e]/10 dark:border-[#f4f7f5]/10 text-[#47544d] dark:text-[#a3b8ad]">
                            <th className="py-2 font-medium">Bulan</th>
                            <th className="py-2 font-medium text-right">Masuk</th>
                            <th className="py-2 font-medium text-right">Keluar</th>
                            <th className="py-2 font-medium text-right">Tren Keluar</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#0b110e]/10 dark:divide-[#f4f7f5]/10">
                          {monthsData.map((m, idx) => {
                            if (m.masuk === 0 && m.keluar === 0) return null;
                            const prevKeluar = idx > 0 ? monthsData[idx - 1].keluar : 0;
                            const diffPct =
                              prevKeluar > 0
                                ? Math.round(((m.keluar - prevKeluar) / prevKeluar) * 100)
                                : null;
                            return (
                              <tr key={MONTH_NAMES[idx]}>
                                <td className="py-2.5 font-medium">{MONTH_NAMES[idx]}</td>
                                <td className="py-2.5 text-right font-mono text-[#059669] dark:text-[#34d399] num-tabular">
                                  {formatRupiah(m.masuk)}
                                </td>
                                <td className="py-2.5 text-right font-mono num-tabular">
                                  {formatRupiah(m.keluar)}
                                </td>
                                <td className="py-2.5 text-right font-mono text-[11px] num-tabular">
                                  {diffPct === null ? (
                                    <span className="text-[#47544d] dark:text-[#a3b8ad]">—</span>
                                  ) : (
                                    <span className={diffPct > 0 ? "text-red-500" : "text-[#059669] dark:text-[#34d399]"}>
                                      {diffPct > 0 ? `+${diffPct}%` : `${diffPct}%`}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                          {monthsData.every((m) => m.masuk === 0 && m.keluar === 0) && (
                            <tr>
                              <td colSpan={4} className="py-6 text-center text-[#47544d] dark:text-[#a3b8ad]">
                                Belum ada transaksi pada tahun {analyticsYear}.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Year-to-Year + Top Categories */}
                  <div className="space-y-6">
                    <div className={`p-5 space-y-3 ${cardClass}`}>
                      <h2 className="font-display text-lg">
                        Perbandingan Tahun ke Tahun
                      </h2>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-[#0b110e]/10 dark:border-[#f4f7f5]/10 text-[#47544d] dark:text-[#a3b8ad]">
                              <th className="py-2 font-medium">Tahun</th>
                              <th className="py-2 font-medium text-right">Pemasukan</th>
                              <th className="py-2 font-medium text-right">Pengeluaran</th>
                              <th className="py-2 font-medium text-right">Bersih</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#0b110e]/10 dark:divide-[#f4f7f5]/10">
                            {availableYears.map((yr) => {
                              const tot = yearlyMap[yr] || { masuk: 0, keluar: 0 };
                              const net = tot.masuk - tot.keluar;
                              return (
                                <tr key={yr}>
                                  <td className="py-2.5 font-mono font-semibold">{yr}</td>
                                  <td className="py-2.5 text-right font-mono text-[#059669] dark:text-[#34d399] num-tabular">
                                    {formatRupiah(tot.masuk)}
                                  </td>
                                  <td className="py-2.5 text-right font-mono num-tabular">
                                    {formatRupiah(tot.keluar)}
                                  </td>
                                  <td className={`py-2.5 text-right font-mono font-semibold num-tabular ${net >= 0 ? "text-[#059669] dark:text-[#34d399]" : "text-red-500"}`}>
                                    {net >= 0 ? "+" : ""}
                                    {formatRupiah(net)}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className={`p-5 space-y-3 ${cardClass}`}>
                      <h2 className="font-display text-lg">
                        Kategori Pengeluaran Terbesar ({analyticsYear})
                      </h2>
                      {topCategories.length === 0 ? (
                        <p className="py-4 text-center text-xs text-[#47544d] dark:text-[#a3b8ad]">
                          Belum ada pengeluaran pada tahun {analyticsYear}.
                        </p>
                      ) : (
                        <div className="space-y-2.5">
                          {topCategories.slice(0, 5).map(([cat, total]) => (
                            <div key={cat} className="space-y-1">
                              <div className="flex justify-between text-xs">
                                <span className="font-medium">{cat}</span>
                                <span className="font-mono num-tabular">
                                  {formatRupiah(total)}
                                </span>
                              </div>
                              <div className="h-1.5 w-full rounded-full bg-[#eef1ef] dark:bg-[#f4f7f5]/10 overflow-hidden">
                                <div
                                  className="h-full bg-[#10b981]"
                                  style={{ width: `${Math.round((total / maxCatVal) * 100)}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </main>

        <TransactionModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleCreateTransaction}
        />
      </div>
    </div>
  );
}
