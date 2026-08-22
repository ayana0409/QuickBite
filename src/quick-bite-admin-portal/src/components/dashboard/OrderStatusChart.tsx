import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { PieChart as PieIcon, AlertCircle } from 'lucide-react';
import type { OrderStatusPoint } from '../../services/adminDashboardService';

interface OrderStatusChartProps {
  data: OrderStatusPoint[];
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length > 0) {
    const item = payload[0].payload as OrderStatusPoint;
    return (
      <div className="bg-slate-900/95 border border-slate-700/80 rounded-xl p-3 shadow-2xl backdrop-blur-md text-xs space-y-1 min-w-[150px]">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-1">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: item.color }}
          />
          <span className="font-bold text-slate-200">{item.name || item.status}</span>
        </div>
        <div className="flex items-center justify-between text-slate-300">
          <span className="text-slate-400">Số lượng:</span>
          <span className="font-bold text-slate-100">{item.count} đơn</span>
        </div>
        <div className="flex items-center justify-between text-slate-300">
          <span className="text-slate-400">Tỉ lệ:</span>
          <span className="font-extrabold text-amber-400">{item.percentage}%</span>
        </div>
      </div>
    );
  }
  return null;
};

export const OrderStatusChart: React.FC<OrderStatusChartProps> = ({
  data,
  isLoading = false,
  error = null,
  onRetry,
}) => {
  if (isLoading) {
    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between h-[380px] animate-pulse">
        <div className="w-40 h-6 bg-slate-800 rounded" />
        <div className="w-40 h-40 mx-auto rounded-full bg-slate-800/50" />
        <div className="space-y-2 mt-4">
          <div className="w-full h-3.5 bg-slate-800 rounded" />
          <div className="w-3/4 h-3.5 bg-slate-800 rounded" />
        </div>
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
          <h4 className="font-bold text-slate-200">Không thể tải tỉ lệ đơn hàng</h4>
          <p className="text-xs text-rose-400 mt-1 max-w-xs">{error}</p>
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

  // Filter out items with 0 count to keep donut clean, unless all are 0
  const activeItems = data.filter((d) => d.count > 0);
  const chartData = activeItems.length > 0 ? activeItems : data;
  const totalOrders = data.reduce((sum, d) => sum + (Number(d.count) || 0), 0);

  return (
    <div className="bg-slate-900/80 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-6 shadow-xl transition-all duration-300 flex flex-col justify-between h-full min-h-[380px]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg border border-purple-500/20">
            <PieIcon className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-base text-slate-100">
            Trạng thái Đơn hàng
          </h3>
        </div>
        <span className="text-xs font-extrabold text-slate-400 bg-slate-950 px-2.5 py-1 rounded-full border border-slate-800">
          {totalOrders} đơn
        </span>
      </div>

      {/* Donut Chart */}
      <div className="relative w-full h-44 my-2 flex items-center justify-center">
        {chartData.length === 0 ? (
          <p className="text-xs text-slate-500">Chưa có dữ liệu trạng thái</p>
        ) : (
          <>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip content={<CustomTooltip />} />
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="count"
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color || '#64748b'}
                      stroke="#0f172a"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            {/* Centered Donut Total Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Tổng cộng
              </span>
              <span className="text-base font-black text-slate-100">
                {totalOrders}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Legend List */}
      <div className="space-y-1.5 pt-2 border-t border-slate-800/60 max-h-32 overflow-y-auto pr-1">
        {data.map((item, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-slate-950/40 hover:bg-slate-950/80 transition"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-slate-300 font-medium truncate">
                {item.name || item.status}
              </span>
            </div>
            <div className="flex items-center gap-2 text-slate-400 shrink-0 font-mono">
              <span className="font-semibold text-slate-200">{item.count}</span>
              <span className="text-[10px] text-slate-500">({item.percentage}%)</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
