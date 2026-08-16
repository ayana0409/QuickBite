import { useState, useEffect } from 'react';
import { ShoppingBag, Eye, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { DataTable } from '../../components/common/DataTable';
import type { Column } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { OrderSagaDrawer } from '../../components/admin/OrderSagaDrawer';
import { orderService } from '../../services/orderService';
import type { ExtendedOrder } from '../../services/orderService';

export const OrdersPage = () => {
  const [orders, setOrders] = useState<ExtendedOrder[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedOrder, setSelectedOrder] = useState<ExtendedOrder | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const data = await orderService.getAdminOrders();
      setOrders(data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const pendingCount = orders.filter((o) => o.status === 'Pending').length;
  const completedCount = orders.filter((o) => o.status === 'Completed').length;
  const cancelledCount = orders.filter((o) => o.status === 'Cancelled').length;

  const columns: Column<ExtendedOrder>[] = [
    {
      header: 'Mã Đơn Hàng',
      cell: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-lg text-amber-400 border border-amber-500/30">
            <ShoppingBag className="w-4 h-4" />
          </div>
          <div>
            <p className="font-extrabold text-slate-100 font-mono leading-tight">{row.orderCode}</p>
            <span className="text-[9px] text-purple-300 font-mono">Saga: {row.sagaState}</span>
          </div>
        </div>
      ),
    },
    {
      header: 'Khách Hàng',
      cell: (row) => (
        <div>
          <p className="font-bold text-slate-200">{row.customerName || 'Khách hàng'}</p>
          <p className="text-[10px] text-slate-400 max-w-[150px] truncate">
            {typeof row.deliveryAddress === 'string'
              ? row.deliveryAddress
              : row.deliveryAddress
              ? `${row.deliveryAddress.addressLine || ''}`
              : 'N/A'}
          </p>
        </div>
      ),
    },
    {
      header: 'Nhà Hàng',
      accessorKey: 'restaurantName',
      cell: (row) => <span className="font-semibold text-slate-300 max-w-[140px] truncate block">{row.restaurantName}</span>,
    },
    {
      header: 'Tổng Tiền',
      cell: (row) => (
        <span className="font-extrabold text-amber-400 font-mono text-xs">
          {row.totalAmount.toLocaleString('vi-VN')}đ
        </span>
      ),
    },
    {
      header: 'Trạng Thái',
      cell: (row) => <StatusBadge status={row.status} type="order" />,
    },
    {
      header: 'Thời Gian',
      cell: (row) => (
        <span className="text-slate-400 font-mono text-[11px]">
          {row.createdAt
            ? new Date(row.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
            : 'N/A'}
        </span>
      ),
    },
    {
      header: 'Saga State',
      cell: (row) => (
        <button
          onClick={() => {
            setSelectedOrder(row);
            setIsDrawerOpen(true);
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold rounded-lg border border-slate-700 transition-all text-[11px] cursor-pointer"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Chi Tiết Saga</span>
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 p-5 rounded-2xl shadow-xl">
        <div>
          <h1 className="text-lg sm:text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-pink-400 to-cyan-400 flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-amber-400" />
            Giám Sát Đơn Hàng Hệ Thống (Order Saga Pattern)
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Theo dõi dòng chảy đơn hàng real-time, trạng thái Saga Timeout 15m và cơ chế hoàn tác Compensation.
          </p>
        </div>

        {/* Quick Stats Badges */}
        <div className="flex items-center gap-2.5">
          <div className="bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-xl flex items-center gap-2 shadow-inner">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <div>
              <span className="text-[9px] text-slate-400 font-medium block leading-none">Chờ Xử Lý</span>
              <strong className="text-xs font-extrabold text-amber-300 font-mono">{pendingCount}</strong>
            </div>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-xl flex items-center gap-2 shadow-inner">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <div>
              <span className="text-[9px] text-slate-400 font-medium block leading-none">Hoàn Tất</span>
              <strong className="text-xs font-extrabold text-emerald-300 font-mono">{completedCount}</strong>
            </div>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-xl flex items-center gap-2 shadow-inner">
            <XCircle className="w-3.5 h-3.5 text-red-400" />
            <div>
              <span className="text-[9px] text-slate-400 font-medium block leading-none">Đã Hủy</span>
              <strong className="text-xs font-extrabold text-red-300 font-mono">{cancelledCount}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Main DataTable */}
      <DataTable
        data={orders}
        columns={columns}
        searchPlaceholder="Tìm kiếm mã đơn QB-..., tên khách hàng, nhà hàng..."
        filterOptions={[
          { label: 'Pending (Chờ duyệt)', value: 'pending' },
          { label: 'Confirmed (Đã xác nhận)', value: 'confirmed' },
          { label: 'Completed (Hoàn tất)', value: 'completed' },
          { label: 'Cancelled (Đã hủy)', value: 'cancelled' },
        ]}
        isLoading={isLoading}
      />

      {/* Order Saga Drawer */}
      <OrderSagaDrawer
        order={selectedOrder}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />
    </div>
  );
};
