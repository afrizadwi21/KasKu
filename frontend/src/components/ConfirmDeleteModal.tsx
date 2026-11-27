"use client";

import React, { useEffect } from "react";
import { AlertTriangle, X } from "lucide-react";

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  isDark?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDeleteModal({
  isOpen,
  title,
  description,
  confirmLabel = "Hapus",
  cancelLabel = "Batal",
  loading = false,
  isDark = false,
  onConfirm,
  onCancel,
}: ConfirmDeleteModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) {
        onCancel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, loading, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={() => {
        if (!loading) onCancel();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-delete-title"
    >
      <div
        className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl transition-all ${
          isDark
            ? "bg-[#0e1412] border-[#f4f7f5]/15 text-[#f4f7f5]"
            : "bg-white border-[#0b110e]/10 text-[#0b110e]"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/15 text-red-500">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="space-y-1.5">
              <h3
                id="confirm-delete-title"
                className="font-display text-lg font-semibold leading-snug"
              >
                {title}
              </h3>
              <p
                className={`text-sm leading-relaxed ${
                  isDark ? "text-[#a3b8ad]" : "text-[#47544d]"
                }`}
              >
                {description}
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className={`rounded-lg p-1.5 transition-colors disabled:opacity-50 ${
              isDark
                ? "text-[#a3b8ad] hover:bg-[#f4f7f5]/10 hover:text-[#f4f7f5]"
                : "text-[#47544d] hover:bg-[#0b110e]/5 hover:text-[#0b110e]"
            }`}
            aria-label="Tutup"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2.5">
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className={`rounded-xl border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
              isDark
                ? "border-[#f4f7f5]/15 bg-[#f4f7f5]/5 text-[#f4f7f5] hover:bg-[#f4f7f5]/10"
                : "border-[#0b110e]/15 bg-[#f7f8f7] text-[#0b110e] hover:bg-[#eef1ef]"
            }`}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700 disabled:opacity-60"
          >
            {loading ? "Menghapus..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
