import React from 'react';
import {
  X,
  MapPin,
  Phone,
  User,
  ShoppingBag,
  Clock,
  ShieldAlert,
  Calendar,
  Layers,
  FileText,
} from 'lucide-react';
import type { ExtendedOrder, OrderItem, OrderStatus, OrderStatusHistory } from '../../../types';
import { formatDateTime, formatVND } from '../../../utils/dateHelper';

interface OrderDetailDrawerProps {
  order: ExtendedOrder | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenForceCancel: () => void;
}

const getStatusBadge = (status: OrderStatus) => {
  switch (status) {
    case 'Completed':
      return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">Giao thành công</span>;
    case 'Cancelled':
      return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30">Đã hủy</span>;
    case 'Refunded':
      return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/30">Đã hoàn tiền</span>;
    case 'Delivering':
      return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30">Đang giao hàng</span>;
    case 'Preparing':
      return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">Đang chuẩn bị</span>;
    case 'Confirmed':
      return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">Đã xác nhận</span>;
    default:
      return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-700/50 text-slate-300 border border-slate-600/40">{status}</span>;
  }
};

export const OrderDetailDrawer: React.FC<OrderDetailDrawerProps> = ({
  order,
  isOpen,
  onClose,
  onOpenForceCancel,
}) => {
  if (!isOpen || !order) return null;

  const isCancellable =
    order.status !== 'Completed' &&
    order.status !== 'Cancelled' &&
    order.status !== 'Refunded';

  const deliveryObj =
    typeof order.deliveryAddress === 'object' && order.deliveryAddress !== null
      ? order.deliveryAddress
      : null;

  const receiverName = deliveryObj?.receiverName || deliveryObj?.fullName || order.customerName || 'Khách hàng';
  const phoneNumber = deliveryObj?.phoneNumber || '—';
  const addressLine = deliveryObj
    ? [deliveryObj.addressLine, deliveryObj.ward, deliveryObj.district, deliveryObj.province].filter(Boolean).join(', ')
    : typeof order.deliveryAddress === 'string'
    ? order.deliveryAddress
    : '—';

  return (
    <div className="fixed inset-0 z-[110] flex justify-end bg-black/70 backdrop-blur-sm transition-opacity duration-300">
      <div className="bg-slate-900 border-l border-slate-800 w-full max-w-2xl h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-white font-mono tracking-tight">
                  {order.orderCode}
                </h2>
                {getStatusBadge(order.status)}
              </div>
              <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                <Calendar className="w-3 h-3 text-slate-500" />
                <span>Tạo lúc: {formatDateTime(order.creationTime || order.createdAt)}</span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Top Section: Customer & Delivery Info */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-3">
            <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-4 h-4" />
              <span>Thông tin giao hàng & Khách nhận</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="flex items-start gap-2 text-slate-300">
                <User className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                <div>
                  <span className="text-slate-500 block text-[10px]">Người nhận:</span>
                  <span className="font-semibold text-slate-100">{receiverName}</span>
                </div>
              </div>

              <div className="flex items-start gap-2 text-slate-300">
                <Phone className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                <div>
                  <span className="text-slate-500 block text-[10px]">Số điện thoại:</span>
                  <span className="font-semibold text-slate-100">{phoneNumber}</span>
                </div>
              </div>

              <div className="sm:col-span-2 flex items-start gap-2 text-slate-300">
                <MapPin className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                <div>
                  <span className="text-slate-500 block text-[10px]">Địa chỉ giao:</span>
                  <span className="text-slate-200">{addressLine}</span>
                </div>
              </div>

              {deliveryObj?.note && (
                <div className="sm:col-span-2 flex items-start gap-2 text-slate-300 bg-slate-900/50 p-2.5 rounded-xl border border-slate-800">
                  <FileText className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-slate-500 block text-[10px]">Ghi chú giao hàng:</span>
                    <span className="text-slate-200 italic">{deliveryObj.note}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Items Breakdown Table */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>Danh sách món ăn ({order.items?.length || 0})</span>
            </h3>

            <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/50">
              <div className="divide-y divide-slate-800/80">
                {order.items && order.items.length > 0 ? (
                  order.items.map((item: OrderItem, idx: number) => (
                    <div key={idx} className="p-3.5 flex items-center justify-between text-xs">
                      <div className="space-y-1">
                        <div className="font-bold text-slate-100">
                          {item.foodName || item.productName || 'Món ăn'}
                        </div>
                        {item.selectedVariantName && (
                          <div className="text-[11px] text-cyan-400">
                            Size/Loại: {item.selectedVariantName}
                          </div>
                        )}
                        {item.selectedToppings && item.selectedToppings.length > 0 && (
                          <div className="text-[10px] text-slate-400">
                            Topping: {item.selectedToppings.join(', ')}
                          </div>
                        )}
                      </div>

                      <div className="text-right">
                        <div className="text-slate-400 text-[11px]">
                          {item.quantity} x {formatVND(item.unitPrice)}
                        </div>
                        <div className="font-bold text-slate-100">
                          {formatVND(item.totalPrice || item.quantity * item.unitPrice)}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-xs text-slate-500">
                    Không có thông tin chi tiết món
                  </div>
                )}
              </div>

              {/* Total Summary */}
              <div className="p-4 bg-slate-900/80 border-t border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Tổng thanh toán
                </span>
                <span className="text-base font-black text-amber-400 font-mono">
                  {formatVND(order.totalAmount)}
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Section: Status Timeline */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>Lịch sử trạng thái (Timeline)</span>
            </h3>

            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4">
              {order.statusHistories && order.statusHistories.length > 0 ? (
                <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
                  {order.statusHistories.map((hist: OrderStatusHistory, index: number) => (
                    <div key={hist.id || index} className="relative">
                      <div className="absolute -left-6 top-1.5 w-2.5 h-2.5 rounded-full bg-amber-400 ring-4 ring-slate-950" />
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1">
                        <div className="font-semibold text-slate-200">
                          {hist.fromStatus ? `${hist.fromStatus} ➔ ` : ''}
                          <span className="text-amber-300">{hist.toStatus}</span>
                        </div>
                        <span className="text-[11px] font-mono text-slate-500">
                          {formatDateTime(hist.changedAt)}
                        </span>
                      </div>
                      {hist.reason && (
                        <p className="text-[11px] text-slate-400 mt-0.5 italic">
                          Ghi chú: {hist.reason}
                        </p>
                      )}
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        Thực hiện bởi: {hist.changedBy || 'Hệ thống'}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-slate-400 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Trạng thái hiện tại:</span>
                    <span className="font-bold text-amber-400">{order.status}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>Thời gian khởi tạo:</span>
                    <span>{formatDateTime(order.creationTime || order.createdAt)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            Đóng
          </button>

          {isCancellable && (
            <button
              onClick={onOpenForceCancel}
              className="flex items-center gap-1.5 px-5 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-red-500/20 transition-all active:scale-95 cursor-pointer"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Hủy Đơn Khẩn Cấp (Force Cancel)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
