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
  Edit3,
  XCircle,
  RotateCcw,
  AlertTriangle,
  Star,
} from 'lucide-react';
import { OrderDto, OrderStatus, PaymentDto, DeliveryAddress } from '@/src/types/order.type';
import { getOrderById, cancelOrder } from '@/src/lib/api/order';
import { getPaymentByOrderId } from '@/src/lib/api/payment';
import { checkOrderReviewed } from '@/src/lib/api/review';
import { useToast } from '@/src/components/shared/ToastProvider';
import OrderStatusStepper from '@/src/components/shared/OrderStatusStepper';
import UpdateAddressModal from '@/src/components/shared/UpdateAddressModal';
import RefundOrderModal from '@/src/components/shared/RefundOrderModal';

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
  const [isReviewed, setIsReviewed] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modals state
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Fetch Order Data & Payment Info & Review Status
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

      const orderStatusLower = data.status?.toLowerCase() || '';

      // Check and fetch payment session if waiting for payment
      if (orderStatusLower === 'waitingpayment' || orderStatusLower === 'pending' || orderStatusLower === 'draft') {
        const paymentData = await getPaymentByOrderId(orderId);
        if (paymentData) {
          setPayment(paymentData);
        }
      }

      // Check if order has already been reviewed
      if (orderStatusLower === 'delivered' || orderStatusLower === 'completed') {
        const reviewed = await checkOrderReviewed(orderId);
        setIsReviewed(reviewed);
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

    if (s === 'draft' || s === 'waitinginventory' || s === 'waitingstock') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300">
          <Clock className="w-3.5 h-3.5 text-amber-600" />
          Chờ xác nhận
        </span>
      );
    }
    if (s === 'confirmed' || s === 'awaitingrestaurantacceptance' || s === 'submitted' || s === 'pending') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
          <FileCheck className="w-3.5 h-3.5 text-blue-500" />
          Đã xác nhận
        </span>
      );
    }
    if (s === 'waitingpayment') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-orange-50 text-orange-800 border border-orange-300 animate-pulse">
          <CreditCard className="w-3.5 h-3.5 text-orange-600" />
          Chờ thanh toán
        </span>
      );
    }
    if (s === 'preparing') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
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
    if (s === 'refunded') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
          <RotateCcw className="w-3.5 h-3.5 text-purple-600" />
          Đã hoàn tiền
        </span>
      );
    }
    if (s === 'cancelled' || s === 'rejected') {
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

    const sandboxUrl = `/payment/sandbox?paymentId=${targetPaymentId}&orderId=${orderId}&amount=${finalAmount}`;
    router.push(sandboxUrl);
  };

  // Handle Cancel Order Confirmation
  const handleConfirmCancel = async () => {
    if (!order) return;
    setCancelling(true);
    try {
      const res = await cancelOrder(order.id);
      if (res.success) {
        success('Đã hủy đơn hàng thành công!');
        setOrder({
          ...order,
          status: 'Cancelled',
        });
        setIsCancelConfirmOpen(false);
      } else {
        toastError(res.message || 'Không thể hủy đơn hàng');
      }
    } catch (err: any) {
      console.error('Cancel order error:', err);
      toastError('Lỗi kết nối khi gửi yêu cầu hủy đơn');
    } finally {
      setCancelling(false);
    }
  };

  const handleAddressUpdated = (newAddress: DeliveryAddress) => {
    if (order) {
      setOrder({
        ...order,
        deliveryAddress: newAddress,
      });
    }
  };

  const handleRefundSuccess = () => {
    if (order) {
      setOrder({
        ...order,
        status: 'Refunded',
      });
    }
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

  const statusLower = (order.status || '').toLowerCase().trim();
  const isWaitingPayment = statusLower === 'waitingpayment';

  // Rules for available actions
  const canUpdateAddress = ['draft', 'waitingpayment', 'pending', 'submitted', 'confirmed'].includes(statusLower);
  const canCancelOrder = ['draft', 'waitingpayment', 'pending', 'submitted', 'confirmed', 'preparing'].includes(statusLower);
  const canRefundOrder = ['delivered', 'completed'].includes(statusLower);
  const canReviewOrder = ['delivered', 'completed'].includes(statusLower);

  return (
    <div className="min-h-screen bg-[#fdfbf7] py-8 sm:py-12 text-slate-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Navigation & Action Bar */}
        <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
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

          <div className="flex items-center gap-2">
            {/* Review Button / Badge (available when delivered/completed) */}
            {canReviewOrder && (
              !isReviewed ? (
                <Link
                  href={`/order/${order.id}/review`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-bold shadow-md shadow-orange-500/20 active:scale-98 transition-all cursor-pointer"
                >
                  <Star className="w-3.5 h-3.5 fill-white text-white" />
                  <span>Đánh giá món ăn</span>
                </Link>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Đã đánh giá</span>
                </span>
              )
            )}

            {/* Cancel Button (available before delivery) */}
            {canCancelOrder && (
              <button
                type="button"
                onClick={() => setIsCancelConfirmOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-xs font-bold text-red-700 transition-all cursor-pointer"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Hủy đơn hàng</span>
              </button>
            )}

            {/* Refund Button (available when delivered/completed) */}
            {canRefundOrder && (
              <button
                type="button"
                onClick={() => setIsRefundModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-xs font-bold text-purple-700 shadow-2xs transition-all cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Yêu cầu hoàn tiền</span>
              </button>
            )}

            {/* Refresh Button */}
            <button
              type="button"
              onClick={() => loadOrder(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-600 hover:text-orange-600 hover:border-orange-200 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-orange-500' : ''}`} />
              <span>Làm mới</span>
            </button>
          </div>
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

            {/* Delivered / Completed Review Call To Action Banner */}
            {canReviewOrder && !isReviewed && (
              <div className="mt-6 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border border-amber-300/80 rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-start gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-400 to-orange-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-amber-500/25 mt-0.5">
                    <Star className="w-6 h-6 fill-white" />
                  </div>
                  <div>
                    <h4 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                      <span>Bạn thấy món ăn thế nào?</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 font-extrabold">
                        Đánh giá món
                      </span>
                    </h4>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      Hãy chia sẻ đánh giá về hương vị và trải nghiệm phục vụ để giúp nhà hàng hoàn thiện hơn và giúp các thực khách khác nhé!
                    </p>
                  </div>
                </div>

                <Link
                  href={`/order/${order.id}/review`}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-black rounded-2xl shadow-lg shadow-orange-500/25 active:scale-98 transition-all shrink-0 cursor-pointer"
                >
                  <Star className="w-4 h-4 fill-white" />
                  <span>Đánh giá ngay</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}

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
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-orange-500" />
                  <span>Địa chỉ nhận hàng</span>
                </h3>

                {/* Edit Address button if status permits */}
                {canUpdateAddress && (
                  <button
                    type="button"
                    onClick={() => setIsAddressModalOpen(true)}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Thay đổi</span>
                  </button>
                )}
              </div>

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
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-xs text-slate-400 italic">
                  Chưa có thông tin địa chỉ
                </div>
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
                  <span>Trạng thái đơn hàng</span>
                </h3>
                <div className="bg-orange-50/50 rounded-2xl p-3.5 border border-orange-100/80 text-xs text-slate-600">
                  <p className="font-bold text-orange-950">
                    {isWaitingPayment
                      ? 'Đơn hàng đang chờ bạn thanh toán trên cổng Sandbox.'
                      : statusLower === 'cancelled'
                        ? 'Đơn hàng đã bị hủy.'
                        : statusLower === 'refunded'
                          ? 'Đơn hàng đã được xử lý hoàn tiền thành công.'
                          : 'Đơn hàng đã được tiếp nhận và xử lý theo quy trình.'}
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

      {/* Update Address Modal */}
      <UpdateAddressModal
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        orderId={order.id}
        currentAddress={order.deliveryAddress}
        onSuccess={handleAddressUpdated}
      />

      {/* Refund Order Modal */}
      <RefundOrderModal
        isOpen={isRefundModalOpen}
        onClose={() => setIsRefundModalOpen(false)}
        orderId={order.id}
        totalAmount={totalAmount}
        onSuccess={handleRefundSuccess}
      />

      {/* Cancel Confirmation Modal */}
      {isCancelConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-red-100 text-center animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4 shadow-md shadow-red-500/20">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <h3 className="text-lg font-black text-slate-900 mb-1.5">
              Xác nhận hủy đơn hàng?
            </h3>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              Bạn có chắc chắn muốn hủy đơn hàng <strong>#{order.orderCode || order.id.slice(0, 8)}</strong> không? Thao tác này không thể hoàn tác.
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setIsCancelConfirmOpen(false)}
                disabled={cancelling}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Giữ lại đơn
              </button>

              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={cancelling}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-600/25 active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                {cancelling ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang hủy...</span>
                  </>
                ) : (
                  <span>Xác nhận hủy</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
