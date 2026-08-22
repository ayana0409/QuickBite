import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, AlertCircle } from 'lucide-react';
import type { RevenueChartPoint } from '../../services/adminDashboardService';

interface RevenueChartProps {
  data: RevenueChartPoint[];
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

// Custom Tooltip for dark theme aesthetics
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length > 0) {
    const item = payload[0].payload as RevenueChartPoint;
    const formattedRevenue = new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(item.revenue || 0);

    return (
      <div className="bg-slate-900/95 border border-slate-700/80 rounded-xl p-3.5 shadow-2xl backdrop-blur-md text-xs space-y-1.5 min-w-[170px]">
        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
          <span className="font-bold text-slate-200">
            {item.dayName ? `${item.dayName}, ${label}` : label}
          </span>
          <span className="text-[10px] text-amber-400 font-extrabold uppercase bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
            30 Days
          </span>
        </div>
        <div className="flex items-center justify-between text-slate-300">
          <span className="text-slate-400">Doanh thu:</span>
          <span className="font-extrabold text-emerald-400">{formattedRevenue}</span>
        </div>
        <div className="flex items-center justify-between text-slate-300">
          <span className="text-slate-400">Số đơn hàng:</span>
          <span className="font-bold text-slate-100">{item.ordersCount ?? 0} đơn</span>
        </div>
      </div>
    );
  }
  return null;
};

export const RevenueChart: React.FC<RevenueChartProps> = ({
  data,
  isLoading = false,
  error = null,
  onRetry,
}) => {
  if (isLoading) {
    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between h-[380px] animate-pulse">
        <div className="flex items-center justify-between">
          <div className="w-48 h-6 bg-slate-800 rounded" />
          <div className="w-24 h-4 bg-slate-800 rounded" />
        </div>
        <div className="w-full h-56 bg-slate-800/50 rounded-xl" />
        <div className="w-32 h-4 bg-slate-800 rounded" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-900/80 border border-rose-500/30 rounded-2xl p-6 shadow-xl h-[380px] flex flex-col items-center justify-center text-center space-y-3">
        <div className="p-3.5 bg-rose-500/10 rounded-2xl border border-rose-500/20 text-rose-400">
          <AlertCircle className="w-8 h-8" />
        </div>
        <div>
          <h4 className="font-bold text-slate-200">Không thể tải biểu đồ doanh thu</h4>
          <p className="text-xs text-rose-400 mt-1 max-w-sm">{error}</p>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 rounded-xl border border-slate-700 transition"
          >
            Thử lại
          </button>
        )}
      </div>
    );
  }

  // Calculate 30-day aggregate sum for header context
  const totalPeriodRevenue = data.reduce((sum, d) => sum + (Number(d.revenue) || 0), 0);
  const totalPeriodOrders = data.reduce((sum, d) => sum + (Number(d.ordersCount) || 0), 0);

  const formatYAxis = (val: number) => {
    if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(0)}M`;
    if (val >= 1_000) return `${(val / 1_000).toFixed(0)}K`;
    return `${val}`;
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-6 shadow-xl transition-all duration-300 flex flex-col justify-between h-full min-h-[380px]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
              <TrendingUp className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-base text-slate-100">
              Xu hướng Doanh thu 30 ngày
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Tổng cộng: <span className="font-bold text-emerald-400">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(totalPeriodRevenue)}</span> ({totalPeriodOrders} đơn hàng)
          </p>
        </div>

        <span className="self-start sm:self-auto text-[11px] font-semibold text-slate-400 bg-slate-950 px-3 py-1 rounded-full border border-slate-800">
          Dữ liệu thời gian thực
        </span>
      </div>

      {/* Area Chart Container */}
      <div className="w-full h-64 mt-4">
        {data.length === 0 ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 text-xs">
            <p>Chưa có dữ liệu giao dịch trong 30 ngày qua</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              
              <XAxis
                dataKey="date"
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#334155' }}
                interval={data.length > 15 ? 4 : 'preserveEnd'}
              />

              <YAxis
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={formatYAxis}
              />

              <Tooltip content={<CustomTooltip />} />

              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#10b981"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#revenueGradient)"
                dot={false}
                activeDot={{ r: 5, fill: '#10b981', stroke: '#0f172a', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
