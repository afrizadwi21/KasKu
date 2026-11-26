import type { Metadata } from "next";
import { Archivo, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "KasKu Finance — Manajemen Keuangan Pribadi yang Presisi",
  description: "Catat arus kas, pisahkan saldo bebas & pos tabungan, simulasikan wishlist sebelum beli, dan pantau kekayaan bersih secara real-time.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${archivo.variable} ${geistSans.variable} ${geistMono.variable} h-full antialiased scroll-smooth`}>
      <body className="min-h-full flex flex-col bg-[var(--surface-canvas)] text-[var(--text-primary)] selection:bg-[var(--accent-primary)] selection:text-white">
        {children}
      </body>
    </html>
  );
}
