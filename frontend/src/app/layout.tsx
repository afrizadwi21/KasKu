import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "KasKu — Pencatat Keuangan Pribadi",
  description: "Aplikasi manajemen keuangan pribadi yang cepat, presisi, dan aman dengan pelacakan hutang, piutang, dan langganan.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[var(--surface-canvas)] text-[var(--text-primary)]">
        {children}
      </body>
    </html>
  );
}
