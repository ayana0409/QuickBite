import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { ArrowUpRight, ArrowDownRight, AlertCircle } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  change?: string;
  isPositive?: boolean;
  icon: LucideIcon;
  color: string;
  isLoading?: boolean;
  error?: string | null;
  subtitle?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  change,
  isPositive = true,
  icon: Icon,
  color,
  isLoading = false,
  error = null,
  subtitle,
}) => {
  if (isLoading) {
    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden animate-pulse">
        <div className="flex items-center justify-between">
          <div className="w-11 h-11 bg-slate-800 rounded-xl" />
          <div className="w-14 h-5 bg-slate-800 rounded-full" />
        </div>
        <div className="mt-4 space-y-2">
          <div className="w-24 h-3.5 bg-slate-800 rounded" />
          <div className="w-36 h-7 bg-slate-800 rounded" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-900/80 border border-rose-500/30 rounded-2xl p-5 shadow-xl relative overflow-hidden">
        <div className="flex items-center justify-between text-rose-400">
          <div className="p-3 bg-rose-500/10 rounded-xl font-bold border border-rose-500/20">
            <AlertCircle className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
            Lỗi tải dữ liệu
          </span>
        </div>
        <div className="mt-4">
          <p className="text-xs font-semibold text-slate-400">{label}</p>
          <p className="text-sm font-medium text-rose-300 mt-1 truncate">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/80 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-5 shadow-xl relative overflow-hidden group transition-all duration-300 hover:shadow-2xl hover:-translate-y-0.5">
      {/* Ambient background glow on hover */}
      <div className="absolute -top-12 -right-12 w-28 h-28 bg-white/5 rounded-full blur-2xl pointer-events-none group-hover:bg-white/10 transition-colors" />

      <div className="flex items-center justify-between relative z-10">
        <div
          className={`p-3 bg-gradient-to-br ${color} text-slate-950 rounded-xl font-bold shadow-lg shadow-black/20 group-hover:scale-105 transition-transform`}
        >
          <Icon className="w-5 h-5 text-slate-950" />
        </div>

        {change && (
          <span
            className={`flex items-center text-xs font-extrabold px-2 py-0.5 rounded-full border ${
              isPositive
                ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                : 'text-rose-400 bg-rose-500/10 border-rose-500/20'
            }`}
          >
            {change}
            {isPositive ? (
              <ArrowUpRight className="w-3 h-3 ml-0.5" />
            ) : (
              <ArrowDownRight className="w-3 h-3 ml-0.5" />
            )}
          </span>
        )}
      </div>

      <div className="mt-4 relative z-10">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
        <p className="text-2xl lg:text-3xl font-black text-slate-100 mt-1 tracking-tight">
          {value}
        </p>
        {subtitle && (
          <p className="text-[11px] text-slate-500 mt-1 font-medium">{subtitle}</p>
        )}
      </div>
    </div>
  );
};
