'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  ShoppingBag,
  Clock,
  MapPin,
  ChevronRight,
  ChevronLeft,
  Loader2,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  FileCheck,
  Sparkles,
  Truck,
  Receipt,
  Store,
  ArrowRight,
  CreditCard,
} from 'lucide-react';
import { OrderDto, OrderStatus } from '@/src/types/order.type';
import { getMyOrders } from '@/src/lib/api/order';
import { useToast } from '@/src/components/shared/ToastProvider';
import AuthModal from '@/src/components/shared/AuthModal';

export default function OrdersPage() {
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();
  const { error: toastError } = useToast();

  const [orders, setOrders] = useState<OrderDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const fetchOrders = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await getMyOrders();
      // Sort newest first
      const sorted = [...data].sort((a, b) => {
        const timeA = new Date(a.creationTime || 0).getTime();
        const timeB = new Date(b.creationTime || 0).getTime();
        return timeB - timeA;
      });
      setOrders(sorted);
    } catch (err: any) {
      console.error('Error fetching orders:', err);
      toastError('Không thể tải danh sách đơn hàng');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (authStatus === 'authenticated') {
      fetchOrders();
    } else if (authStatus === 'unauthenticated') {
      setLoading(false);
    }
  }, [authStatus]);

  const getStatusBadge = (status: OrderStatus | string) => {
    const s = status?.toLowerCase() || '';

    if (s === 'draft') {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
          <Clock className="w-3.5 h-3.5 text-amber-500" />
          Đơn nháp
        </span>
      );
    }
    if (s === 'submitted' || s === 'pending' || s === 'waitingpayment') {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
          <FileCheck className="w-3.5 h-3.5 text-blue-500" />
          {s === 'waitingpayment' ? 'Chờ thanh toán' : 'Đã gửi đơn'}
        </span>
      );
    }
    if (s === 'confirmed' || s === 'awaitingrestaurantacceptance') {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          Quán tiếp nhận
        </span>
      );
    }
    if (s === 'preparing') {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-orange-50 text-orange-700 border border-orange-200">
          <Sparkles className="w-3.5 h-3.5 text-orange-500" />
          Đang chuẩn bị
        </span>
      );
    }
    if (s === 'delivering' || s === 'ontheway') {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
          <Truck className="w-3.5 h-3.5 text-purple-500" />
          Đang giao hàng
        </span>
      );
    }
    if (s === 'delivered' || s === 'completed') {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          Giao thành công
        </span>
      );
    }
    if (s === 'cancelled' || s === 'rejected' || s === 'refunded') {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
          <AlertCircle className="w-3.5 h-3.5 text-red-500" />
          Đã hủy
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
        {status}
      </span>
    );
  };

  // State when not logged in
  if (authStatus === 'unauthenticated') {
    return (
      <div className="min-h-[75vh] bg-[#fdfbf7] flex flex-col items-center justify-center px-4 text-center">
        <div className="w-20 h-20 rounded-3xl bg-orange-50 text-orange-500 flex items-center justify-center mb-5 shadow-xs">
          <Receipt className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 mb-2">
          Đăng nhập để xem lịch sử đơn hàng
        </h2>
        <p className="text-sm text-slate-500 max-w-md mb-6">
          Vui lòng đăng nhập tài khoản QuickBite để theo dõi trạng thái đơn hàng và lịch sử mua sắm của bạn.
        </p>
        <button
          type="button"
          onClick={() => setAuthModalOpen(true)}
          className="px-8 py-3 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-black text-sm rounded-2xl shadow-lg shadow-orange-500/25 active:scale-98 transition-all cursor-pointer"
        >
          Đăng nhập ngay
        </button>

        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fdfbf7] py-8 sm:py-12 text-slate-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-orange-600 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Về trang chủ</span>
          </Link>

          <button
            type="button"
            onClick={() => fetchOrders(true)}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-600 hover:text-orange-600 hover:border-orange-200 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-orange-500' : ''}`} />
            <span>Làm mới</span>
          </button>
        </div>

        {/* Title Section */}
        <div className="flex items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Đơn hàng của tôi
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
              Quản lý và theo dõi tiến độ các đơn hàng bạn đã đặt tại QuickBite.
            </p>
          </div>

          {!loading && orders.length > 0 && (
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-orange-100 text-orange-800 border border-orange-200/60 shrink-0">
              {orders.length} đơn hàng
            </span>
          )}
        </div>

        {/* Loading Skeleton */}
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white rounded-3xl p-6 border border-slate-200/70 shadow-xs animate-pulse space-y-4"
              >
                <div className="flex justify-between items-center">
                  <div className="h-4 bg-slate-200 rounded-md w-36" />
                  <div className="h-6 bg-slate-200 rounded-full w-24" />
                </div>
                <div className="h-12 bg-slate-100 rounded-2xl w-full" />
                <div className="flex justify-between items-center pt-2">
                  <div className="h-4 bg-slate-200 rounded-md w-24" />
                  <div className="h-4 bg-slate-200 rounded-md w-20" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && orders.length === 0 && (
          <div className="bg-white rounded-3xl p-10 sm:p-14 border border-slate-200/80 text-center max-w-lg mx-auto shadow-xs">
            <div className="w-20 h-20 rounded-3xl bg-orange-50 text-orange-500 flex items-center justify-center mx-auto mb-5">
              <ShoppingBag className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2">
              Bạn chưa có đơn hàng nào
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mb-6 leading-relaxed">
              Các món ăn thơm ngon, nóng hổi đang chờ đón bạn. Hãy bắt đầu chọn món và đặt hàng ngay nhé!
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-black text-sm rounded-2xl shadow-lg shadow-orange-500/25 active:scale-98 transition-all"
            >
              <span>Khám phá món ngon ngay</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {/* Orders List */}
        {!loading && orders.length > 0 && (
          <div className="space-y-4">
            {orders.map((order) => {
              const items = order.items || [];
              const itemsPreview = items.slice(0, 2);
              const remainingCount = items.length - itemsPreview.length;
              const totalItems = items.reduce((sum, item) => sum + (item.quantity || 1), 0);

              return (
                <div
                  key={order.id}
                  onClick={() => router.push(`/order/${order.id}`)}
                  className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 hover:border-orange-300 shadow-xs hover:shadow-md transition-all cursor-pointer group"
                >
                  {/* Order Top: Code, Date & Status */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                        <Receipt className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            Mã đơn:
                          </span>
                          <span className="font-mono text-xs sm:text-sm font-bold text-slate-900">
                            {order.orderCode || order.id.slice(0, 8)}
                          </span>
                        </div>
                        {order.creationTime && (
                          <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                            <Clock className="w-3 h-3" />
                            <span>{new Date(order.creationTime).toLocaleString('vi-VN')}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="self-start sm:self-center">
                      {getStatusBadge(order.status)}
                    </div>
                  </div>

                  {/* Order Body: Items preview & Address */}
                  <div className="py-4 space-y-2">
                    <div className="text-xs sm:text-sm text-slate-800 font-medium">
                      {itemsPreview.map((item, idx) => (
                        <span key={idx}>
                          {item.quantity}x {item.foodName || 'Món ăn'}
                          {item.selectedVariantName ? ` (${item.selectedVariantName})` : ''}
                          {idx < itemsPreview.length - 1 ? ', ' : ''}
                        </span>
                      ))}
                      {remainingCount > 0 && (
                        <span className="text-slate-400 font-normal">
                          {' '}và {remainingCount} món khác
                        </span>
                      )}
                    </div>

                    {order.deliveryAddress?.addressLine && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">
                          Giao đến: {order.deliveryAddress.addressLine}, {order.deliveryAddress.ward},{' '}
                          {order.deliveryAddress.district}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Order Footer: Total Amount & CTA */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div className="text-xs text-slate-500">
                      <span>Tổng cộng ({totalItems} món): </span>
                      <span className="text-sm sm:text-base font-black text-orange-600 ml-1">
                        {Number(order.totalAmount || 0).toLocaleString('vi-VN')}đ
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      {order.status?.toLowerCase() === 'waitingpayment' && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/payment/sandbox?paymentId=&orderId=${order.id}&amount=${order.totalAmount || 0}`);
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold text-xs shadow-md shadow-orange-500/20 active:scale-95 transition-all cursor-pointer flex items-center gap-1"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Thanh toán ngay</span>
                        </button>
                      )}

                      <div className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 group-hover:text-orange-600 group-hover:translate-x-0.5 transition-all">
                        <span>Chi tiết</span>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-orange-500" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
