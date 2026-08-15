'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  User,
  ShoppingBag,
  ChevronLeft,
  Loader2,
  AlertCircle,
  Sparkles,
  Truck,
  FileCheck,
  RefreshCw,
  Receipt,
  Store,
  CreditCard,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { OrderDto, OrderStatus, PaymentDto } from '@/src/types/order.type';
import { getOrderById } from '@/src/lib/api/order';
import { getPaymentByOrderId } from '@/src/lib/api/payment';
import { useToast } from '@/src/components/shared/ToastProvider';
import OrderStatusStepper from '@/src/components/shared/OrderStatusStepper';

interface PageProps {
  params: Promise<{ orderId: string }>;
}

export default function OrderDetailPage({ params }: PageProps) {
  const { orderId } = use(params);
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();
  const { success, error: toastError } = useToast();

  const [order, setOrder] = useState<OrderDto | null>(null);
  const [payment, setPayment] = useState<PaymentDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch Order Data & Payment Info
  const loadOrder = async (isManualRefresh = false) => {
    if (authStatus === 'loading') return;

    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setErrorMessage(null);

    try {
      const data = await getOrderById(orderId);
      if (!data) {
        throw new Error('Không tìm thấy thông tin đơn hàng này hoặc phiên đăng nhập đã hết hạn.');
      }
      setOrder(data);

      // Check and fetch payment session if waiting for payment
      const orderStatusLower = data.status?.toLowerCase() || '';
      if (orderStatusLower === 'waitingpayment' || orderStatusLower === 'pending' || orderStatusLower === 'draft') {
        const paymentData = await getPaymentByOrderId(orderId);
        if (paymentData) {
          setPayment(paymentData);
        }
      }

      if (isManualRefresh) {
        success('Đã cập nhật trạng thái đơn hàng mới nhất');
      }
    } catch (err: any) {
      console.error('Fetch order error:', err);
      setErrorMessage(err.message || 'Không thể tải thông tin đơn hàng');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadOrder();
  }, [orderId, session?.accessToken, authStatus]);

  const getStatusBadge = (status?: OrderStatus | string) => {
    const s = status?.toLowerCase() || '';

    if (s === 'draft') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
          <Clock className="w-3.5 h-3.5 text-amber-500" />
          Đơn hàng nháp
        </span>
      );
    }
    if (s === 'waitingpayment') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300 animate-pulse">
          <Clock className="w-3.5 h-3.5 text-amber-600" />
          Chờ thanh toán
        </span>
      );
    }
    if (s === 'submitted' || s === 'pending') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
          <FileCheck className="w-3.5 h-3.5 text-blue-500" />
          Đã gửi đơn hàng
        </span>
      );
    }
    if (s === 'confirmed' || s === 'awaitingrestaurantacceptance') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          Quán tiếp nhận
        </span>
      );
    }
    if (s === 'preparing') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-orange-50 text-orange-700 border border-orange-200">
          <Sparkles className="w-3.5 h-3.5 text-orange-500" />
          Đang chuẩn bị
        </span>
      );
    }
    if (s === 'delivering' || s === 'ontheway') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
          <Truck className="w-3.5 h-3.5 text-purple-500" />
          Đang giao hàng
        </span>
      );
    }
    if (s === 'delivered' || s === 'completed') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          Giao hàng thành công
        </span>
      );
    }
    if (s === 'cancelled' || s === 'rejected' || s === 'refunded') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
          <AlertCircle className="w-3.5 h-3.5 text-red-500" />
          Đã hủy
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
        {status}
      </span>
    );
  };

  const handleProceedToPayment = () => {
    const finalAmount = order?.totalAmount || 0;
    const targetPaymentId = payment?.id || '';

    // If payment record already exists, pass its id
    const sandboxUrl = `/payment/sandbox?paymentId=${targetPaymentId}&orderId=${orderId}&amount=${finalAmount}`;
    router.push(sandboxUrl);
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3 bg-[#fdfbf7]">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
        <p className="text-sm font-bold text-slate-600">Đang tải thông tin đơn hàng...</p>
      </div>
    );
  }

  if (errorMessage || !order) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 rounded-3xl bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-slate-900 mb-2">
          Không tìm thấy đơn hàng
        </h2>
        <p className="text-sm text-slate-500 mb-6">
          {errorMessage || 'Đơn hàng không tồn tại hoặc bạn chưa có quyền truy cập.'}
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/orders"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-bold text-sm rounded-full shadow-2xs"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Lịch sử đơn hàng</span>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold text-sm rounded-full shadow-md shadow-orange-500/25"
          >
            <span>Về trang chủ</span>
          </Link>
        </div>
      </div>
    );
  }

  const items = order.items || [];
  const address = order.deliveryAddress;
  const itemsSubtotal = items.reduce((sum, i) => sum + (i.totalPrice || i.unitPrice * i.quantity || 0), 0);
  const deliveryFee = 15000;
  const totalAmount = order.totalAmount || (itemsSubtotal + deliveryFee);
  const isWaitingPayment = order.status?.toLowerCase() === 'waitingpayment';

  return (
    <div className="min-h-screen bg-[#fdfbf7] py-8 sm:py-12 text-slate-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Navigation & Refresh Bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link
              href="/orders"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-orange-600 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Lịch sử đơn hàng</span>
            </Link>
            <span className="text-slate-300">/</span>
            <Link
              href="/"
              className="text-xs font-bold text-slate-400 hover:text-slate-600"
            >
              Trang chủ
            </Link>
          </div>

          <button
            type="button"
            onClick={() => loadOrder(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-600 hover:text-orange-600 hover:border-orange-200 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-orange-500' : ''}`} />
            <span>Làm mới trạng thái</span>
          </button>
        </div>

        {/* Order Header Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-orange-100 shadow-xs mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                <span>Mã đơn hàng:</span>
                <span className="font-mono text-slate-900 font-bold tracking-normal">
                  #{order.orderCode || order.id}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Chi tiết Đơn hàng
              </h1>
              {order.creationTime && (
                <p className="text-xs text-slate-400 mt-1">
                  Thời gian đặt: {new Date(order.creationTime).toLocaleString('vi-VN')}
                </p>
              )}
            </div>

            <div className="self-start sm:self-center">
              {getStatusBadge(order.status)}
            </div>
          </div>

          {/* Real-time Order Status Stepper */}
          <div className="py-6 border-b border-slate-100">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4">
              Tiến trình xử lý đơn hàng
            </h3>
            <OrderStatusStepper currentStatus={order.status} />

            {/* Waiting Payment Banner Alert & CTA */}
            {isWaitingPayment && (
              <div className="mt-6 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border border-amber-300 rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-start gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-orange-500/25 mt-0.5">
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                      <span>Đơn hàng đang chờ thanh toán</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 font-extrabold">
                        {Number(totalAmount).toLocaleString('vi-VN')}đ
                      </span>
                    </h4>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      Vui lòng hoàn tất thanh toán trên Cổng thanh toán Sandbox để nhà hàng tiếp nhận và chuẩn bị món ăn cho bạn.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleProceedToPayment}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white text-xs font-black rounded-2xl shadow-lg shadow-orange-500/30 active:scale-98 transition-all shrink-0 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Thanh toán ngay</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Delivery & Payment Information */}
          <div className="py-6 border-b border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Delivery Address */}
            <div>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-orange-500" />
                <span>Địa chỉ nhận hàng</span>
              </h3>
              {address ? (
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-sm space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-slate-900">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>{address.receiverName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600 text-xs font-medium">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{address.phoneNumber}</span>
                  </div>
                  <p className="text-xs text-slate-600 pt-1 leading-relaxed">
                    {address.addressLine}, {address.ward}, {address.district}, {address.province}
                  </p>
                  {address.note && (
                    <p className="text-[11px] text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg mt-1 font-medium border border-amber-200/40">
                      Ghi chú: {address.note}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">Chưa có thông tin địa chỉ</p>
              )}
            </div>

            {/* Payment & Order Notice */}
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-orange-500" />
                  <span>Phương thức thanh toán</span>
                </h3>
                <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">Mock Payment</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-200">
                      🧪 Sandbox
                    </span>
                  </div>
                  {isWaitingPayment ? (
                    <button
                      type="button"
                      onClick={handleProceedToPayment}
                      className="text-xs font-bold text-orange-600 hover:text-orange-700 underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>Chưa thanh toán (Thanh toán ngay)</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  ) : (
                    <span className="text-xs font-bold text-emerald-600">
                      Đã thanh toán (Mock)
                    </span>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <ShoppingBag className="w-3.5 h-3.5 text-orange-500" />
                  <span>Ghi chú đơn</span>
                </h3>
                <div className="bg-orange-50/50 rounded-2xl p-3.5 border border-orange-100/80 text-xs text-slate-600">
                  <p className="font-bold text-orange-950">
                    {isWaitingPayment
                      ? 'Đơn hàng đang chờ bạn thanh toán trên cổng Sandbox.'
                      : 'Đơn hàng đã được tiếp nhận và chuyển đến nhà hàng xử lý.'}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Thời gian giao hàng dự kiến: 20 - 30 phút kể từ lúc quán xác nhận.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Ordered Food Items List */}
          <div className="pt-6">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5 text-orange-500" />
              <span>Danh sách món ăn ({items.length})</span>
            </h3>

            <div className="divide-y divide-slate-100">
              {items.map((item, idx) => (
                <div key={idx} className="py-3.5 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-slate-900">
                      {item.foodName || 'Món ăn'}
                    </h4>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {item.selectedVariantName && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-orange-50 text-orange-700 border border-orange-200/60">
                          {item.selectedVariantName}
                        </span>
                      )}
                      {item.selectedToppings?.map((topping, tIdx) => (
                        <span
                          key={tIdx}
                          className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600"
                        >
                          +{topping}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="text-xs text-slate-500 font-medium">
                    {Number(item.unitPrice || 0).toLocaleString('vi-VN')}đ × {item.quantity}
                  </div>

                  <div className="text-sm font-black text-slate-900 text-right min-w-[90px]">
                    {Number(item.totalPrice || item.unitPrice * item.quantity || 0).toLocaleString(
                      'vi-VN'
                    )}
                    đ
                  </div>
                </div>
              ))}
            </div>

            {/* Bill Calculations */}
            <div className="mt-6 pt-4 border-t border-slate-100 space-y-2 text-xs">
              <div className="flex justify-between text-slate-500 font-medium">
                <span>Tạm tính tiền món:</span>
                <span className="font-bold text-slate-800">
                  {itemsSubtotal.toLocaleString('vi-VN')}đ
                </span>
              </div>
              <div className="flex justify-between text-slate-500 font-medium">
                <span>Phí giao hàng:</span>
                <span className="font-bold text-slate-800">
                  {deliveryFee.toLocaleString('vi-VN')}đ
                </span>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-sm font-bold text-slate-800">Tổng cộng đơn hàng:</span>
                <span className="text-xl font-black text-orange-600">
                  {Number(totalAmount).toLocaleString('vi-VN')}đ
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
