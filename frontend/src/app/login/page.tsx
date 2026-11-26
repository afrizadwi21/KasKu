"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, Mail, User } from "lucide-react";
import { getStoredAccessToken, loginUser } from "../../lib/api";
import { getZodErrorMessage, loginSchema } from "../../lib/schemas";

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
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(getZodErrorMessage(parsed.error));
      return;
    }
    setLoading(true);
    try {
      await loginUser(parsed.data.email, parsed.data.password);
      router.replace("/dashboard");
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal masuk. Periksa kembali email dan kata sandi."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070a09] flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-5xl rounded-2xl overflow-hidden border border-[#10b981]/20 bg-[#0e1412] shadow-[0_30px_80px_-20px_rgba(16,185,129,0.22)] grid grid-cols-1 lg:grid-cols-12">
        {/* Left Panel: Clean Light Form Surface */}
        <div className="lg:col-span-5 bg-[#f7f8f7] text-[#0b110e] p-7 sm:p-10 flex flex-col justify-between">
          {/* Brand */}
          <Link href="/" className="inline-flex items-center gap-2.5 w-fit">
            <svg width="26" height="26" viewBox="0 0 28 28" fill="none" aria-hidden="true">
              <rect width="28" height="28" rx="6" fill="#070a09" />
              <path
                d="M9 8.5V19.5M9 14L17.5 8.5M12.5 11.8L18.5 19.5"
                stroke="#10b981"
                strokeWidth="2.2"
                strokeLinecap="square"
              />
            </svg>
            <span className="font-display text-lg tracking-tight text-[#0b110e]">
              KasKu
            </span>
          </Link>

          {/* Center Form */}
          <div className="my-8 space-y-6">
            <div className="flex flex-col items-center">
              <div className="h-16 w-16 rounded-full bg-[#070a09] border-2 border-[#10b981] flex items-center justify-center text-[#34d399] shadow-md">
                <User className="w-7 h-7" />
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-red-300 bg-red-50 px-3.5 py-2.5 text-xs text-red-700 text-center">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="relative">
                <Mail className="w-4 h-4 text-[#47544d] absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="EMAIL"
                  className="w-full rounded-full border border-[#0b110e]/25 bg-white pl-11 pr-4 py-2.5 text-xs sm:text-sm text-[#0b110e] placeholder:text-[#47544d]/70 placeholder:text-[11px] placeholder:tracking-wider focus:border-[#059669] focus:outline-none"
                />
              </div>

              <div className="relative">
                <Lock className="w-4 h-4 text-[#47544d] absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="KATA SANDI"
                  className="w-full rounded-full border border-[#0b110e]/25 bg-white pl-11 pr-10 py-2.5 text-xs sm:text-sm text-[#0b110e] placeholder:text-[#47544d]/70 placeholder:text-[11px] placeholder:tracking-wider focus:border-[#059669] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#47544d] hover:text-[#0b110e]"
                  aria-label={showPassword ? "Sembunyikan kata sandi" : "Lihat kata sandi"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-[#059669] hover:bg-[#10b981] disabled:opacity-60 py-2.5 text-xs font-semibold tracking-widest uppercase text-white transition-colors cursor-pointer"
              >
                {loading ? "MEMPROSES..." : "MASUK"}
              </button>
            </form>

            <p className="text-center text-xs text-[#47544d]">
              Belum punya akun?{" "}
              <Link href="/register" className="font-semibold text-[#059669] hover:underline">
                Daftar sekarang
              </Link>
            </p>
          </div>

          {/* Bottom 3 Dots */}
          <div className="flex items-center justify-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#0b110e]" />
            <span className="h-1.5 w-1.5 rounded-full bg-[#0b110e]/40" />
            <span className="h-1.5 w-1.5 rounded-full bg-[#0b110e]/20" />
          </div>
        </div>

        {/* Right Panel: Obsidian & Emerald Visual + Welcome Overlay */}
        <div className="lg:col-span-7 relative min-h-[340px] lg:min-h-[540px] flex flex-col justify-between p-7 sm:p-10 text-[#f4f7f5] overflow-hidden">
          <img
            src="/images/auth-finance-3d.jpg"
            alt="Ilustrasi 3D keuangan pribadi KasKu"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#070a09]/95 via-[#070a09]/45 to-[#070a09]/70" />

          {/* Top Nav inside Visual Panel */}
          <div className="relative z-10 flex items-center justify-end gap-5 text-xs font-medium text-[#a3b8ad]">
            <Link href="/" className="hover:text-[#f4f7f5] transition-colors">
              Beranda
            </Link>
            <Link href="/#fitur" className="hover:text-[#f4f7f5] transition-colors">
              Fitur
            </Link>
            <Link
              href="/register"
              className="rounded-full bg-[#10b981] px-4 py-1.5 text-[#070a09] font-semibold hover:bg-[#34d399] transition-colors"
            >
              Daftar
            </Link>
          </div>

          {/* Bottom-Right Welcome Text */}
          <div className="relative z-10 mt-auto text-right max-w-md ml-auto space-y-2.5">
            <h1 className="font-display text-4xl sm:text-5xl tracking-tight text-[#f4f7f5]">
              Selamat Datang<span className="text-[#10b981]">.</span>
            </h1>
            <p className="text-xs sm:text-sm text-[#a3b8ad] leading-relaxed">
              Kelola uang masuk, pos tabungan, piutang, dan simulasi belanja wishlist Anda dalam satu ruang pribadi yang tenang.
            </p>
            <div className="pt-1 text-xs text-[#a3b8ad]">
              Pengguna baru?{" "}
              <Link href="/register" className="text-[#34d399] font-semibold hover:underline">
                Buat akun sekarang
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
