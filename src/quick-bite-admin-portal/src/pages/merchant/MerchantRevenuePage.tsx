import { useEffect, useState, useCallback } from 'react';
import {
  DollarSign,
  Banknote,
  CreditCard,
  Calendar,
  Search,
  Filter,
  RotateCcw,
  Loader2,
  Receipt,
  CheckCircle2,
  Clock,
  XCircle,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Store,
  FileSpreadsheet,
} from 'lucide-react';
import { restaurantService } from '../../services/restaurantService';
import {
  revenueService,
  type MerchantTransaction,
  type RevenueKPIs,
} from '../../services/revenueService';
import { toast } from '../../stores/toastStore';

export default function MerchantRevenuePage() {
  // ─── States ─────────────────────────────────────────────────────────────────
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [restaurantName, setRestaurantName] = useState<string>('');
  const [isLoadingRestaurant, setIsLoadingRestaurant] = useState<boolean>(true);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(false);

  // Filter States
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchInput, setSearchInput] = useState<string>('');

  // Data States
  const [kpis, setKpis] = useState<RevenueKPIs>({
    totalRevenue: 0,
    codRevenue: 0,
    onlineRevenue: 0,
    totalOrders: 0,
    deliveredOrders: 0,
    cancelledOrders: 0,
    revenueToday: 0,
    ordersToday: 0,
  });
  const [transactions, setTransactions] = useState<MerchantTransaction[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(1);

  // ─── 1. Load Restaurant Profile on Mount ─────────────────────────────────────
  useEffect(() => {
    let isMounted = true;

    async function loadRestaurant() {
      setIsLoadingRestaurant(true);
      try {
        const res = await restaurantService.getMerchantProfile();
        if (res && res.id && isMounted) {
          setRestaurantId(res.id);
          setRestaurantName(res.name || 'Nhà hàng của bạn');
        }
      } catch (err) {
        console.error('Failed to load merchant profile:', err);
        toast.error('Không thể xác định thông tin nhà hàng.', 'Lỗi tải dữ liệu');
      } finally {
        if (isMounted) setIsLoadingRestaurant(false);
      }
    }

    loadRestaurant();
    return () => {
      isMounted = false;
    };
  }, []);

  // ─── 2. Fetch Revenue Data ──────────────────────────────────────────────────
  const loadRevenueData = useCallback(
    async (pageToLoad = currentPage) => {
      if (!restaurantId) return;

      setIsLoadingData(true);
      try {
        const result = await revenueService.getMerchantRevenueData({
          restaurantId,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          status: statusFilter,
          search: searchInput || undefined,
          page: pageToLoad,
          limit: pageSize,
        });

        setKpis(result.kpis);
        setTransactions(result.transactions);
        setTotalCount(result.totalCount);
        setCurrentPage(result.page);
        setTotalPages(result.totalPages);
      } catch (err: any) {
        console.error('Error fetching revenue data:', err);
        toast.error('Không thể tải dữ liệu doanh thu.', 'Lỗi tải dữ liệu');
      } finally {
        setIsLoadingData(false);
      }
    },
    [restaurantId, startDate, endDate, statusFilter, searchInput, currentPage, pageSize]
  );

  // Trigger data load when restaurantId or pagination changes
  useEffect(() => {
    if (restaurantId) {
      loadRevenueData(currentPage);
    }
  }, [restaurantId, currentPage, pageSize]);

  // Handle Search & Filter submit
  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    loadRevenueData(1);
  };

  // Handle Reset Filters
  const handleResetFilters = () => {
    setStartDate('');
    setEndDate('');
    setStatusFilter('ALL');
    setSearchInput('');
    setCurrentPage(1);
  };

  // Handle Export CSV
  const handleExportCSV = () => {
    if (transactions.length === 0) {
      toast.warning('Chưa có dữ liệu giao dịch để xuất báo cáo.', 'Thông báo');
      return;
    }
    const filename = `doanh-thu-${restaurantName.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`;
    revenueService.exportToCSV(transactions, filename);
    toast.success(`Đã xuất file báo cáo ${filename} thành công!`, 'Xuất Excel / CSV');
  };

  // Render Status Badge for order
  const renderStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'delivered' || s === 'completed' || s === 'success') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Đã giao hàng
        </span>
      );
    }
    if (s === 'cancelled') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
          <XCircle className="w-3.5 h-3.5" />
          Đã hủy đơn
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
        <Clock className="w-3.5 h-3.5" />
        {status}
      </span>
    );
  };

  // Render Payment Method Badge
  const renderPaymentBadge = (method: string, raw: string) => {
    if (method === 'COD') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/30">
          <Banknote className="w-3.5 h-3.5" />
          Tiền mặt (COD)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
        <CreditCard className="w-3.5 h-3.5" />
        {raw === 'MOMO' ? 'Ví MoMo' : raw === 'CREDIT_CARD' ? 'Thẻ Quốc tế' : 'Thanh toán Online'}
      </span>
    );
  };

  if (isLoadingRestaurant) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-2 border-emerald-500/20 border-t-emerald-500 animate-spin" />
          <Store className="w-5 h-5 text-emerald-400 absolute inset-0 m-auto animate-pulse" />
        </div>
        <p className="text-slate-400 text-sm font-medium animate-pulse">
          Đang xác thực dữ liệu nhà hàng...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* ── 1. Header Section ───────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-emerald-400/20 to-teal-500/20 border border-emerald-500/30 rounded-2xl text-emerald-400">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-100 flex items-center gap-2">
              Doanh Thu & Hóa Đơn
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {restaurantName}
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Quản lý dòng tiền, báo cáo doanh thu theo hình thức thanh toán và lịch sử hóa đơn chi tiết.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => loadRevenueData(currentPage)}
            disabled={isLoadingData}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            title="Tải lại dữ liệu mới nhất"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isLoadingData ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Làm Mới</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            disabled={transactions.length === 0 || isLoadingData}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-black shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Xuất Excel / CSV</span>
          </button>
        </div>
      </div>

      {/* ── 2. KPI Summary Cards (3 Cards) ─────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Tổng Doanh Thu */}
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 to-slate-900/90 border border-emerald-500/30 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Tổng Doanh Thu
            </span>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-100">
              {revenueService.formatCurrency(kpis.totalRevenue)}
            </h2>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="flex items-center gap-1 font-semibold text-emerald-400">
                <TrendingUp className="w-3.5 h-3.5" />
                {kpis.deliveredOrders} đơn hoàn tất
              </span>
              <span>•</span>
              <span>Tổng cộng {totalCount} đơn</span>
            </div>
          </div>
        </div>

        {/* Card 2: Tiền Mặt (COD) */}
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 to-slate-900/90 border border-amber-500/30 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
              Tiền Mặt (COD)
            </span>
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Banknote className="w-5 h-5" />
            </div>
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-100">
              {revenueService.formatCurrency(kpis.codRevenue)}
            </h2>
            <p className="text-xs text-slate-400">
              Thanh toán trực tiếp khi nhận món ăn
            </p>
          </div>
        </div>

        {/* Card 3: Thanh Toán Online */}
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 to-slate-900/90 border border-indigo-500/30 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
              Thanh Toán Online
            </span>
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-100">
              {revenueService.formatCurrency(kpis.onlineRevenue)}
            </h2>
            <p className="text-xs text-slate-400">
              Ví điện tử MoMo, VNPay, thẻ tín dụng
            </p>
          </div>
        </div>
      </div>

      {/* ── 3. Filters Bar ──────────────────────────────────────────────────── */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <form onSubmit={handleFilterSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3.5 items-end">
          {/* Date Start */}
          <div className="lg:col-span-3 space-y-1.5">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              Từ Ngày:
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 text-slate-200 text-xs rounded-xl px-3.5 py-2.5 focus:outline-none transition-colors"
            />
          </div>

          {/* Date End */}
          <div className="lg:col-span-3 space-y-1.5">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              Đến Ngày:
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 text-slate-200 text-xs rounded-xl px-3.5 py-2.5 focus:outline-none transition-colors"
            />
          </div>

          {/* Status Filter */}
          <div className="lg:col-span-2 space-y-1.5">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-emerald-400" />
              Trạng Thái:
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 text-slate-200 text-xs rounded-xl px-3.5 py-2.5 focus:outline-none transition-colors"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="Delivered">Đã giao hàng (Delivered)</option>
              <option value="Preparing">Đang chuẩn bị (Preparing)</option>
              <option value="Confirmed">Đã xác nhận (Confirmed)</option>
              <option value="Cancelled">Đã hủy đơn (Cancelled)</option>
            </select>
          </div>

          {/* Search Input */}
          <div className="lg:col-span-2 space-y-1.5">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-emerald-400" />
              Tìm Kiếm:
            </label>
            <input
              type="text"
              placeholder="Mã đơn hàng, khách..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 text-slate-200 text-xs rounded-xl px-3.5 py-2.5 focus:outline-none transition-colors"
            />
          </div>

          {/* Action Buttons */}
          <div className="lg:col-span-2 flex items-center gap-2">
            <button
              type="submit"
              disabled={isLoadingData}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-black rounded-xl shadow-md shadow-emerald-500/20 flex items-center justify-center gap-1.5 transition-all transform active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {isLoadingData ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Filter className="w-3.5 h-3.5" />}
              <span>Lọc</span>
            </button>

            <button
              type="button"
              onClick={handleResetFilters}
              className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              title="Đặt lại bộ lọc"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>

      {/* ── 4. Transactions Data Table ─────────────────────────────────────── */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">Danh Sách Hóa Đơn & Giao Dịch</h2>
              <p className="text-[11px] text-slate-400">
                Hiển thị {transactions.length} trên tổng số {totalCount} đơn hàng
              </p>
            </div>
          </div>
        </div>

        {isLoadingData ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
            <p className="text-xs text-slate-400">Đang tải danh sách giao dịch từ hệ thống...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <div className="p-4 bg-slate-800/50 rounded-2xl text-slate-500 border border-slate-800">
              <Receipt className="w-8 h-8" />
            </div>
            <p className="text-sm font-bold text-slate-300">Không tìm thấy giao dịch nào</p>
            <p className="text-xs text-slate-500 max-w-sm text-center">
              Chưa có hóa đơn nào phù hợp với bộ lọc ngày và trạng thái bạn đã chọn.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/60 text-slate-400 font-bold border-b border-slate-800 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-3.5">Mã Đơn Hàng</th>
                  <th className="px-5 py-3.5">Thời Gian</th>
                  <th className="px-5 py-3.5">Khách Hàng</th>
                  <th className="px-5 py-3.5">Chi Tiết Món</th>
                  <th className="px-5 py-3.5">Hình Thức Thanh Toán</th>
                  <th className="px-5 py-3.5 text-right">Số Tiền (VNĐ)</th>
                  <th className="px-5 py-3.5 text-center">Trạng Thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-800/30 transition-colors">
                    {/* Order Code */}
                    <td className="px-5 py-4 font-mono font-bold text-emerald-400">
                      #{tx.orderCode}
                    </td>

                    {/* Date */}
                    <td className="px-5 py-4 text-slate-400 whitespace-nowrap">
                      {new Date(tx.createdAt).toLocaleString('vi-VN', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>

                    {/* Customer Info */}
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-200">{tx.customerName}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{tx.customerPhone}</div>
                    </td>

                    {/* Items Summary */}
                    <td className="px-5 py-4 max-w-xs">
                      <div className="truncate text-slate-300" title={tx.itemsSummary}>
                        {tx.itemsSummary}
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium">
                        {tx.itemsCount} món ăn
                      </div>
                    </td>

                    {/* Payment Method Badge */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      {renderPaymentBadge(tx.paymentMethod, tx.paymentMethodRaw)}
                    </td>

                    {/* Total Amount */}
                    <td className="px-5 py-4 text-right font-black text-slate-100 text-sm whitespace-nowrap">
                      {revenueService.formatCurrency(tx.totalAmount)}
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4 text-center whitespace-nowrap">
                      {renderStatusBadge(tx.orderStatus)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── 5. Pagination Controls ────────────────────────────────────────── */}
        <div className="p-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span>Hiển thị:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
            >
              <option value={10}>10 đơn/trang</option>
              <option value={20}>20 đơn/trang</option>
              <option value={50}>50 đơn/trang</option>
            </select>
            <span>trong tổng số {totalCount} đơn</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage <= 1 || isLoadingData}
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              className="px-3 py-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 font-bold cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Trang trước</span>
            </button>

            <span className="px-3 py-1 font-bold text-slate-200 bg-slate-950 rounded-lg border border-slate-800">
              {currentPage} / {totalPages}
            </span>

            <button
              type="button"
              disabled={currentPage >= totalPages || isLoadingData}
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              className="px-3 py-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 font-bold cursor-pointer"
            >
              <span>Trang sau</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
