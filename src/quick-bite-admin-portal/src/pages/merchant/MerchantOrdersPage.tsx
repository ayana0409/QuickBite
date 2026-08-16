import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
  ShoppingBag,
  CheckCircle2,
  XCircle,
  Eye,
  RefreshCw,
  AlertCircle,
  FileText,
  Clock,
  Send,
} from 'lucide-react';
import { orderService } from '../../services/orderService';
import type { Order, OrderStatus } from '../../types';
import { toast } from '../../stores/toastStore';
import OrderFilterBar, { type OrderFilterValues } from '../../components/merchant/OrderFilterBar';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { Pagination } from '../../components/common/Pagination';
import OrderDetailModal from '../../components/merchant/modals/OrderDetailModal';

const PAGE_SIZE = 10;

export default function MerchantOrdersPage() {
  const queryClient = useQueryClient();

  // State management
  const [filters, setFilters] = useState<OrderFilterValues>({ search: '', status: '' });
  const [page, setPage] = useState<number>(1);

  // Selected Order for Detail View
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Cancel order modal state
  const [cancelModal, setCancelModal] = useState<{
    open: boolean;
    orderId: string | null;
    orderCode: string;
    note: string;
  }>({
    open: false,
    orderId: null,
    orderCode: '',
    note: '',
  });

  // Fetch merchant orders using TanStack Query v5
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['merchant-orders', filters, page],
    queryFn: () =>
      orderService.getMerchantOrders({
        search: filters.search || undefined,
        status: filters.status || undefined,
        page,
        limit: PAGE_SIZE,
      }),
    placeholderData: keepPreviousData,
  });

  // Mutation to update order status (e.g. Delivering)
  const { mutate: updateStatus, isPending: isUpdating } = useMutation({
    mutationFn: ({
      orderId,
      status,
      note,
    }: {
      orderId: string;
      status: OrderStatus;
      note?: string;
    }) => orderService.updateOrderStatus(orderId, status, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant-orders'] });
      toast.success('Cập nhật trạng thái đơn hàng thành công!');
      closeCancelModal();
      setDetailModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Không thể cập nhật trạng thái đơn hàng');
    },
  });

  // Mutation to submit a draft / pending order
  const { mutate: submitOrder, isPending: isSubmitting } = useMutation({
    mutationFn: (orderId: string) => orderService.submitOrder(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant-orders'] });
      toast.success('Submit đơn hàng thành công! Đơn đã được chuyển vào quy trình xử lý.');
      setDetailModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Không thể submit đơn hàng');
    },
  });

  // Mutation to cancel an order
  const { mutate: cancelOrderMutate, isPending: isCancelling } = useMutation({
    mutationFn: ({ orderId, reason }: { orderId: string; reason?: string }) =>
      orderService.cancelOrder(orderId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant-orders'] });
      toast.success('Hủy đơn hàng thành công!');
      closeCancelModal();
      setDetailModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Không thể hủy đơn hàng');
    },
  });

  const handleFilterChange = (newFilters: OrderFilterValues) => {
    setFilters(newFilters);
    setPage(1); // Reset to page 1 when filter changes
  };

  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order);
    setDetailModalOpen(true);
  };

  const openCancelModal = (order: Order) => {
    setCancelModal({
      open: true,
      orderId: order.id,
      orderCode: order.orderCode || order.id.slice(0, 8),
      note: '',
    });
  };

  const closeCancelModal = () => {
    setCancelModal({
      open: false,
      orderId: null,
      orderCode: '',
      note: '',
    });
  };

  const handleConfirmCancel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelModal.orderId) return;
    if (!cancelModal.note.trim()) {
      toast.error('Vui lòng nhập lý do hủy đơn hàng.');
      return;
    }

    cancelOrderMutate({
      orderId: cancelModal.orderId,
      reason: cancelModal.note.trim(),
    });
  };

  const handleCompletePreparing = (orderId: string) => {
    updateStatus({
      orderId,
      status: 'Delivering',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const orders = data?.items || [];
  const totalItems = data?.totalCount || 0;
  const totalPages = Math.ceil(totalItems / PAGE_SIZE) || 1;
  const isAnyActionPending = isUpdating || isSubmitting || isCancelling;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-amber-500/10 text-amber-500 rounded-2xl">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                Quản lý Đơn hàng
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Theo dõi và xử lý đơn hàng cho nhà hàng của bạn
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => refetch()}
          disabled={isLoading || isAnyActionPending}
          className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium rounded-xl transition-all disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Làm mới</span>
        </button>
      </div>

      {/* Filter Component */}
      <OrderFilterBar filters={filters} onFilterChange={handleFilterChange} />

      {/* Main Table Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Error State */}
        {isError && (
          <div className="p-12 text-center space-y-3">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Không thể tải danh sách đơn hàng
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Đã xảy ra lỗi khi kết nối đến máy chủ. Vui lòng kiểm tra lại kết nối hoặc nhấn nút Làm mới.
            </p>
            <button
              onClick={() => refetch()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-xl transition-all cursor-pointer"
            >
              Thử lại
            </button>
          </div>
        )}

        {/* Loading Skeleton */}
        {isLoading && !isError && (
          <div className="divide-y divide-slate-200/70 dark:divide-slate-800 animate-pulse">
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4">
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/4"></div>
            </div>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="p-4 flex items-center justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3"></div>
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/4"></div>
                </div>
                <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-20"></div>
                <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-28"></div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !isError && orders.length === 0 && (
          <div className="p-16 text-center space-y-4">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-400">
              <FileText className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Chưa có đơn hàng nào
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                {filters.search || filters.status
                  ? 'Không tìm thấy đơn hàng phù hợp với bộ lọc hiện tại.'
                  : 'Danh sách đơn hàng của bạn đang trống.'}
              </p>
            </div>
          </div>
        )}

        {/* Data Table */}
        {!isLoading && !isError && orders.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Mã Đơn</th>
                  <th className="py-3.5 px-4">Thời gian đặt</th>
                  <th className="py-3.5 px-4">Tổng tiền</th>
                  <th className="py-3.5 px-4">Trạng thái</th>
                  <th className="py-3.5 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800 text-sm">
                {orders.map((order) => {
                  const statusLower = (order.status || '').toLowerCase().trim();
                  const isDraftOrPending = ['draft', 'pending', 'waitinginventory', 'waitingstock'].includes(statusLower);
                  const isPreparing = statusLower === 'preparing';
                  const canCancel = ['draft', 'pending', 'waitingpayment', 'waitingstock', 'waitinginventory', 'confirmed', 'preparing'].includes(statusLower);

                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      {/* Mã Đơn */}
                      <td className="py-4 px-4 font-semibold text-slate-900 dark:text-slate-100">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-amber-600 dark:text-amber-400">
                            #{order.orderCode || order.id.slice(0, 8)}
                          </span>
                        </div>
                      </td>

                      {/* Thời gian */}
                      <td className="py-4 px-4 text-slate-600 dark:text-slate-400 text-xs">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{formatDate(order.creationTime || order.createdAt || '')}</span>
                        </div>
                      </td>

                      {/* Tổng tiền */}
                      <td className="py-4 px-4 font-bold text-slate-900 dark:text-slate-100">
                        {formatCurrency(order.totalAmount)}
                      </td>

                      {/* Trạng thái */}
                      <td className="py-4 px-4">
                        <StatusBadge status={order.status} type="order" />
                      </td>

                      {/* Thao tác */}
                      <td className="py-4 px-4 text-right">
                        <div className="inline-flex items-center justify-end gap-1.5 flex-wrap">
                          {/* 1. Nút Xem chi tiết */}
                          <button
                            type="button"
                            onClick={() => handleViewDetails(order)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg transition-all cursor-pointer"
                            title="Xem thông tin chi tiết đơn hàng"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Chi tiết</span>
                          </button>

                          {/* 2. Nút Submit đơn (nếu là Draft / Pending / Chờ xác nhận) */}
                          {isDraftOrPending && (
                            <button
                              type="button"
                              onClick={() => submitOrder(order.id)}
                              disabled={isAnyActionPending}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-xs transition-all cursor-pointer"
                              title="Submit đơn hàng vào quy trình"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>Submit</span>
                            </button>
                          )}

                          {/* 3. Nút Chuẩn bị xong (nếu là Preparing) */}
                          {isPreparing && (
                            <button
                              type="button"
                              onClick={() => handleCompletePreparing(order.id)}
                              disabled={isAnyActionPending}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-xs transition-all cursor-pointer"
                              title="Đánh dấu đã chế biến xong, chuyển sang đang giao"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Xong</span>
                            </button>
                          )}

                          {/* 4. Nút Hủy đơn */}
                          {canCancel && (
                            <button
                              type="button"
                              onClick={() => openCancelModal(order)}
                              disabled={isAnyActionPending}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-red-500/10 hover:bg-red-500 text-red-600 hover:text-white border border-red-500/30 disabled:opacity-50 text-xs font-semibold rounded-lg transition-all cursor-pointer"
                              title="Hủy đơn hàng này"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Hủy</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer & Pagination */}
        {!isLoading && !isError && orders.length > 0 && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
              itemLabel="đơn hàng"
              accentColor="amber"
            />
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      <OrderDetailModal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        orderSummary={selectedOrder}
        onOpenCancel={openCancelModal}
        onSubmitOrder={(id) => submitOrder(id)}
        onCompletePreparing={handleCompletePreparing}
        isActionLoading={isAnyActionPending}
      />

      {/* Cancel Order Modal */}
      <Modal
        isOpen={cancelModal.open}
        onClose={closeCancelModal}
        title={`Hủy đơn hàng #${cancelModal.orderCode}`}
        maxWidth="md"
      >
        <form onSubmit={handleConfirmCancel} className="space-y-4">
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-600 dark:text-red-400 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Hành động này không thể hoàn tác. Bạn bắt buộc phải nhập lý do hủy để thông báo cho khách hàng.
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Lý do hủy đơn <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              value={cancelModal.note}
              onChange={(e) =>
                setCancelModal((prev) => ({ ...prev, note: e.target.value }))
              }
              placeholder="Ví dụ: Hết nguyên liệu, nhà hàng quá tải..."
              className="w-full p-3 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-hidden focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={closeCancelModal}
              disabled={isAnyActionPending}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
            >
              Bỏ qua
            </button>

            <button
              type="submit"
              disabled={isAnyActionPending || !cancelModal.note.trim()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer"
            >
              {isCancelling ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang xử lý...</span>
                </>
              ) : (
                <span>Xác nhận Hủy</span>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
