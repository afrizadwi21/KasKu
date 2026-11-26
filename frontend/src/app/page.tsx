"use client";

import React, { useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  TrendingUp,
  Receipt,
  User,
  Search,
  Filter,
} from "lucide-react";
import { Header } from "../components/Header";
import { MetricCard, formatRupiah } from "../components/MetricCard";
import { TransactionModal } from "../components/TransactionModal";
import {
  Transaction,
  DebtSummary,
  Subscription,
  Bill,
  OverviewData,
  TodayData,
  UnpaidItem,
} from "../types";

export default function Home() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "masuk" | "keluar">("all");

  // Initial Seed Data (Verified against 002_seed.sql)
  const [overview, setOverview] = useState<OverviewData>({
    saldo: 65353,
    piutang_total: 26347,
    hutang_saya_total: 0,
    belum_dibayar_total: 0,
    belum_dibayar_jumlah: 0,
    kekayaan_bersih: 91700,
  });

  const [todayData, setTodayData] = useState<TodayData>({
    tanggal: "2026-11-26",
    masuk_hari_ini: 113652,
    keluar_hari_ini: 48299,
    jumlah_transaksi: 7,
    saldo_awal_hari: 0,
    saldo_sekarang: 65353,
    selisih_hari_ini: 65353,
    pemasukan_per_sumber_hari_ini: [
      { sumber: "Jual Akun MLBB", total: 99000 },
      { sumber: "Febi", total: 14652 },
    ],
    transaksi: [],
  });

  const [transactions, setTransactions] = useState<Transaction[]>([
    {
      id: "tx-7",
      date: "2026-11-26",
      type: "masuk",
      category: "Terima Bayar Hutang",
      party: "Febi",
      source: "Febi",
      note: "Cicilan kedua Febi",
      amount: 5000,
      saldo_setelah: 65353,
      jumlah_item: 0,
      created_at: "2026-11-26 14:00:00",
    },
    {
      id: "tx-6",
      date: "2026-11-26",
      type: "masuk",
      category: "Terima Bayar Hutang",
      party: "Febi",
      source: "Febi",
      note: "Cicilan pertama Febi",
      amount: 9652,
      saldo_setelah: 60353,
      jumlah_item: 0,
      created_at: "2026-11-26 13:00:00",
    },
    {
      id: "tx-5",
      date: "2026-11-26",
      type: "keluar",
      category: "Langganan",
      party: "Domain",
      source: "",
      note: "Perpanjang Domain",
      amount: 3300,
      saldo_setelah: 50701,
      jumlah_item: 1,
      created_at: "2026-11-26 12:00:00",
      items: [{ name: "Domain", qty: 1, unit_price: 3300, subtotal: 3300 }],
    },
    {
      id: "tx-4",
      date: "2026-11-26",
      type: "keluar",
      category: "Pengeluaran Lain",
      party: "Bu Inggit",
      source: "",
      note: "Beli cemilan Bu Inggit",
      amount: 4000,
      saldo_setelah: 54001,
      jumlah_item: 0,
      created_at: "2026-11-26 11:00:00",
    },
    {
      id: "tx-3",
      date: "2026-11-26",
      type: "keluar",
      category: "Beri Pinjaman",
      party: "Febi",
      source: "",
      note: "Pinjaman kedua Febi",
      amount: 10000,
      saldo_setelah: 58001,
      jumlah_item: 0,
      created_at: "2026-11-26 10:00:00",
    },
    {
      id: "tx-2",
      date: "2026-11-26",
      type: "keluar",
      category: "Beri Pinjaman",
      party: "Febi",
      source: "",
      note: "Pinjaman pertama Febi",
      amount: 30999,
      saldo_setelah: 68001,
      jumlah_item: 0,
      created_at: "2026-11-26 09:00:00",
    },
    {
      id: "tx-1",
      date: "2026-11-26",
      type: "masuk",
      category: "Jual Akun/Barang",
      party: "",
      source: "Jual Akun MLBB",
      note: "Jual akun MLBB",
      amount: 99000,
      saldo_setelah: 99000,
      jumlah_item: 0,
      created_at: "2026-11-26 08:00:00",
    },
  ]);

  const [debts, setDebts] = useState<DebtSummary[]>([
    {
      nama: "Febi",
      total: 40999,
      dibayar: 14652,
      sisa: 26347,
      persen: 36,
      status: "Dicicil",
    },
  ]);

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([
    {
      id: "sub-1",
      name: "Domain",
      amount: 3300,
      cycle: "tahunan",
      first_due: "2026-11-26",
      active: true,
      jatuh_tempo: "2027-11-26",
      sisa_hari: 365,
      telat_hari: 0,
      status: "Sudah Dibayar",
      terakhir_dibayar: "2026-11-26",
      total_dibayar: 3300,
      total_kali_bayar: 1,
    },
  ]);

  const [bills, setBills] = useState<Bill[]>([
    {
      id: "bill-1",
      title: "Tagihan Listrik PLN",
      amount: 250000,
      due_date: "2026-11-28",
      paid: false,
      note: "ID Pelanggan 538201928",
      status: "Belum Dibayar",
      telat_hari: 0,
    },
  ]);

  const unpaidItems: UnpaidItem[] = [
    {
      jenis: "piutang",
      nama: "Febi",
      jumlah: 26347,
      jatuh_tempo: "Sisa Dicicil (36%)",
      status: "Dicicil",
      telat_hari: 0,
    },
    {
      jenis: "tagihan",
      nama: "Tagihan Listrik PLN",
      jumlah: 250000,
      jatuh_tempo: "2026-11-28",
      status: "Belum Dibayar",
      telat_hari: 0,
    },
  ];

  const handleAddTransaction = (newTx: any) => {
    const isMasuk = newTx.type === "masuk";
    const delta = isMasuk ? newTx.amount : -newTx.amount;
    const newSaldo = overview.saldo + delta;

    const createdTx: Transaction = {
      id: `tx-${Date.now()}`,
      date: newTx.date,
      type: newTx.type,
      category: newTx.category,
      party: newTx.party || "",
      source: newTx.source || "",
      note: newTx.note || "",
      amount: newTx.amount,
      saldo_setelah: newSaldo,
      jumlah_item: newTx.items ? newTx.items.length : 0,
      created_at: new Date().toISOString(),
      items: newTx.items,
    };

    setTransactions([createdTx, ...transactions]);
    setOverview({
      ...overview,
      saldo: newSaldo,
      kekayaan_bersih: overview.kekayaan_bersih + delta,
    });
  };

  const handlePayBill = (billId: string) => {
    const bill = bills.find((b) => b.id === billId);
    if (!bill || bill.paid) return;

    setBills(
      bills.map((b) =>
        b.id === billId ? { ...b, paid: true, status: "Sudah Dibayar" as const } : b
      )
    );

    handleAddTransaction({
      date: new Date().toISOString().split("T")[0],
      type: "keluar",
      category: "Tagihan",
      party: bill.title,
      source: "",
      note: bill.note || `Pembayaran ${bill.title}`,
      amount: bill.amount,
      items: [],
    });
  };

  const filteredTransactions = transactions.filter((tx) => {
    const matchType = typeFilter === "all" || tx.type === typeFilter;
    const query = searchQuery.toLowerCase();
    const matchQuery =
      !searchQuery ||
      tx.category.toLowerCase().includes(query) ||
      tx.party.toLowerCase().includes(query) ||
      tx.source.toLowerCase().includes(query) ||
      tx.note.toLowerCase().includes(query);
    return matchType && matchQuery;
  });

  return (
    <div className="min-h-screen bg-[var(--surface-canvas)]">
      {/* Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenModal={() => setIsModalOpen(true)}
      />

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {/* TAB 1: DASHBOARD */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                title="Saldo Kas Terkini"
                value={overview.saldo}
                badgeText="Real-time"
                badgeVariant="income"
                subtitle="Saldo berjalan otomatis"
              />
              <MetricCard
                title="Kekayaan Bersih (Net Worth)"
                value={overview.kekayaan_bersih}
                badgeText="Kas + Piutang - Hutang"
                badgeVariant="neutral"
                subtitle="Nilai likuiditas riil"
              />
              <MetricCard
                title="Pemasukan Hari Ini"
                value={todayData.masuk_hari_ini}
                badgeText="2 Transaksi"
                badgeVariant="income"
                subtitle="Jual Akun MLBB & Febi"
              />
              <MetricCard
                title="Pengeluaran Hari Ini"
                value={todayData.keluar_hari_ini}
                badgeText="4 Transaksi"
                badgeVariant="expense"
                subtitle="Pinjaman & Langganan"
              />
            </div>

            {/* Kewajiban Belum Dibayar / Mendesak */}
            <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-xs dark:border-zinc-800 dark:bg-[#12151c]">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    Kewajiban & Pelacakan Mendesak
                  </h3>
                </div>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  {unpaidItems.length} item aktif
                </span>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {unpaidItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-md border border-zinc-100 bg-zinc-50/60 p-3 dark:border-zinc-800/80 dark:bg-zinc-900/40"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                          {item.nama}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            item.jenis === "piutang"
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                              : "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300"
                          }`}
                        >
                          {item.jenis.toUpperCase()}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                        Jatuh Tempo: {item.jatuh_tempo}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100 num-tabular">
                        {formatRupiah(item.jumlah)}
                      </div>
                      <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">
                        {item.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 2-Column: Recent Transactions & Sources */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Recent Transactions List */}
              <div className="lg:col-span-2 rounded-lg border border-zinc-200 bg-white p-4 shadow-xs dark:border-zinc-800 dark:bg-[#12151c]">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    Aktivitas Transaksi Terbaru
                  </h3>
                  <button
                    onClick={() => setActiveTab("transactions")}
                    className="text-xs font-medium text-teal-600 hover:text-teal-700 dark:text-teal-400"
                  >
                    Lihat Semua ({transactions.length})
                  </button>
                </div>

                <div className="mt-3 divide-y divide-zinc-100 dark:divide-zinc-800/80">
                  {transactions.slice(0, 5).map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between py-2.5 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20 px-1 rounded transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-md ${
                            tx.type === "masuk"
                              ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
                              : "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400"
                          }`}
                        >
                          {tx.type === "masuk" ? (
                            <ArrowDownRight className="h-4 w-4" />
                          ) : (
                            <ArrowUpRight className="h-4 w-4" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                              {tx.category}
                            </span>
                            {tx.party && (
                              <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                                • {tx.party}
                              </span>
                            )}
                            {tx.jumlah_item > 0 && (
                              <span className="rounded bg-zinc-100 px-1.5 py-0.2 text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                                {tx.jumlah_item} item
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                            {tx.note || tx.source || "Tanpa catatan"}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <div
                          className={`text-xs font-bold num-tabular ${
                            tx.type === "masuk"
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-red-600 dark:text-red-400"
                          }`}
                        >
                          {tx.type === "masuk" ? "+" : "-"}
                          {formatRupiah(tx.amount)}
                        </div>
                        <div className="text-[10px] text-zinc-400 dark:text-zinc-500 num-tabular">
                          Saldo: {formatRupiah(tx.saldo_setelah)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Income Sources Summary */}
              <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-xs dark:border-zinc-800 dark:bg-[#12151c]">
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 pb-3 border-b border-zinc-100 dark:border-zinc-800">
                  Pemasukan per Sumber
                </h3>
                <div className="mt-4 space-y-4">
                  {todayData.pemasukan_per_sumber_hari_ini.map((src, idx) => {
                    const pct = Math.round(
                      (src.total / todayData.masuk_hari_ini) * 100
                    );
                    return (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex justify-between text-xs font-medium">
                          <span className="text-zinc-700 dark:text-zinc-300">
                            {src.sumber}
                          </span>
                          <span className="text-zinc-900 font-semibold dark:text-zinc-100 num-tabular">
                            {formatRupiah(src.total)} ({pct}%)
                          </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-zinc-100 dark:bg-zinc-800">
                          <div
                            className="h-1.5 rounded-full bg-teal-600 dark:bg-teal-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6 rounded-md bg-zinc-50 p-3 text-xs text-zinc-600 dark:bg-zinc-900/60 dark:text-zinc-400">
                  <p className="font-semibold text-zinc-800 dark:text-zinc-200">
                    Sistem Single-Token / JWT
                  </p>
                  <p className="mt-0.5 text-[11px]">
                    Setiap request diproteksi token JWT dan terisolasi per akun user.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: TRANSAKSI */}
        {activeTab === "transactions" && (
          <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-[#12151c]">
            {/* Filter Bar */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Cari transaksi, pihak, atau catatan..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-64 rounded-md border border-zinc-300 bg-white pl-8 pr-3 py-1.5 text-xs text-zinc-900 focus:border-teal-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                  />
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setTypeFilter("all")}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                    typeFilter === "all"
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                  }`}
                >
                  Semua
                </button>
                <button
                  onClick={() => setTypeFilter("masuk")}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                    typeFilter === "masuk"
                      ? "bg-emerald-600 text-white"
                      : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                  }`}
                >
                  Masuk (+)
                </button>
                <button
                  onClick={() => setTypeFilter("keluar")}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                    typeFilter === "keluar"
                      ? "bg-red-600 text-white"
                      : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                  }`}
                >
                  Keluar (-)
                </button>
              </div>
            </div>

            {/* Transaction Rows Table */}
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                    <th className="pb-2 font-medium">Tanggal</th>
                    <th className="pb-2 font-medium">Jenis / Kategori</th>
                    <th className="pb-2 font-medium">Pihak / Sumber</th>
                    <th className="pb-2 font-medium">Keterangan</th>
                    <th className="pb-2 text-right font-medium">Nominal</th>
                    <th className="pb-2 text-right font-medium">Saldo Setelah</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                  {filteredTransactions.map((tx) => (
                    <tr
                      key={tx.id}
                      className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors"
                    >
                      <td className="py-3 text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                        {tx.date}
                      </td>
                      <td className="py-3 font-semibold text-zinc-900 dark:text-zinc-100">
                        <span
                          className={`inline-block mr-1.5 h-2 w-2 rounded-full ${
                            tx.type === "masuk" ? "bg-emerald-500" : "bg-red-500"
                          }`}
                        />
                        {tx.category}
                      </td>
                      <td className="py-3 text-zinc-700 dark:text-zinc-300">
                        {tx.party || tx.source || "-"}
                      </td>
                      <td className="py-3 text-zinc-500 dark:text-zinc-400">
                        {tx.note || "-"}
                        {tx.items && tx.items.length > 0 && (
                          <div className="text-[11px] text-teal-600 dark:text-teal-400">
                            {tx.items.map((it) => `${it.name} (${it.qty}x)`).join(", ")}
                          </div>
                        )}
                      </td>
                      <td
                        className={`py-3 text-right font-bold num-tabular whitespace-nowrap ${
                          tx.type === "masuk"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {tx.type === "masuk" ? "+" : "-"}
                        {formatRupiah(tx.amount)}
                      </td>
                      <td className="py-3 text-right text-zinc-600 dark:text-zinc-400 num-tabular whitespace-nowrap">
                        {formatRupiah(tx.saldo_setelah)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: PIUTANG & HUTANG */}
        {activeTab === "debts" && (
          <div className="space-y-6">
            <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-[#12151c]">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
                <div>
                  <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                    Daftar Piutang (Orang Berhutang ke Anda)
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Dihitung otomatis: Beri Pinjaman - Terima Bayar Hutang
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-zinc-500">Total Sisa Piutang:</span>
                  <div className="text-base font-bold text-amber-600 dark:text-amber-400 num-tabular">
                    {formatRupiah(overview.piutang_total)}
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-4">
                {debts.map((d, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-900/40"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-200 text-xs font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                          {d.nama.charAt(0)}
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                            {d.nama}
                          </h4>
                          <p className="text-[11px] text-zinc-500">
                            Total Pinjaman: {formatRupiah(d.total)} • Dibayar: {formatRupiah(d.dibayar)}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                          {d.status} ({d.persen}% lunas)
                        </span>
                        <div className="mt-1 text-sm font-bold text-zinc-900 dark:text-zinc-100 num-tabular">
                          Sisa: {formatRupiah(d.sisa)}
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar Cicilan */}
                    <div className="mt-3">
                      <div className="h-2 w-full rounded-full bg-zinc-200 dark:bg-zinc-800">
                        <div
                          className="h-2 rounded-full bg-emerald-600 dark:bg-emerald-500 transition-all"
                          style={{ width: `${d.persen}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Hutang Saya */}
            <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-[#12151c]">
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                Hutang Anda ke Orang Lain
              </h3>
              <p className="mt-1 text-xs text-zinc-500">
                Total Hutang Saya: <strong className="text-zinc-900 dark:text-zinc-100">Rp 0</strong> (Tidak ada hutang aktif)
              </p>
            </div>
          </div>
        )}

        {/* TAB 4: LANGGANAN & TAGIHAN */}
        {activeTab === "subscriptions" && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Langganan Rutin */}
            <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-[#12151c]">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    Langganan Rutin
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Siklus berkala dengan status jatuh tempo otomatis
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {subscriptions.map((sub) => (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between rounded-lg border border-zinc-100 p-3.5 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-900/40"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                          {sub.name}
                        </span>
                        <span className="rounded-full bg-zinc-200/80 px-2 py-0.5 text-[10px] font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                          {sub.cycle}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500 mt-1">
                        Jatuh Tempo: {sub.jatuh_tempo} ({sub.sisa_hari} hari lagi)
                      </p>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100 num-tabular">
                        {formatRupiah(sub.amount)}
                      </div>
                      <span className="inline-block mt-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                        {sub.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tagihan Sekali Bayar */}
            <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-[#12151c]">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    Tagihan Sekali Bayar (Bills)
                  </h3>
                  <p className="text-xs text-zinc-500">
                    1-klik bayar mencatat otomatis ke pengeluaran
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {bills.map((bill) => (
                  <div
                    key={bill.id}
                    className="flex items-center justify-between rounded-lg border border-zinc-100 p-3.5 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-900/40"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                          {bill.title}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            bill.paid
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                          }`}
                        >
                          {bill.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500 mt-1">
                        Jatuh Tempo: {bill.due_date} • {bill.note}
                      </p>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100 num-tabular">
                        {formatRupiah(bill.amount)}
                      </div>
                      {!bill.paid ? (
                        <button
                          onClick={() => handlePayBill(bill.id)}
                          className="mt-1 rounded-md bg-teal-700 px-2.5 py-1 text-[11px] font-semibold text-white shadow-xs hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
                        >
                          Bayar Sekarang
                        </button>
                      ) : (
                        <span className="text-[10px] text-zinc-400">Lunas</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modal Tambah Transaksi */}
      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleAddTransaction}
      />
    </div>
  );
}
