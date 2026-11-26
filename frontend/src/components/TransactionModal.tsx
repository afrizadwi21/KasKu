"use client";

import React, { useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { TransactionItem } from "../types";
import { getZodErrorMessage, transactionSchema } from "../lib/schemas";

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

export function TransactionModal({ isOpen, onClose, onSubmit }: TransactionModalProps) {
  const [type, setType] = useState<"masuk" | "keluar">("masuk");
  const [category, setCategory] = useState("Jual Akun/Barang");
  const [amount, setAmount] = useState<number>(0);
  const [party, setParty] = useState("");
  const [source, setSource] = useState("");
  const [note, setNote] = useState("");
  const [items, setItems] = useState<TransactionItem[]>([]);
  const [date, setDate] = useState("");
  const [formError, setFormError] = useState("");

  React.useEffect(() => {
    if (isOpen && !date) {
      setDate(new Date().toISOString().split("T")[0]);
    }
  }, [isOpen, date]);

  if (!isOpen) return null;

  const masukCategories = [
    "Jual Akun/Barang",
    "Gaji/Penghasilan",
    "Terima Bayar Hutang",
    "Pinjam dari Orang",
    "Pemasukan Lain",
  ];

  const keluarCategories = [
    "Makanan & Minuman",
    "Transport",
    "Belanja",
    "Langganan",
    "Tagihan",
    "Beri Pinjaman",
    "Bayar Hutang Saya",
    "Hiburan/Game",
    "Pengeluaran Lain",
  ];

  const handleAddItem = () => {
    setItems([...items, { name: "", qty: 1, unit_price: 0, subtotal: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof TransactionItem, val: any) => {
    const updated = [...items];
    const item = { ...updated[index], [field]: val };
    item.subtotal = Math.round(Number(item.qty || 0) * Number(item.unit_price || 0));
    updated[index] = item;
    setItems(updated);
  };

  const calculatedTotal =
    items.length > 0 ? items.reduce((sum, it) => sum + it.subtotal, 0) : amount;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    const parsed = transactionSchema.safeParse({
      date,
      type,
      category,
      amount: calculatedTotal,
    });
    if (!parsed.success) {
      setFormError(getZodErrorMessage(parsed.error));
      return;
    }
    onSubmit({
      date: parsed.data.date,
      type: parsed.data.type,
      category: parsed.data.category,
      party,
      source: type === "masuk" ? (source || party) : "",
      note,
      amount: parsed.data.amount,
      items: items.filter((it) => it.name.trim() !== ""),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-lg rounded-xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-[#12151c]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
            Catat Transaksi Baru
          </h3>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {formError && (
            <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-700">
              {formError}
            </div>
          )}
          {/* Type Toggle */}
          <div className="grid grid-cols-2 gap-2 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800/60">
            <button
              type="button"
              onClick={() => {
                setType("masuk");
                setCategory("Jual Akun/Barang");
              }}
              className={`rounded-md py-1.5 text-xs font-semibold transition-all ${
                type === "masuk"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400"
              }`}
            >
              Uang Masuk (+)
            </button>
            <button
              type="button"
              onClick={() => {
                setType("keluar");
                setCategory("Makanan & Minuman");
              }}
              className={`rounded-md py-1.5 text-xs font-semibold transition-all ${
                type === "keluar"
                  ? "bg-red-600 text-white shadow-xs"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400"
              }`}
            >
              Uang Keluar (-)
            </button>
          </div>

          {/* Form Fields Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Tanggal
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-900 focus:border-teal-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Kategori
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-900 focus:border-teal-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              >
                {(type === "masuk" ? masukCategories : keluarCategories).map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                {type === "masuk" ? "Sumber Dana (Wajib)" : "Pihak / Toko (Party)"}
              </label>
              <input
                type="text"
                placeholder={type === "masuk" ? "mis. Jual Akun MLBB" : "mis. Indomaret / Febi"}
                value={type === "masuk" ? source : party}
                onChange={(e) => {
                  if (type === "masuk") setSource(e.target.value);
                  else setParty(e.target.value);
                }}
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-900 focus:border-teal-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Nominal (Rp)
              </label>
              <input
                type="number"
                disabled={items.length > 0}
                placeholder="0"
                value={items.length > 0 ? calculatedTotal : amount || ""}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-900 focus:border-teal-500 focus:outline-none disabled:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:disabled:bg-zinc-800"
              />
            </div>
          </div>

          {/* Rincian Barang Pembelian (Items) */}
          <div className="border-t border-zinc-100 pt-3 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Rincian Barang (Opsional)
              </span>
              <button
                type="button"
                onClick={handleAddItem}
                className="flex items-center gap-1 text-[11px] font-medium text-teal-600 hover:text-teal-700 dark:text-teal-400"
              >
                <Plus className="h-3 w-3" /> Tambah Item
              </button>
            </div>

            {items.length > 0 && (
              <div className="mt-2 space-y-2 max-h-36 overflow-y-auto pr-1">
                {items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Nama barang"
                      value={item.name}
                      onChange={(e) => handleItemChange(idx, "name", e.target.value)}
                      className="flex-1 rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                    />
                    <input
                      type="number"
                      placeholder="Qty"
                      min={1}
                      value={item.qty}
                      onChange={(e) => handleItemChange(idx, "qty", Number(e.target.value))}
                      className="w-16 rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                    />
                    <input
                      type="number"
                      placeholder="Harga"
                      value={item.unit_price || ""}
                      onChange={(e) => handleItemChange(idx, "unit_price", Number(e.target.value))}
                      className="w-24 rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="text-zinc-400 hover:text-red-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Catatan (Note)
            </label>
            <input
              type="text"
              placeholder="Keterangan tambahan..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-900 focus:border-teal-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-zinc-200 px-3.5 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              Batal
            </button>
            <button
              type="submit"
              className="rounded-md bg-teal-700 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
            >
              Simpan Transaksi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
