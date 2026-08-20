import { useState, useEffect, useRef } from 'react';
import { ShoppingBag, Eye, Clock, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { DataTable } from '../../components/common/DataTable';
import type { Column } from '../../components/common/DataTable';
import { orderService } from '../../services/orderService';
import type { ExtendedOrder, OrderStatus } from '../../types';
import { OrderFilters } from './orders/OrderFilters';
import { OrderDetailDrawer } from './orders/OrderDetailDrawer';
import { ForceCancelModal } from './orders/ForceCancelModal';
import { formatDateTime, formatVND } from '../../utils/dateHelper';
import { toast } from '../../stores/toastStore';

export const OrdersPage = () => {
  const [orders, setOrders] = useState<ExtendedOrder[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filters state
  const [search, setSearch] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Modals / Drawers state
  const [selectedOrder, setSelectedOrder] = useState<ExtendedOrder | null>(null);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState<boolean>(false);
  const [isForceCancelModalOpen, setIsForceCancelModalOpen] = useState<boolean>(false);

  const debounceTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchOrders = async (
    searchVal = search,
    statusVal = status,
    startVal = startDate,
    endVal = endDate
  ) => {
    setIsLoading(true);
    try {
      const res = await orderService.getAdminOrders({
        search: searchVal || undefined,
        status: statusVal || undefined,
        startDate: startVal || undefined,
        endDate: endVal || undefined,
        skipCount: 0,
        maxResultCount: 100,
      });
      setOrders(res.items);
      setTotalCount(res.totalCount);
    } catch {
      toast.error('Không thể tải danh sách đơn hàng toàn sàn');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders(search, status, startDate, endDate);
  }, [status, startDate, endDate]);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }
    debounceTimeout.current = setTimeout(() => {
      fetchOrders(val, status, startDate, endDate);
    }, 500);
  };

  const handleResetFilters = () => {
    setSearch('');
    setStatus('');
    setStartDate('');
    setEndDate('');
    fetchOrders('', '', '', '');
  };

  const handleForceCancelConfirm = async (reason: string) => {
    if (!selectedOrder) return;
    try {
      await orderService.forceCancelOrder(selectedOrder.id, reason);
      toast.success(`Đã hủy khẩn cấp đơn hàng ${selectedOrder.orderCode} thành công!`);
      setIsDetailDrawerOpen(false);
      fetchOrders(search, status, startDate, endDate);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Không thể hủy đơn hàng');
      throw err;
    }
  };

  const pendingCount = orders.filter((o) =>
    ['Pending', 'WaitingInventory', 'WaitingPayment', 'WaitingStock', 'Preparing', 'Delivering', 'Confirmed'].includes(o.status)
  ).length;
  const completedCount = orders.filter((o) => o.status === 'Completed').length;
  const cancelledCount = orders.filter((o) => o.status === 'Cancelled' || o.status === 'Refunded').length;

  const renderStatusBadge = (orderStatus: OrderStatus) => {
    switch (orderStatus) {
      case 'Completed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            Giao thành công
          </span>
        );
      case 'Cancelled':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
            Đã hủy
          </span>
        );
      case 'Refunded':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/30">
            Đã hoàn tiền
          </span>
        );
      case 'Delivering':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30">
            Đang giao hàng
          </span>
        );
      case 'Preparing':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            Đang chuẩn bị
          </span>
        );
      case 'Confirmed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
            Đã xác nhận
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-700/50 text-slate-300 border border-slate-600/40">
            {orderStatus}
          </span>
        );
    }
  };

  const columns: Column<ExtendedOrder>[] = [
    {
      header: 'Mã Đơn',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-amber-500/10 rounded-lg text-amber-400 border border-amber-500/20">
            <ShoppingBag className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="font-extrabold text-amber-400 font-mono text-xs block leading-tight">
              {row.orderCode}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              {row.items?.length || 0} món
            </span>
          </div>
        </div>
      ),
    },
    {
      header: 'Tên Quán',
      cell: (row) => (
        <span className="font-semibold text-slate-200 text-xs max-w-[140px] truncate block">
          {row.restaurantName || `Nhà hàng #${row.restaurantId.substring(0, 6)}`}
        </span>
      ),
    },
    {
      header: 'Thông Tin Khách',
      cell: (row) => {
        const deliveryObj = typeof row.deliveryAddress === 'object' && row.deliveryAddress !== null ? row.deliveryAddress : null;
        const name = deliveryObj?.receiverName || deliveryObj?.fullName || row.customerName || 'Khách hàng';
        const phone = deliveryObj?.phoneNumber || '—';
        return (
          <div>
            <div className="font-bold text-slate-200 text-xs">{name}</div>
            <div className="text-[10px] text-slate-400 font-mono">{phone}</div>
          </div>
        );
      },
    },
    {
      header: 'Tổng Tiền',
      cell: (row) => (
        <span className="font-extrabold text-slate-100 font-mono text-xs">
          {formatVND(row.totalAmount)}
        </span>
      ),
    },
    {
      header: 'Trạng Thái',
      cell: (row) => renderStatusBadge(row.status),
    },
    {
      header: 'Thời Gian Tạo',
      cell: (row) => (
        <span className="text-slate-400 font-mono text-[11px]">
          {formatDateTime(row.creationTime || row.createdAt)}
        </span>
      ),
    },
    {
      header: 'Hành Động',
      cell: (row) => (
        <button
          onClick={() => {
            setSelectedOrder(row);
            setIsDetailDrawerOpen(true);
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-cyan-200 font-bold rounded-lg border border-slate-700/80 transition-all text-xs cursor-pointer shadow-sm"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Xem Chi Tiết</span>
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 p-5 rounded-2xl shadow-xl">
        <div>
          <h1 className="text-lg sm:text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-amber-400" />
            Giám sát Đơn hàng Toàn sàn
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Tra cứu, theo dõi tiến độ vòng đời và thực hiện can thiệp hủy đơn khẩn cấp toàn hệ thống.
          </p>
        </div>

        {/* Quick Stats Badges & Refresh */}
        <div className="flex items-center gap-2.5">
          <div className="bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-xl flex items-center gap-2 shadow-inner">
            <ShoppingBag className="w-3.5 h-3.5 text-cyan-400" />
            <div>
              <span className="text-[9px] text-slate-400 font-medium block leading-none">Tổng đơn</span>
              <strong className="text-xs font-extrabold text-cyan-300 font-mono">{totalCount || orders.length}</strong>
            </div>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-xl flex items-center gap-2 shadow-inner">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <div>
              <span className="text-[9px] text-slate-400 font-medium block leading-none">Đang xử lý</span>
              <strong className="text-xs font-extrabold text-amber-300 font-mono">{pendingCount}</strong>
            </div>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-xl flex items-center gap-2 shadow-inner">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <div>
              <span className="text-[9px] text-slate-400 font-medium block leading-none">Hoàn tất</span>
              <strong className="text-xs font-extrabold text-emerald-300 font-mono">{completedCount}</strong>
            </div>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-xl flex items-center gap-2 shadow-inner">
            <XCircle className="w-3.5 h-3.5 text-red-400" />
            <div>
              <span className="text-[9px] text-slate-400 font-medium block leading-none">Đã hủy/hoàn</span>
              <strong className="text-xs font-extrabold text-red-300 font-mono">{cancelledCount}</strong>
            </div>
          </div>

          <button
            onClick={() => fetchOrders(search, status, startDate, endDate)}
            disabled={isLoading}
            title="Làm mới"
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Advanced Filter Toolbar */}
      <OrderFilters
        search={search}
        onSearchChange={handleSearchChange}
        status={status}
        onStatusChange={setStatus}
        startDate={startDate}
        onStartDateChange={setStartDate}
        endDate={endDate}
        onEndDateChange={setEndDate}
        onReset={handleResetFilters}
        isLoading={isLoading}
      />

      {/* Main DataTable */}
      <DataTable
        data={orders}
        columns={columns}
        searchPlaceholder="Tìm kiếm nhanh trong bảng..."
        isLoading={isLoading}
        pageSize={10}
      />

      {/* Detail Drawer */}
      <OrderDetailDrawer
        order={selectedOrder}
        isOpen={isDetailDrawerOpen}
        onClose={() => setIsDetailDrawerOpen(false)}
        onOpenForceCancel={() => setIsForceCancelModalOpen(true)}
      />

      {/* Emergency Force Cancel Modal */}
      <ForceCancelModal
        isOpen={isForceCancelModalOpen}
        orderCode={selectedOrder?.orderCode || ''}
        onClose={() => setIsForceCancelModalOpen(false)}
        onConfirm={handleForceCancelConfirm}
      />
    </div>
  );
};
