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
        err instanceof Error
          ? err.message
          : "Gagal masuk. Periksa kembali email dan password."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070a09] text-[#f4f7f5] flex flex-col">
      {/* Top Header with Horizontal Divider */}
      <header className="w-full">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-20 flex items-center justify-between border-b border-[#f4f7f5]/15">
          <Link href="/" className="inline-flex items-center gap-2.5 group">
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
              KasKu<span className="text-[#10b981]">.</span>
            </span>
          </Link>

          <Link
            href="/"
            className="text-xs font-medium text-[#a3b8ad] hover:text-[#f4f7f5] transition-colors"
          >
            Kembali ke Beranda
          </Link>
        </div>
      </header>

      {/* Main Split Content */}
      <main className="flex-1 flex items-center">
        <div className="max-w-6xl w-full mx-auto px-5 sm:px-8 py-10 sm:py-14 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          {/* Left Side: Bold Headline + Custom 3D Finance Visual */}
          <div className="lg:col-span-6 space-y-6">
            <div className="space-y-3">
              <h1
                className="font-display text-4xl sm:text-5xl lg:text-6xl leading-[0.95] tracking-tight text-[#f4f7f5]"
                style={{ textShadow: "3px 3px 0 #064e3b" }}
              >
                MASUK KE
                <br />
                <span className="text-[#34d399]">AKUN KAMU.</span>
              </h1>
              <p className="text-sm sm:text-base text-[#a3b8ad] max-w-md leading-relaxed">
                Pantau saldo bebas, pos tabungan, piutang, dan simulasi wishlist pribadi Anda secara real-time.
              </p>
            </div>

            <div className="overflow-hidden rounded-sm border border-[#10b981]/25 bg-[#0e1412] shadow-[0_24px_60px_-20px_rgba(16,185,129,0.22)]">
              <div className="aspect-[16/9] overflow-hidden">
                <img
                  src="/images/auth-finance-3d.jpg"
                  alt="Ilustrasi 3D kartu catatan keuangan dan brankas tabungan KasKu"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>

          {/* Right Side: Framed Login Card */}
          <div className="lg:col-span-6 flex justify-center lg:justify-end">
            <div className="w-full max-w-md rounded-sm bg-[#10b981]/12 p-4 sm:p-6 border border-[#10b981]/20">
              <div className="rounded-sm border border-[#f4f7f5]/20 bg-[#0e1412] p-6 sm:p-7">
                <h2 className="font-display text-2xl tracking-tight text-[#34d399] mb-5">
                  MASUK
                </h2>

                {error && (
                  <div className="mb-4 rounded-sm border border-red-500/40 bg-red-950/40 px-3.5 py-2.5 text-xs text-red-200">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label htmlFor="email" className="block text-xs font-medium text-[#f4f7f5]">
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
                        className="w-full rounded-sm border border-[#f4f7f5]/20 bg-[#070a09] pl-10 pr-3 py-2.5 text-sm text-[#f4f7f5] placeholder:text-[#a3b8ad]/45 focus:border-[#10b981] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="password" className="block text-xs font-medium text-[#f4f7f5]">
                      Kata sandi
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
                        placeholder="Minimal 8 karakter"
                        className="w-full rounded-sm border border-[#f4f7f5]/20 bg-[#070a09] pl-10 pr-10 py-2.5 text-sm text-[#f4f7f5] placeholder:text-[#a3b8ad]/45 focus:border-[#10b981] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a3b8ad] hover:text-[#f4f7f5]"
                        aria-label={showPassword ? "Sembunyikan kata sandi" : "Lihat kata sandi"}
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
                    <span>{loading ? "Memproses..." : "Masuk"}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>

                <div className="mt-5 pt-4 border-t border-[#f4f7f5]/10 text-xs text-[#a3b8ad]">
                  Belum punya akun?{" "}
                  <Link href="/register" className="text-[#34d399] hover:underline font-medium">
                    Daftar
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
