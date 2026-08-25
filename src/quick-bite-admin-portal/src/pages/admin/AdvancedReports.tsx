import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BarChart2,
  Calendar,
  Filter,
  Download,
  DollarSign,
  ShoppingBag,
  CheckCircle,
  XCircle,
  TrendingUp,
  Store,
  RefreshCw,
  Clock,
  Layers,
  FileSpreadsheet,
  AlertCircle,
  Search,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  advancedReportService,
  type ReportChartPoint,
  type ReportChartsResponse,
  type ReportDetailsResponse,
} from '../../services/advancedReportService';
import { Pagination } from '../../components/common/Pagination';
import { formatDateTime, formatVND } from '../../utils/dateHelper';
import { toast } from '../../stores/toastStore';
import type { OrderStatus } from '../../types';

interface FilterState {
  startDate: string;
  endDate: string;
  status: string;
  restaurantId: string;
}

export const AdvancedReports: React.FC = () => {
  // 1. Filter State (Draft local state, does not trigger API immediately)
  const [filterState, setFilterState] = useState<FilterState>({
    startDate: '2026-08-01',
    endDate: '2026-08-25',
    status: '',
    restaurantId: '',
  });

  // 2. Committed Filter State (Snapshot applied when clicking "Tạo Báo cáo")
  const [committedFilter, setCommittedFilter] = useState<FilterState>({
    startDate: '2026-08-01',
    endDate: '2026-08-25',
    status: '',
    restaurantId: '',
  });

  // 3. Pagination State
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(20);

  // 4. Data States (Strictly from real backend APIs)
  const [chartsData, setChartsData] = useState<ReportChartsResponse | null>(null);
  const [tableData, setTableData] = useState<ReportDetailsResponse>({
    data: [],
    totalCount: 0,
    totalPages: 0,
    page: 1,
    limit: 20,
  });

  // 5. Loading States (Separate loading indicators for UX)
  const [isChartsLoading, setIsChartsLoading] = useState<boolean>(true);
  const [isTableLoading, setIsTableLoading] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  /**
   * Fetch aggregated charts data based on committed filter
   */
  const fetchCharts = useCallback(async (filters: FilterState) => {
    setIsChartsLoading(true);
    try {
      const data = await advancedReportService.getReportsCharts({
        startDate: filters.startDate,
        endDate: filters.endDate,
        status: filters.status || undefined,
        restaurantId: filters.restaurantId || undefined,
      });
      setChartsData(data);
    } catch (error: any) {
      console.error('Failed to load report charts:', error);
      toast.error('Không thể tải dữ liệu biểu đồ phân tích.', 'Lỗi Dữ Liệu');
    } finally {
      setIsChartsLoading(false);
    }
  }, []);

  /**
   * Fetch paginated detailed orders table data based on committed filter & page
   */
  const fetchDetails = useCallback(async (filters: FilterState, pageNum: number, pageSize: number) => {
    setIsTableLoading(true);
    try {
      const data = await advancedReportService.getReportsDetails({
        startDate: filters.startDate,
        endDate: filters.endDate,
        status: filters.status || undefined,
        restaurantId: filters.restaurantId || undefined,
        page: pageNum,
        limit: pageSize,
      });
      setTableData(data);
    } catch (error: any) {
      console.error('Failed to load report details:', error);
      toast.error('Không thể tải danh sách bản ghi chi tiết.', 'Lỗi Dữ Liệu');
    } finally {
      setIsTableLoading(false);
    }
  }, []);

  // 1. Fetch Charts: Only triggers when committedFilter changes (NOT on page change)
  useEffect(() => {
    fetchCharts(committedFilter);
  }, [committedFilter, fetchCharts]);

  // 2. Fetch Table Details: Triggers on committedFilter OR page/limit change
  useEffect(() => {
    fetchDetails(committedFilter, page, limit);
  }, [committedFilter, page, limit, fetchDetails]);

  /**
   * Primary Action: Trigger API fetch for newly selected filters
   */
  const handleApplyFilter = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (filterState.startDate && filterState.endDate && filterState.startDate > filterState.endDate) {
      toast.warning('Ngày bắt đầu không được lớn hơn ngày kết thúc.', 'Bộ Lọc Không Hợp Lệ');
      return;
    }

    setPage(1); // Reset to page 1 on new filter apply
    setCommittedFilter({ ...filterState });
    toast.info('Đang tổng hợp báo cáo chuyên sâu...', 'Áp dụng bộ lọc');
  };

  /**
   * Reset filter to default
   */
  const handleResetFilter = () => {
    const defaultState: FilterState = {
      startDate: '2026-08-01',
      endDate: '2026-08-25',
      status: '',
      restaurantId: '',
    };
    setFilterState(defaultState);
    setPage(1);
    setCommittedFilter(defaultState);
  };

  /**
   * Secondary Action: Export currently loaded/filtered table records to CSV
   */
  const handleExportCsv = () => {
    if (!tableData.data || tableData.data.length === 0) {
      toast.warning('Không có dữ liệu đơn hàng nào để xuất báo cáo.', 'Thông Báo');
      return;
    }

    setIsExporting(true);
    try {
      const filename = `QuickBite_BaoCao_${committedFilter.startDate}_${committedFilter.endDate}.csv`;
      advancedReportService.exportToCsv(tableData.data, filename);
      toast.success(`Đã xuất thành công ${tableData.data.length} bản ghi ra tệp CSV!`, 'Xuất Báo Cáo');
    } catch (err: any) {
      console.error('Export CSV error:', err);
      toast.error('Không thể xuất tệp CSV. Vui lòng thử lại sau.', 'Lỗi Xuất File');
    } finally {
      setIsExporting(false);
    }
  };

  // Helper for Order Status Badge styling
  const renderStatusBadge = (status?: OrderStatus | string) => {
    const rawStatus = (status || '').toLowerCase();

    if (rawStatus === 'completed') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <CheckCircle className="w-3.5 h-3.5" /> Hoàn thành
        </span>
      );
    }

    if (rawStatus === 'cancelled' || rawStatus === 'refunded') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/20">
          <XCircle className="w-3.5 h-3.5" /> {rawStatus === 'refunded' ? 'Đã hoàn tiền' : 'Đã hủy'}
        </span>
      );
    }

    if (rawStatus === 'pending' || rawStatus === 'awaitingrestaurantacceptance' || rawStatus === 'confirmed') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
          <Clock className="w-3.5 h-3.5" /> Đang chờ duyệt
        </span>
      );
    }

    if (rawStatus === 'preparing' || rawStatus === 'delivering') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
          <TrendingUp className="w-3.5 h-3.5" /> Đang phục vụ
        </span>
      );
    }

    if (rawStatus === 'waitingpayment') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <Clock className="w-3.5 h-3.5" /> Chờ thanh toán
        </span>
      );
    }

    if (rawStatus === 'waitinginventory' || rawStatus === 'waitingstock') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
          <Clock className="w-3.5 h-3.5" /> Chờ kiểm kho
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700">
        {status || 'Draft'}
      </span>
    );
  };

  // Custom Tooltip for Stacked BarChart
  const CustomBarChartTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataPoint: ReportChartPoint = payload[0]?.payload;
      const completed = dataPoint?.ordersCompleted || 0;
      const cancelled = dataPoint?.ordersCancelled || 0;
      const total = dataPoint?.ordersCount || completed + cancelled;
      const revenue = dataPoint?.revenue || 0;

      return (
        <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-4 shadow-2xl backdrop-blur-md text-xs space-y-2 min-w-[200px]">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="font-bold text-slate-200">
              {label} ({dataPoint?.dayName || 'N/A'})
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-amber-400 font-mono">
              Doanh thu: {formatVND(revenue)}
            </span>
          </div>
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-emerald-400 font-semibold">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                Đơn hoàn thành:
              </span>
              <strong className="font-mono">{completed.toLocaleString('vi-VN')}</strong>
            </div>

            <div className="flex items-center justify-between text-red-400 font-semibold">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-red-500" />
                Đơn bị hủy:
              </span>
              <strong className="font-mono">{cancelled.toLocaleString('vi-VN')}</strong>
            </div>

            <div className="flex items-center justify-between text-slate-300 font-bold border-t border-slate-800/80 pt-1">
              <span>Tổng số đơn:</span>
              <strong className="font-mono">{total.toLocaleString('vi-VN')}</strong>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const summary = chartsData?.summary;
  const cancellationRate = useMemo(() => {
    if (!summary || summary.totalOrders === 0) return 0;
    return Math.round((summary.cancelledOrders / summary.totalOrders) * 100);
  }, [summary]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-800 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1.5">
                <BarChart2 className="w-3 h-3 text-amber-400" />
                Analytics & Deep Insights
              </span>
              <span className="text-xs text-slate-400">Dữ liệu thời gian thực từ API Gateway</span>
            </div>
            <h1 className="text-2xl font-black text-slate-100 flex items-center gap-2.5">
              Báo cáo Chuyên sâu (Advanced Reports)
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Phân tích số liệu doanh thu, phân bổ đơn hàng thành công / thất bại và tra cứu chi tiết giao dịch toàn hệ thống.
            </p>
          </div>

          {/* Quick Stat Highlights */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-slate-950/70 border border-slate-800 px-4 py-2.5 rounded-2xl flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                <DollarSign className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-bold">Tổng doanh thu kỳ</p>
                <p className="text-sm font-black text-amber-300 font-mono">
                  {formatVND(summary?.totalRevenue || 0)}
                </p>
              </div>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 px-4 py-2.5 rounded-2xl flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-bold">Tổng số đơn</p>
                <p className="text-sm font-black text-emerald-300 font-mono">
                  {(summary?.totalOrders || 0).toLocaleString('vi-VN')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PHẦN 1: Advanced Filter Bar (Thanh Lọc Dữ Liệu Nâng Cao) */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl">
        <form onSubmit={handleApplyFilter} className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-bold text-slate-200">Bộ Lọc Báo Cáo & Thời Gian</h2>
            </div>
            <button
              type="button"
              onClick={handleResetFilter}
              className="text-xs text-slate-400 hover:text-slate-200 transition underline cursor-pointer"
            >
              Đặt lại mặc định
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Date Range: Từ ngày */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-400" /> Từ ngày:
              </label>
              <input
                type="date"
                value={filterState.startDate}
                onChange={(e) => setFilterState((prev) => ({ ...prev, startDate: e.target.value }))}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition cursor-pointer"
              />
            </div>

            {/* 2. Date Range: Đến ngày */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-400" /> Đến ngày:
              </label>
              <input
                type="date"
                value={filterState.endDate}
                onChange={(e) => setFilterState((prev) => ({ ...prev, endDate: e.target.value }))}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition cursor-pointer"
              />
            </div>

            {/* 3. Dropdown Trạng thái */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-amber-400" /> Trạng thái đơn:
              </label>
              <select
                value={filterState.status}
                onChange={(e) => setFilterState((prev) => ({ ...prev, status: e.target.value }))}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition cursor-pointer"
              >
                <option value="">Tất cả trạng thái</option>
                <option value="Completed">Hoàn thành (Completed)</option>
                <option value="Cancelled">Đã hủy (Cancelled)</option>
                <option value="Pending">Đang chờ xử lý (Pending)</option>
                <option value="Preparing">Đang chuẩn bị (Preparing)</option>
                <option value="Delivering">Đang giao hàng (Delivering)</option>
                <option value="Refunded">Đã hoàn tiền (Refunded)</option>
              </select>
            </div>

            {/* 4. Dropdown/Input Nhà hàng */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Store className="w-3.5 h-3.5 text-amber-400" /> Mã / ID Nhà hàng:
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Nhập ID nhà hàng (tùy chọn)..."
                  value={filterState.restaurantId}
                  onChange={(e) => setFilterState((prev) => ({ ...prev, restaurantId: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons: Tạo Báo cáo & Xuất CSV */}
          <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={isExporting || tableData.data.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition shadow-sm disabled:opacity-50 cursor-pointer active:scale-95"
              title="Xuất bảng dữ liệu hiện tại ra định dạng CSV"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>{isExporting ? 'Đang xuất CSV...' : 'Xuất CSV'}</span>
            </button>

            <button
              type="submit"
              disabled={isChartsLoading || isTableLoading}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs font-black rounded-xl shadow-lg shadow-amber-500/20 transition active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <BarChart2 className={`w-4 h-4 ${isChartsLoading || isTableLoading ? 'animate-spin' : ''}`} />
              <span>{isChartsLoading || isTableLoading ? 'Đang tạo báo cáo...' : 'Tạo Báo cáo'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* PHẦN 2: Advanced Charts (Biểu đồ Cột Chồng - Stacked BarChart) */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        {/* Header of Chart Section */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-amber-400" />
              <h2 className="text-base font-bold text-slate-100">
                Phân bổ Số lượng Đơn hàng theo Ngày (Stacked Bar)
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Cột thể hiện tổng đơn mỗi ngày: màu xanh lá (Hoàn thành) và màu đỏ (Bị hủy/Thất bại).
            </p>
          </div>

          {/* Legend Highlights */}
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20 text-emerald-300 font-bold">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
              <span>Hoàn thành: {(summary?.completedOrders || 0).toLocaleString('vi-VN')}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-red-500/10 px-3 py-1.5 rounded-xl border border-red-500/20 text-red-300 font-bold">
              <span className="w-2.5 h-2.5 rounded-sm bg-red-500" />
              <span>Đã hủy: {(summary?.cancelledOrders || 0).toLocaleString('vi-VN')} ({cancellationRate}%)</span>
            </div>
          </div>
        </div>

        {/* Chart View with Skeleton Overlay */}
        <div className="relative min-h-[340px] w-full">
          {isChartsLoading ? (
            <div className="h-[340px] w-full flex flex-col items-center justify-center bg-slate-950/60 rounded-2xl border border-slate-800/80 animate-pulse space-y-3">
              <RefreshCw className="w-8 h-8 text-amber-400 animate-spin" />
              <p className="text-xs text-slate-400 font-semibold">Đang tải và dựng biểu đồ phân tích...</p>
            </div>
          ) : chartsData && chartsData.charts.length > 0 ? (
            <div className="w-full h-[340px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartsData.charts}
                  margin={{ top: 10, right: 10, left: -15, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(val) => {
                      if (!val) return '';
                      if (val.includes('/')) return val;
                      const parts = val.split('-');
                      return parts.length >= 3 ? `${parts[2]}/${parts[1]}` : val;
                    }}
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip content={<CustomBarChartTooltip />} cursor={{ fill: '#334155', opacity: 0.2 }} />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    iconType="circle"
                    wrapperStyle={{ paddingBottom: '12px', fontSize: '12px' }}
                  />
                  {/* Stacked Bars: Completed & Cancelled */}
                  <Bar
                    name="Đơn Hoàn thành"
                    dataKey="ordersCompleted"
                    stackId="ordersStack"
                    fill="#10b981"
                    radius={[0, 0, 4, 4]}
                    maxBarSize={40}
                  />
                  <Bar
                    name="Đơn Bị hủy"
                    dataKey="ordersCancelled"
                    stackId="ordersStack"
                    fill="#ef4444"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[340px] flex flex-col items-center justify-center bg-slate-950/40 rounded-2xl border border-slate-800 text-center p-6">
              <AlertCircle className="w-10 h-10 text-slate-500 mb-2" />
              <p className="text-sm font-bold text-slate-300">Không tìm thấy dữ liệu thống kê trong khoảng thời gian này</p>
              <p className="text-xs text-slate-500 mt-1">Vui lòng điều chỉnh lại bộ lọc ngày hoặc trạng thái để xem dữ liệu</p>
            </div>
          )}
        </div>
      </div>

      {/* PHẦN 3: Detailed Data Table (Bảng Dữ liệu & Phân trang) */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-xl overflow-hidden">
        {/* Table Header */}
        <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/80">
          <div>
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-bold text-slate-200">
                Bảng Chi tiết Đơn hàng ({tableData.totalCount.toLocaleString('vi-VN')} bản ghi)
              </h2>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Dữ liệu chi tiết từng đơn hàng tương ứng với bộ lọc đã chọn
            </p>
          </div>

          <span className="text-xs text-slate-400 font-mono">
            Trang {tableData.page} / {tableData.totalPages || 1}
          </span>
        </div>

        {/* Table Body */}
        <div className="overflow-x-auto">
          {isTableLoading ? (
            <div className="p-8 space-y-4 animate-pulse">
              {Array.from({ length: 5 }).map((_, idx) => (
                <div key={`table-skeleton-${idx}`} className="h-12 bg-slate-800/60 rounded-xl w-full" />
              ))}
            </div>
          ) : tableData.data.length > 0 ? (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-3.5 px-4 font-mono">Mã Đơn</th>
                  <th className="py-3.5 px-4">Thời Gian Tạo</th>
                  <th className="py-3.5 px-4">Nhà Hàng</th>
                  <th className="py-3.5 px-4">Trạng Thái</th>
                  <th className="py-3.5 px-4 text-right">Tổng Tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {tableData.data.map((order) => (
                  <tr
                    key={order.id}
                    className="hover:bg-slate-800/40 transition-colors group"
                  >
                    {/* Mã Đơn */}
                    <td className="py-3.5 px-4 font-mono font-bold text-amber-300">
                      <span className="px-2 py-0.5 rounded bg-slate-800/90 border border-slate-700/80">
                        #{order.orderCode || order.id.substring(0, 8)}
                      </span>
                    </td>

                    {/* Ngày Tạo */}
                    <td className="py-3.5 px-4 text-slate-300">
                      {formatDateTime(order.creationTime || order.createdAt)}
                    </td>

                    {/* Tên Nhà Hàng */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-200">
                        {order.restaurantName || (
                          <span className="text-slate-400 font-mono text-[11px]">
                            {order.restaurantId ? `ID: ${order.restaurantId.substring(0, 10)}...` : 'Hệ thống'}
                          </span>
                        )}
                      </div>
                      {order.customerName && (
                        <div className="text-[10px] text-slate-400">
                          Khách: {order.customerName}
                        </div>
                      )}
                    </td>

                    {/* Trạng Thái */}
                    <td className="py-3.5 px-4">
                      {renderStatusBadge(order.status)}
                    </td>

                    {/* Tổng Tiền */}
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-100">
                      {formatVND(order.totalAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-12 text-center space-y-2">
              <Search className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-sm font-bold text-slate-300">Không có đơn hàng nào khớp với điều kiện lọc</p>
              <p className="text-xs text-slate-500">Hãy thử nới lỏng khoảng thời gian hoặc chọn trạng thái khác</p>
            </div>
          )}
        </div>

        {/* Pagination Footer */}
        {tableData.totalPages > 1 && (
          <div className="p-4 border-t border-slate-800 bg-slate-900/60">
            <Pagination
              currentPage={page}
              totalPages={tableData.totalPages}
              totalItems={tableData.totalCount}
              pageSize={limit}
              onPageChange={(newPage) => setPage(newPage)}
              onPageSizeChange={(newSize) => {
                setLimit(newSize);
                setPage(1);
              }}
              itemLabel="đơn hàng"
              accentColor="amber"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default AdvancedReports;
