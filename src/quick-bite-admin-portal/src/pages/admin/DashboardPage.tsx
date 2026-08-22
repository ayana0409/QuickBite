import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/authStore';
import { toast } from '../../stores/toastStore';
import { Store, ShoppingBag, DollarSign, ShieldCheck, RefreshCw, Database } from 'lucide-react';
import { adminDashboardService } from '../../services/adminDashboardService';
import { StatCard } from '../../components/dashboard/StatCard';
import { RevenueChart } from '../../components/dashboard/RevenueChart';
import { OrderStatusChart } from '../../components/dashboard/OrderStatusChart';
import { SystemHealthCard } from '../../components/dashboard/SystemHealthCard';

export default function AdminDashboardPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [isResetting, setIsResetting] = useState(false);

  // 1. Fetch Real-time Overview Statistics (Cached on Gateway)
  const {
    data: overviewStats,
    isLoading: isOverviewLoading,
    error: overviewError,
  } = useQuery({
    queryKey: ['admin-overview-stats'],
    queryFn: () => adminDashboardService.getOverviewStats(),
    staleTime: 60000, // 1 minute
  });

  // 2. Fetch 30-day Revenue and Order Status Charts Data (Cached on Gateway)
  const {
    data: chartsData,
    isLoading: isChartsLoading,
    error: chartsError,
    refetch: refetchCharts,
  } = useQuery({
    queryKey: ['admin-charts-data'],
    queryFn: () => adminDashboardService.getChartsData(),
    staleTime: 60000,
  });

  // Handle manual cache reset on Gateway
  const handleResetCache = async () => {
    setIsResetting(true);
    try {
      await adminDashboardService.resetStatsCache();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-overview-stats'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-charts-data'] }),
      ]);
      toast.success('Đã xóa cache và tính toán lại toàn bộ dữ liệu thống kê từ Backend!');
    } catch (err: any) {
      toast.error(err.message || 'Không thể làm mới dữ liệu thống kê');
    } finally {
      setIsResetting(false);
    }
  };

  // Format overview metrics
  const totalActiveRestaurants = overviewStats?.totalActiveRestaurants ?? 0;
  const todayOrders = overviewStats?.todayOrders ?? 0;
  const totalRevenue = overviewStats?.totalSystemRevenue ?? 0;
  const cachedAt = overviewStats?.cachedAt || chartsData?.cachedAt;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-800 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40">
                System Administrator
              </span>
              <span className="text-xs text-slate-400">ID: {user?.id || 'admin'}</span>
            </div>
            <h1 className="text-2xl font-black text-slate-100">
              Chào mừng trở lại, {user?.fullName || user?.username || 'Admin'}! 👋
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Trang tổng quan phân tích dữ liệu vận hành và tình trạng hạ tầng Microservices QuickBite.
            </p>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Cache Status Badge */}
            <div className="flex items-center gap-1.5 bg-slate-950/80 px-3 py-2 rounded-xl border border-slate-800 text-xs text-slate-400">
              <Database className="w-3.5 h-3.5 text-cyan-400" />
              <span>
                Gateway Cache:{' '}
                <strong className="text-slate-200">
                  {cachedAt ? new Date(cachedAt).toLocaleTimeString('vi-VN') : 'Active'}
                </strong>
              </span>
            </div>

            {/* Force Refresh Button */}
            <button
              onClick={handleResetCache}
              disabled={isResetting || isOverviewLoading || isChartsLoading}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 active:scale-95 text-slate-950 text-xs font-black rounded-xl shadow-lg shadow-amber-500/20 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
              <span>{isResetting ? 'Đang tính toán lại...' : 'Cập nhật số liệu mới'}</span>
            </button>

            <div className="hidden sm:flex items-center gap-2 bg-slate-950/70 p-2 rounded-xl border border-slate-800 text-xs font-semibold text-slate-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>ABP Identity</span>
            </div>
          </div>
        </div>
      </div>

      {/* Khu vực 1: Overview Cards (Grid 3 cột) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <StatCard
          label="Tổng Nhà Hàng Active"
          value={new Intl.NumberFormat('vi-VN').format(totalActiveRestaurants)}
          icon={Store}
          color="from-amber-500 to-orange-500"
          isLoading={isOverviewLoading}
          error={overviewError ? 'Không thể tải số lượng nhà hàng' : null}
          subtitle="Đang mở cửa kinh doanh"
        />

        <StatCard
          label="Đơn Hàng Hôm Nay"
          value={new Intl.NumberFormat('vi-VN').format(todayOrders)}
          icon={ShoppingBag}
          color="from-purple-500 to-indigo-500"
          isLoading={isOverviewLoading}
          error={overviewError ? 'Không thể tải đơn hôm nay' : null}
          subtitle="Đơn hàng phát sinh trong ngày"
        />

        <StatCard
          label="Tổng Doanh Thu Hệ Thống"
          value={adminDashboardService.formatCompactCurrency(totalRevenue)}
          icon={DollarSign}
          color="from-emerald-500 to-teal-500"
          isLoading={isOverviewLoading}
          error={overviewError ? 'Không thể tải doanh thu' : null}
          subtitle={`Chi tiết: ${adminDashboardService.formatCurrency(totalRevenue)}`}
        />
      </div>

      {/* Khu vực 2: Charts (Grid 2 cột: Cột trái 2/3 AreaChart, Cột phải 1/3 PieChart Donut) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        <div className="lg:col-span-2">
          <RevenueChart
            data={chartsData?.revenueChart || []}
            isLoading={isChartsLoading}
            error={chartsError ? 'Không thể tải dữ liệu biểu đồ doanh thu' : null}
            onRetry={() => refetchCharts()}
          />
        </div>

        <div className="lg:col-span-1">
          <OrderStatusChart
            data={chartsData?.orderStatusChart || []}
            isLoading={isChartsLoading}
            error={chartsError ? 'Không thể tải tỉ lệ trạng thái đơn' : null}
            onRetry={() => refetchCharts()}
          />
        </div>
      </div>

      {/* Khu vực 3: System Health (Tình trạng Hệ thống) */}
      <SystemHealthCard />
    </div>
  );
}
