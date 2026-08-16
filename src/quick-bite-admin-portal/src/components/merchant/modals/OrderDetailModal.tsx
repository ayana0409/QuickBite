import {
  X,
  Clock,
  MapPin,
  Phone,
  User,
  ShoppingBag,
  Send,
  CheckCircle2,
  XCircle,
  Receipt,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import type { Order, DeliveryAddressDetails } from '../../../types';
import { StatusBadge } from '../../common/StatusBadge';
import { orderService } from '../../../services/orderService';

interface OrderDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderSummary: Order | null;
  onOpenCancel: (order: Order) => void;
  onSubmitOrder: (orderId: string) => void;
  onCompletePreparing: (orderId: string) => void;
  isActionLoading?: boolean;
}

export default function OrderDetailModal({
  isOpen,
  onClose,
  orderSummary,
  onOpenCancel,
  onSubmitOrder,
  onCompletePreparing,
  isActionLoading = false,
}: OrderDetailModalProps) {
  // Fetch full order details when modal opens
  const { data: orderDetail, isLoading, isError, refetch } = useQuery({
    queryKey: ['merchant-order-detail', orderSummary?.id],
    queryFn: () => orderService.getOrderById(orderSummary!.id),
    enabled: isOpen && !!orderSummary?.id,
    staleTime: 1000 * 30, // 30 seconds
  });

  if (!isOpen || !orderSummary) return null;

  // Use full details if available, otherwise fallback to summary data to prevent flicker
  const order = orderDetail || orderSummary;
  const items = order.items || [];
  const statusLower = (order.status || '').toLowerCase().trim();

  // Status conditions
  const isDraftOrPending = ['draft', 'pending', 'waitinginventory', 'waitingstock'].includes(statusLower);
  const isPreparing = statusLower === 'preparing';
  const canCancel = ['draft', 'pending', 'waitingpayment', 'waitingstock', 'waitinginventory', 'confirmed', 'preparing'].includes(statusLower);

  // Address parsing
  let addressObj: DeliveryAddressDetails | null = null;
  if (typeof order.deliveryAddress === 'object' && order.deliveryAddress !== null) {
    addressObj = order.deliveryAddress as DeliveryAddressDetails;
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const formatDate = (dateStr?: string) => {
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

  const itemsSubtotal = items.reduce(
    (sum, item) => sum + (item.totalPrice || item.unitPrice * item.quantity || 0),
    0
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 text-amber-500 rounded-2xl">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 font-mono">
                  #{order.orderCode || order.id.slice(0, 8)}
                </h2>
                <StatusBadge status={order.status} type="order" />
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                <Clock className="w-3.5 h-3.5" />
                <span>Đặt lúc: {formatDate(order.creationTime || order.createdAt)}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-200/60 dark:bg-slate-700/60 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-900 dark:text-slate-100 text-sm">
          {/* Customer & Delivery Address Card */}
          <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider">
              <MapPin className="w-4 h-4 text-amber-500" />
              <span>Thông tin Giao hàng & Khách hàng</span>
            </div>

            {addressObj ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                <div>
                  <div className="text-slate-500 dark:text-slate-400">Người nhận:</div>
                  <div className="font-bold text-slate-900 dark:text-slate-100 mt-0.5 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>{addressObj.receiverName || addressObj.fullName || 'Khách hàng'}</span>
                  </div>
                </div>

                <div>
                  <div className="text-slate-500 dark:text-slate-400">Số điện thoại:</div>
                  <div className="font-bold text-slate-900 dark:text-slate-100 mt-0.5 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{addressObj.phoneNumber || 'N/A'}</span>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <div className="text-slate-500 dark:text-slate-400">Địa chỉ giao:</div>
                  <div className="text-slate-800 dark:text-slate-200 mt-0.5 leading-relaxed font-medium">
                    {addressObj.addressLine}
                    {addressObj.ward ? `, ${addressObj.ward}` : ''}
                    {addressObj.district ? `, ${addressObj.district}` : ''}
                    {addressObj.province ? `, ${addressObj.province}` : ''}
                  </div>
                  {addressObj.note && (
                    <div className="text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-lg mt-1.5 text-[11px] font-medium border border-amber-200/50 dark:border-amber-900/50">
                      Ghi chú: {addressObj.note}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-600 dark:text-slate-300">
                {typeof order.deliveryAddress === 'string'
                  ? order.deliveryAddress
                  : 'Chưa có thông tin địa chỉ giao hàng'}
              </div>
            )}
          </div>

          {/* Ordered Food Items */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <ShoppingBag className="w-4 h-4 text-amber-500" />
              <span>Danh sách món ({items.length})</span>
            </h4>

            <div className="border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <div className="p-8 flex flex-col items-center justify-center space-y-3 text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
                  <span className="text-xs font-medium">Đang tải danh sách món ăn...</span>
                </div>
              ) : isError ? (
                <div className="p-8 flex flex-col items-center justify-center space-y-2 text-red-500">
                  <AlertCircle className="w-6 h-6" />
                  <span className="text-xs font-medium text-center">Không thể tải thông tin món ăn.<br/>Vui lòng thử lại sau.</span>
                </div>
              ) : items.length === 0 ? (
                <div className="p-8 flex flex-col items-center justify-center text-slate-400">
                  <span className="text-xs font-medium">Chưa có thông tin món ăn</span>
                </div>
              ) : (
                items.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 flex items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                        {item.foodName || item.productName || 'Món ăn'}
                      </div>

                      <div className="flex flex-wrap gap-1 mt-1">
                        {item.selectedVariantName && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            {item.selectedVariantName}
                          </span>
                        )}
                        {item.selectedToppings?.map((topping, tIdx) => (
                          <span
                            key={tIdx}
                            className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                          >
                            +{topping}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      {formatCurrency(item.unitPrice || 0)} × {item.quantity}
                    </div>

                    <div className="text-sm font-bold text-slate-900 dark:text-slate-100 min-w-[90px] text-right font-mono">
                      {formatCurrency(item.totalPrice || item.unitPrice * item.quantity || 0)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Pricing Summary */}
          <div className="bg-slate-50/60 dark:bg-slate-800/30 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 space-y-2 text-xs">
            <div className="flex justify-between text-slate-500 dark:text-slate-400">
              <span>Tạm tính tiền món:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {formatCurrency(itemsSubtotal)}
              </span>
            </div>

            <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex justify-between items-center text-sm">
              <span className="font-bold text-slate-900 dark:text-slate-100">
                Tổng thanh toán:
              </span>
              <span className="text-base font-black text-amber-600 dark:text-amber-400 font-mono">
                {formatCurrency(order.totalAmount)}
              </span>
            </div>
          </div>
        </div>

        {/* Modal Action Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 flex-wrap">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Đóng
          </button>

          <div className="flex items-center gap-2">
            {/* 1. Submit Order Button (for Draft / Pending orders) */}
            {isDraftOrPending && (
              <button
                type="button"
                onClick={() => onSubmitOrder(order.id)}
                disabled={isActionLoading}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md shadow-amber-500/20 active:scale-98 transition-all cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit đơn hàng</span>
              </button>
            )}

            {/* 2. Complete Preparing Button (for Preparing orders) */}
            {isPreparing && (
              <button
                type="button"
                onClick={() => onCompletePreparing(order.id)}
                disabled={isActionLoading}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/20 active:scale-98 transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Chuẩn bị xong</span>
              </button>
            )}

            {/* 3. Cancel Order Button (if cancellable) */}
            {canCancel && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenCancel(order);
                }}
                disabled={isActionLoading}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md shadow-red-600/20 active:scale-98 transition-all cursor-pointer"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Hủy đơn</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
