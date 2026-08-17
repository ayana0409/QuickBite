import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingBag,
  AlertTriangle,
  Star,
  ArrowRight,
  Clock,
  CheckCircle2,
  ChevronRight,
  Store,
  Calendar,
  UtensilsCrossed,
  Boxes,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { useAuthStore } from '../../stores/authStore';
import { orderService } from '../../services/orderService';

// ==========================================
// 1. TYPE DEFINITIONS & FALLBACK MOCK DATA
// ==========================================

export interface KpiItem {
  id: string;
  label: string;
  value: string;
  change: string;
  isPositive: boolean;
  subText: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: 'orange' | 'emerald' | 'rose' | 'amber';
}

export interface RevenueDataPoint {
  date: string;
  dayName: string;
  revenue: number;
  ordersCount: number;
}

export interface CancelReasonDataPoint {
  name: string;
  value: number;
  color: string;
  count: number;
}

export interface RecentOrder {
  id: string;
  orderCode: string;
  customerName: string;
  itemsSummary: string;
  itemsCount: number;
  time: string;
  total: number;
  status: string;
}

// Fallback 7-Day Revenue Data
const fallbackRevenueData: RevenueDataPoint[] = [
  { date: '11/08', dayName: 'T2', revenue: 1850000, ordersCount: 32 },
  { date: '12/08', dayName: 'T3', revenue: 2100000, ordersCount: 38 },
  { date: '13/08', dayName: 'T4', revenue: 1950000, ordersCount: 35 },
  { date: '14/08', dayName: 'T5', revenue: 2750000, ordersCount: 48 },
  { date: '15/08', dayName: 'T6', revenue: 3200000, ordersCount: 56 },
  { date: '16/08', dayName: 'T7', revenue: 3650000, ordersCount: 64 },
  { date: '17/08', dayName: 'CN', revenue: 2580000, ordersCount: 45 },
];

// Fallback Cancel Reason Breakdown
const fallbackCancelReasonData: CancelReasonDataPoint[] = [
  { name: 'Khách đổi ý', value: 40, color: '#f97316', count: 8 },
  { name: 'Hết món ăn', value: 30, color: '#ef4444', count: 6 },
  { name: 'Quán đóng cửa', value: 20, color: '#eab308', count: 4 },
  { name: 'Lý do khác', value: 10, color: '#64748b', count: 2 },
];

// Helper format currency
const formatCurrency = (val: number): string => {
  return val.toLocaleString('vi-VN') + ' ₫';
};

// Helper format short millions for chart axes
const formatShortMillions = (val: number): string => {
  if (val >= 1000000) {
    return (val / 1000000).toFixed(1) + 'Tr';
  }
  if (val >= 1000) {
    return (val / 1000).toFixed(0) + 'K';
  }
  return val.toString();
};

// Helper Status Badge
const renderStatusBadge = (status: string) => {
  const normalized = status.toUpperCase();
  switch (normalized) {
    case 'PENDING':
    case 'WAITINGPAYMENT':
    case 'WAITINGSTOCK':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          Chờ Duyệt
        </span>
      );
    case 'PREPARING':
    case 'CONFIRMED':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
          Đang Làm Món
        </span>
      );
    case 'DELIVERING':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" />
          Đang Giao
        </span>
      );
    case 'COMPLETED':
    case 'DELIVERED':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          Hoàn Thành
        </span>
      );
    case 'CANCELLED':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
          Đã Hủy
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-300">
          {status}
        </span>
      );
  }
};

// ==========================================
// 2. MAIN COMPONENT: MerchantDashboardPage
// ==========================================

