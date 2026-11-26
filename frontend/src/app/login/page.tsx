"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { getStoredAccessToken, loginUser } from "../../lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getStoredAccessToken()) {
      router.replace("/dashboard");
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await loginUser(email.trim(), password);
      router.replace("/dashboard");
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Gagal masuk. Periksa kembali email dan password."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070a09] text-[#f4f7f5] flex flex-col justify-between px-5 py-8 sm:px-8">
      <div className="max-w-md w-full mx-auto">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
            <rect width="28" height="28" rx="6" fill="#0e1412" stroke="#10b981" strokeWidth="1.5" />
            <path
              d="M9 8.5V19.5M9 14L17.5 8.5M12.5 11.8L18.5 19.5"
              stroke="#10b981"
              strokeWidth="2.2"
              strokeLinecap="square"
            />
          </svg>
          <span className="font-display text-xl tracking-tight text-[#f4f7f5]">
            KasKu
          </span>
        </Link>
      </div>

      <div className="max-w-md w-full mx-auto my-8 rounded-sm border border-[#f4f7f5]/15 bg-[#0e1412] p-6 sm:p-8 shadow-2xl">
        <div className="space-y-2 mb-6">
          <h1 className="font-display text-3xl tracking-tight text-[#f4f7f5]">
            Masuk ke KasKu
          </h1>
          <p className="text-sm text-[#a3b8ad]">
            Masuk untuk mengakses catatan keuangan pribadi dan dashboard Anda.
          </p>
        </div>

        {error && (
          <div className="mb-5 rounded-sm border border-red-500/40 bg-red-950/40 px-4 py-3 text-xs text-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="email" className="block text-xs font-medium text-[#a3b8ad]">
              Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#a3b8ad] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
                className="w-full rounded-sm border border-[#f4f7f5]/15 bg-[#070a09] pl-10 pr-3 py-2.5 text-sm text-[#f4f7f5] placeholder:text-[#a3b8ad]/40 focus:border-[#10b981] focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="block text-xs font-medium text-[#a3b8ad]">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#a3b8ad] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password"
                className="w-full rounded-sm border border-[#f4f7f5]/15 bg-[#070a09] pl-10 pr-10 py-2.5 text-sm text-[#f4f7f5] placeholder:text-[#a3b8ad]/40 focus:border-[#10b981] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a3b8ad] hover:text-[#f4f7f5]"
                aria-label={showPassword ? "Sembunyikan password" : "Lihat password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 inline-flex items-center justify-center gap-2 rounded-sm bg-[#10b981] hover:bg-[#34d399] disabled:opacity-60 px-4 py-2.5 text-sm font-semibold text-[#070a09] transition-colors cursor-pointer"
          >
            <span>{loading ? "Memproses..." : "Masuk ke Dashboard"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-[#f4f7f5]/10 text-center text-xs text-[#a3b8ad]">
          Belum punya akun?{" "}
          <Link href="/register" className="text-[#34d399] hover:underline font-medium">
            Daftar sekarang
          </Link>
        </div>
      </div>

      <div className="max-w-md w-full mx-auto text-center text-xs text-[#a3b8ad]/60 font-mono">
        © 2026 KasKu — Akun Pribadi Terenkripsi
      </div>
    </div>
  );
}
