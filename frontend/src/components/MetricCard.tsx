import React from "react";

interface MetricCardProps {
  title: string;
  value: number;
  subtitle?: string;
  badgeText?: string;
  badgeVariant?: "income" | "expense" | "warning" | "neutral";
  tooltip?: string;
  isDark?: boolean;
}

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function MetricCard({
  title,
  value,
  subtitle,
  badgeText,
  badgeVariant = "neutral",
  isDark = false,
}: MetricCardProps) {
  const badgeStyles = isDark
    ? {
        income: "bg-[#10b981]/15 text-[#34d399] border-[#10b981]/30",
        expense: "bg-red-950/50 text-red-400 border-red-800/60",
        warning: "bg-amber-950/50 text-amber-400 border-amber-800/60",
        neutral: "bg-[#121c18] text-[#a3b8ad] border-[#f4f7f5]/15",
      }
    : {
        income: "bg-emerald-50 text-emerald-700 border-emerald-200",
        expense: "bg-red-50 text-red-700 border-red-200",
        warning: "bg-amber-50 text-amber-700 border-amber-200",
        neutral: "bg-zinc-50 text-zinc-700 border-zinc-200",
      };

  return (
    <div
      className={`flex flex-col justify-between rounded-xl border p-4 shadow-xs transition-colors ${
        isDark
          ? "border-[#f4f7f5]/10 bg-[#0e1412] text-[#f4f7f5]"
          : "border-[#0b110e]/10 bg-white text-[#0b110e]"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={`text-xs font-medium ${
            isDark ? "text-[#a3b8ad]" : "text-[#47544d]"
          }`}
        >
          {title}
        </span>
        {badgeText && (
          <span
            className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badgeStyles[badgeVariant]}`}
          >
            {badgeText}
          </span>
        )}
      </div>

      <div className="mt-3">
        <div className="text-2xl font-bold tracking-tight font-mono num-tabular">
          {formatRupiah(value)}
        </div>
        {subtitle && (
          <p
            className={`mt-1 text-[11px] ${
              isDark ? "text-[#a3b8ad]" : "text-[#47544d]"
            }`}
          >
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