export default function MerchantDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [chartType, setChartType] = useState<'area' | 'bar'>('area');

  // Fetch real-time dashboard data via API Gateway (GET /api/merchant/dashboard)
  const { data: dashboardData, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['merchant-dashboard'],
    queryFn: () => orderService.getMerchantDashboard(),
    refetchInterval: 30000, // Auto refresh every 30s
    staleTime: 15000,
  });

  // Extract or fallback data
  const kpiRaw = dashboardData?.kpiSummary;
  const revenueData: RevenueDataPoint[] = dashboardData?.revenueData?.length
    ? dashboardData.revenueData
    : fallbackRevenueData;
  const cancelReasonData: CancelReasonDataPoint[] = dashboardData?.cancelReasonData?.length
    ? dashboardData.cancelReasonData
    : fallbackCancelReasonData;
  const recentOrders: RecentOrder[] = dashboardData?.recentOrders ?? [];

  // Formatted KPI Summary items
  const kpiItems: KpiItem[] = [
    {
      id: 'revenue',
      label: 'Doanh Thu Hôm Nay',
      value: formatCurrency(kpiRaw?.revenueToday ?? 2580000),
      change: kpiRaw?.revenueChange ?? '+12.5%',
      isPositive: kpiRaw?.isRevenuePositive ?? true,
      subText: `so với hôm qua (${formatCurrency(kpiRaw?.revenueYesterday ?? 2290000)})`,
      icon: DollarSign,
      accentColor: 'orange',
    },
    {
      id: 'orders',
      label: 'Tổng Đơn Hôm Nay',
      value: `${kpiRaw?.ordersToday ?? 45} đơn`,
      change: kpiRaw?.ordersChange ?? '+8.2%',
      isPositive: kpiRaw?.isOrdersPositive ?? true,
      subText: `so với hôm qua (${kpiRaw?.ordersYesterday ?? 41} đơn)`,
      icon: ShoppingBag,
      accentColor: 'emerald',
    },
    {
      id: 'cancel_rate',
      label: 'Tỷ Lệ Hủy Đơn',
      value: `${kpiRaw?.cancelRateToday ?? 4.4}%`,
      change: kpiRaw?.cancelRateChange ?? '-1.5%',
      isPositive: kpiRaw?.isCancelRatePositive ?? true,
      subText: `so với hôm qua (${kpiRaw?.cancelRateYesterday ?? 5.9}%)`,
      icon: AlertTriangle,
      accentColor: 'rose',
    },
    {
      id: 'rating',
      label: 'Đánh Giá Trung Bình',
      value: `${kpiRaw?.averageRating ?? 4.8} ★`,
      change: kpiRaw?.ratingChange ?? '+0.2',
      isPositive: true,
      subText: `dựa trên ${kpiRaw?.totalReviews ?? 128} lượt đánh giá`,
      icon: Star,
      accentColor: 'amber',
    },
  ];

  // Total 7-day revenue calculation
  const total7DayRevenue = revenueData.reduce((acc, cur) => acc + (cur.revenue || 0), 0);
  const totalCancelledCount = cancelReasonData.reduce((acc, cur) => acc + (cur.count || 0), 0);

  return (
    <div className="space-y-6">
      {/* ---------------------------------------------------- */}
      {/* HEADER BANNER                                         */}
      {/* ---------------------------------------------------- */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800/80 rounded-3xl p-6 sm:p-7 shadow-2xl">
        {/* Glow ambient background elements */}
        <div className="absolute -top-16 -right-16 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 left-1/3 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-orange-500/20 to-red-500/20 text-orange-300 border border-orange-500/30 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-orange-400" />
                Merchant Dashboard
              </span>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                Hôm nay, {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-100 tracking-tight">
              Xin chào, <span className="bg-gradient-to-r from-orange-400 to-amber-300 bg-clip-text text-transparent">{user?.fullName || user?.username || 'Đối Tác Quán'}</span> 🍳
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
              Theo dõi tình hình kinh doanh, doanh thu thời gian thực và xử lý nhanh các đơn hàng mới trong ngày.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              title="Làm mới dữ liệu từ Gateway"
              className="p-2.5 bg-slate-950/80 hover:bg-slate-800 text-slate-300 hover:text-orange-400 rounded-2xl border border-slate-800 transition-all cursor-pointer shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin text-orange-400' : ''}`} />
            </button>

            <div className="flex items-center gap-2 bg-slate-950/80 px-3.5 py-2 rounded-2xl border border-slate-800 text-xs font-semibold text-slate-300">
              <Store className="w-4 h-4 text-emerald-400" />
              <span>Quán: <strong className="text-emerald-400">Đang Mở Cửa</strong></span>
            </div>

            <button
              onClick={() => navigate('/merchant/menu')}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-2xl border border-slate-700 transition-all cursor-pointer shadow-sm"
            >
              <UtensilsCrossed className="w-3.5 h-3.5 text-orange-400" />
              Thực Đơn
            </button>

            <button
              onClick={() => navigate('/merchant/inventory')}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-2xl border border-slate-700 transition-all cursor-pointer shadow-sm"
            >
              <Boxes className="w-3.5 h-3.5 text-cyan-400" />
              Kho Hàng
            </button>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* PART 1: 4 KPI CARDS                                  */}
      {/* ---------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {kpiItems.map((kpi) => {
          const Icon = kpi.icon;
          
          const colorStyles = {
            orange: {
              gradient: 'from-orange-500/20 to-red-500/20 text-orange-400 border-orange-500/30',
              hoverBorder: 'hover:border-orange-500/40',
            },
            emerald: {
              gradient: 'from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/30',
              hoverBorder: 'hover:border-emerald-500/40',
            },
            rose: {
              gradient: 'from-rose-500/20 to-pink-500/20 text-rose-400 border-rose-500/30',
              hoverBorder: 'hover:border-rose-500/40',
            },
            amber: {
              gradient: 'from-amber-500/20 to-yellow-500/20 text-amber-400 border-amber-500/30',
              hoverBorder: 'hover:border-amber-500/40',
            },
          }[kpi.accentColor];

          return (
            <div
              key={kpi.id}
              className={`bg-slate-900/80 backdrop-blur-sm border border-slate-800/90 rounded-2xl p-5 shadow-xl relative overflow-hidden transition-all duration-200 group ${colorStyles.hoverBorder}`}
            >
              {/* Background Faint Icon Watermark */}
              <div className="absolute -right-4 -bottom-4 text-slate-800/20 group-hover:text-slate-800/40 transition-colors pointer-events-none">
                <Icon className="w-24 h-24" />
              </div>

              <div className="relative z-10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className={`p-2.5 rounded-xl border ${colorStyles.gradient} shadow-inner`}>
                    <Icon className="w-5 h-5" />
                  </div>

                  {/* Growth / Trend Tag */}
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-black px-2 py-0.5 rounded-full border ${
                      kpi.isPositive
                        ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                        : 'text-rose-400 bg-rose-500/10 border-rose-500/20'
                    }`}
                  >
                    {kpi.isPositive ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    {kpi.change}
                  </span>
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-400">{kpi.label}</p>
                  <p className="text-2xl font-black text-slate-100 font-mono mt-0.5 tracking-tight">
                    {isLoading ? '...' : kpi.value}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1 truncate">
                    {kpi.subText}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ---------------------------------------------------- */}
      {/* PART 2: CHARTS SECTION (2:1 Grid Layout)              */}
      {/* ---------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* BIG CHART (LEFT, lg:col-span-2): 7-Day Revenue Area/Bar Chart */}
        <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-slate-100">
                  Biểu Đồ Doanh Thu 7 Ngày Gần Nhất
                </h3>
                <span className="text-[11px] font-bold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-md border border-orange-500/20">
                  F&B Analytics
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Tổng doanh thu tuần này: <strong className="text-slate-200 font-mono">{formatCurrency(total7DayRevenue)}</strong>
              </p>
            </div>

            {/* Toggle Area / Bar chart */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setChartType('area')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  chartType === 'area'
                    ? 'bg-orange-500 text-slate-950 shadow-md shadow-orange-500/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Đường Vùng (Area)
              </button>
              <button
                type="button"
                onClick={() => setChartType('bar')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  chartType === 'bar'
                    ? 'bg-orange-500 text-slate-950 shadow-md shadow-orange-500/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Cột (Bar)
              </button>
            </div>
          </div>

          {/* Chart Container */}
          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'area' ? (
                <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#334155' }}
                    tickFormatter={(val, idx) => `${val} (${revenueData[idx]?.dayName || ''})`}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={formatShortMillions}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '16px',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
                      fontSize: '12px',
                      color: '#f8fafc',
                    }}
                    formatter={(val: any) => [formatCurrency(Number(val)), 'Doanh thu']}
                    labelFormatter={(label: any) => `Ngày: ${label}`}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#f97316"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#revenueGradient)"
                    dot={{ fill: '#f97316', r: 4, strokeWidth: 2, stroke: '#0f172a' }}
                    activeDot={{ r: 6, fill: '#ffedd5', stroke: '#ea580c', strokeWidth: 2 }}
                  />
                </AreaChart>
              ) : (
                <BarChart data={revenueData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#334155' }}
                    tickFormatter={(val, idx) => `${val} (${revenueData[idx]?.dayName || ''})`}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={formatShortMillions}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '16px',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
                      fontSize: '12px',
                      color: '#f8fafc',
                    }}
                    formatter={(val: any) => [formatCurrency(Number(val)), 'Doanh thu']}
                    labelFormatter={(label: any) => `Ngày: ${label}`}
                  />
                  <Bar dataKey="revenue" fill="#f97316" radius={[6, 6, 0, 0]} maxBarSize={36} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* SMALL CHART (RIGHT, lg:col-span-1): Cancel Reason Donut PieChart */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
          <div className="pb-3 border-b border-slate-800">
            <h3 className="font-extrabold text-base text-slate-100 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              Lý Do Hủy Đơn Hàng
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Phân tích nguyên nhân hủy đơn 7 ngày gần nhất
            </p>
          </div>

          {/* Donut Chart Container */}
          <div className="h-56 w-full relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={cancelReasonData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {cancelReasonData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color || '#f97316'} stroke="#0f172a" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '12px',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
                    fontSize: '11px',
                    color: '#f8fafc',
                  }}
                  formatter={(val: any) => [`${val}%`, 'Tỷ lệ']}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Donut Center text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Tổng hủy</span>
              <span className="text-xl font-black text-rose-400 font-mono">{totalCancelledCount} đơn</span>
            </div>
          </div>

          {/* Legend Table */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80">
            {cancelReasonData.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: item.color || '#f97316' }}
                />
                <span className="text-slate-300 font-medium truncate">{item.name}:</span>
                <span className="font-mono font-bold text-slate-100 ml-auto">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* PART 3: RECENT ORDERS TABLE (Đơn Hàng Cần Xử Lý)     */}
      {/* ---------------------------------------------------- */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        {/* Table Header with "Xem tất cả" button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-base text-slate-100 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
                Đơn Hàng Mới Nhất Cần Xử Lý
              </h3>
              <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 text-[10px] font-black rounded-full border border-amber-500/30">
                {recentOrders.length} Đơn Gần Nhất
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Danh sách đơn đặt món mới cần xác nhận và chuẩn bị chế biến
            </p>
          </div>

          <button
            onClick={() => navigate('/merchant/orders')}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-orange-500/10 to-red-500/10 hover:from-orange-500/20 hover:to-red-500/20 text-orange-400 hover:text-orange-300 text-xs font-bold rounded-xl border border-orange-500/30 transition-all cursor-pointer self-start sm:self-auto"
          >
            <span>Xem tất cả đơn hàng</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Responsive Table Container */}
        <div className="overflow-x-auto custom-scrollbar">
          {recentOrders.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <ShoppingBag className="w-10 h-10 mx-auto text-slate-600 opacity-50" />
              <p className="text-sm font-semibold">Chưa có đơn hàng nào cần xử lý</p>
              <p className="text-xs text-slate-500">Các đơn đặt món mới từ khách hàng sẽ xuất hiện ngay tại đây.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400 bg-slate-950/40">
                  <th className="py-3 px-4 font-bold rounded-l-xl">Mã Đơn</th>
                  <th className="py-3 px-4 font-bold">Khách Hàng</th>
                  <th className="py-3 px-4 font-bold">Món Đặt</th>
                  <th className="py-3 px-4 font-bold">Thời Gian</th>
                  <th className="py-3 px-4 font-bold">Tổng Tiền</th>
                  <th className="py-3 px-4 font-bold">Trạng Thái</th>
                  <th className="py-3 px-4 font-bold text-right rounded-r-xl">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {recentOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                    onClick={() => navigate('/merchant/orders')}
                  >
                    {/* Order Code */}
                    <td className="py-3.5 px-4 font-mono font-black text-orange-400">
                      #{order.orderCode}
                    </td>

                    {/* Customer */}
                    <td className="py-3.5 px-4 font-bold text-slate-200">
                      {order.customerName}
                    </td>

                    {/* Items summary */}
                    <td className="py-3.5 px-4 text-slate-300 max-w-xs truncate">
                      <span className="text-slate-100 font-medium">{order.itemsSummary}</span>
                      <span className="text-[10px] text-slate-500 block">({order.itemsCount} món)</span>
                    </td>

                    {/* Time */}
                    <td className="py-3.5 px-4 text-slate-400 font-medium">
                      {order.time}
                    </td>

                    {/* Total */}
                    <td className="py-3.5 px-4 font-mono font-black text-slate-100">
                      {formatCurrency(order.total)}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4">
                      {renderStatusBadge(order.status)}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate('/merchant/orders');
                        }}
                        className="p-1.5 text-slate-400 hover:text-orange-400 hover:bg-slate-800 rounded-lg transition-colors inline-flex items-center gap-1 font-bold text-xs cursor-pointer"
                      >
                        <span>Chi tiết</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
