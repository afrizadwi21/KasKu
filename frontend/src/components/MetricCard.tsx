import React from "react";

interface MetricCardProps {
  title: string;
  value: number;
  subtitle?: string;
  badgeText?: string;
  badgeVariant?: "income" | "expense" | "warning" | "neutral";
  tooltip?: string;
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
}: MetricCardProps) {
  const badgeStyles = {
    income: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60",
    expense: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800/60",
    warning: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/60",
    neutral: "bg-zinc-50 text-zinc-700 border-zinc-200 dark:bg-zinc-800/50 dark:text-zinc-300 dark:border-zinc-700/60",
  };

  return (
    <div className="flex flex-col justify-between rounded-xl border border-[#0b110e]/10 bg-white p-4 shadow-xs transition-colors dark:border-[#f4f7f5]/10 dark:bg-[#0e1412]">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-[#47544d] dark:text-[#a3b8ad]">
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
        <div className="text-2xl font-bold tracking-tight text-[#0b110e] dark:text-[#f4f7f5] font-mono num-tabular">
          {formatRupiah(value)}
        </div>
        {subtitle && (
          <p className="mt-1 text-[11px] text-[#47544d] dark:text-[#a3b8ad]">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
