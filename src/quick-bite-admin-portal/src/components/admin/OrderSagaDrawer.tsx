import React from 'react';
import { X, ShoppingBag, Clock, CheckCircle2, AlertTriangle, MapPin, User, Store } from 'lucide-react';
import type { ExtendedOrder } from '../../services/orderService';
import { StatusBadge } from '../common/StatusBadge';

interface OrderSagaDrawerProps {
  order: ExtendedOrder | null;
  isOpen: boolean;
  onClose: () => void;
}

export const OrderSagaDrawer: React.FC<OrderSagaDrawerProps> = ({ order, isOpen, onClose }) => {
  if (!isOpen || !order) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden select-none">
      {/* Backdrop */}
      <div onClick={onClose} className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity" />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col justify-between">
          {/* Header */}
          <div className="px-6 py-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-amber-400" />
              <div>
                <h3 className="text-sm font-extrabold text-white font-mono">{order.orderCode}</h3>
                <p className="text-[10px] text-slate-400">Tạo lúc: {order.createdAt ? new Date(order.createdAt).toLocaleString('vi-VN') : 'N/A'}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white bg-slate-800/80 rounded-xl transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Body Scrollable */}
          <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
            {/* Status overview */}
            <div className="bg-slate-950/60 border border-slate-800 p-3.5 rounded-2xl flex items-center justify-between">
              <span className="text-slate-400 font-bold">Trạng Thái Đơn Hàng:</span>
              <StatusBadge status={order.status} type="order" />
            </div>

            {/* Thông tin Khách hàng & Nhà hàng */}
            <div className="space-y-3 bg-slate-950/40 border border-slate-800/80 p-4 rounded-2xl">
              <div className="flex items-center gap-2 text-slate-200 font-bold border-b border-slate-800 pb-2">
                <User className="w-4 h-4 text-cyan-400" />
                <span>Khách hàng:</span>
                <span className="text-cyan-300 font-extrabold">{order.customerName || 'Khách hàng'}</span>
              </div>

              <div className="flex items-center gap-2 text-slate-200 font-bold border-b border-slate-800 pb-2">
                <Store className="w-4 h-4 text-amber-400" />
                <span>Nhà hàng:</span>
                <span className="text-amber-300 font-extrabold">{order.restaurantName || 'Nhà hàng'}</span>
              </div>

              <div className="flex items-start gap-2 text-slate-300">
                <MapPin className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>
                  {typeof order.deliveryAddress === 'string'
                    ? order.deliveryAddress
                    : order.deliveryAddress
                    ? `${order.deliveryAddress.addressLine || ''} ${order.deliveryAddress.district || ''}`
                    : 'N/A'}
                </span>
              </div>
            </div>

            {/* Order Items Table */}
            <div className="space-y-2">
              <h4 className="font-extrabold text-slate-200 uppercase tracking-wider text-[11px]">Danh Sách Món Ăn</h4>
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-800/60">
                {order.items.map((item) => (
                  <div key={item.id} className="p-3 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-200">{item.foodName || item.productName}</p>
                      <p className="text-[10px] text-slate-400">
                        {item.quantity} x {item.unitPrice.toLocaleString('vi-VN')}đ
                      </p>
                    </div>
                    <span className="font-bold text-amber-400 font-mono">
                      {item.totalPrice.toLocaleString('vi-VN')}đ
                    </span>
                  </div>
                ))}
                <div className="p-3 bg-slate-900 flex items-center justify-between font-extrabold text-slate-100">
                  <span>Tổng Tiền Đơn Hàng:</span>
                  <span className="text-amber-400 text-sm font-mono">{order.totalAmount.toLocaleString('vi-VN')}đ</span>
                </div>
              </div>
            </div>

            {/* Order Saga Pattern Timeline */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h4 className="font-extrabold text-purple-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-purple-400" /> Saga State Machine Visualizer
                </h4>
                <span className="text-[10px] font-mono text-purple-400 px-2 py-0.5 bg-purple-500/10 rounded border border-purple-500/30">
                  State: {order.sagaState || 'N/A'}
                </span>
              </div>

              <div className="space-y-3 pl-2 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
                {(order.timeline || []).map((step, idx) => {
                  const isDone = step.status === 'done';
                  const isActive = step.status === 'active';
                  const isFailed = step.status === 'failed';

                  return (
                    <div key={idx} className="relative pl-7 flex items-start justify-between group">
                      <span
                        className={`absolute left-0 top-0.5 w-7 h-7 rounded-full flex items-center justify-center border text-[10px] font-bold ${
                          isDone
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-emerald-500/20'
                            : isActive
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 animate-pulse'
                            : isFailed
                            ? 'bg-red-500/20 text-red-400 border-red-500/50'
                            : 'bg-slate-900 text-slate-600 border-slate-800'
                        }`}
                      >
                        {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : isFailed ? <AlertTriangle className="w-3.5 h-3.5" /> : idx + 1}
                      </span>

                      <div>
                        <p className={`font-bold ${isDone ? 'text-slate-200' : isActive ? 'text-amber-300' : isFailed ? 'text-red-400' : 'text-slate-500'}`}>
                          {step.step}
                        </p>
                      </div>

                      <span className="text-[10px] font-mono text-slate-500 shrink-0 ml-2">{step.timestamp}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 bg-slate-950/80 border-t border-slate-800 text-right">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-all cursor-pointer"
            >
              Đóng Cửa Sổ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
