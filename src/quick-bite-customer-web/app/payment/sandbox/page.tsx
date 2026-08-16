'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  CreditCard,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  Loader2,
  Clock,
  ChevronLeft,
  Sparkles,
} from 'lucide-react';
import { processMockPayment, getPaymentByOrderId } from '@/src/lib/api/payment';
import { useToast } from '@/src/components/shared/ToastProvider';

function SandboxPaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { error: toastError } = useToast();

  const paramPaymentId = searchParams.get('paymentId') || '';
  const orderId = searchParams.get('orderId') || '';
  const rawAmount = searchParams.get('amount') || '0';

  const [activePaymentId, setActivePaymentId] = useState<string>(paramPaymentId);
  const [displayAmount, setDisplayAmount] = useState<number>(Number(rawAmount) || 0);
  const [loadingSession, setLoadingSession] = useState<boolean>(!paramPaymentId && !!orderId);
  const [processing, setProcessing] = useState(false);
  const [resultState, setResultState] = useState<'IDLE' | 'SUCCESS' | 'FAILED'>('IDLE');
  const [failureReason, setFailureReason] = useState<string>('');
  const [countdown, setCountdown] = useState(3);

  // Auto-resolve paymentId from orderId if not passed in URL
  useEffect(() => {
    async function resolvePayment() {
      if (!paramPaymentId && orderId) {
        setLoadingSession(true);
        try {
          const paymentData = await getPaymentByOrderId(orderId);
          if (paymentData?.id) {
            setActivePaymentId(paymentData.id);
            if (paymentData.amount) {
              setDisplayAmount(paymentData.amount);
            }
          }
        } catch (err) {
          console.error('Failed to resolve payment by orderId:', err);
        } finally {
          setLoadingSession(false);
        }
      }
    }
    resolvePayment();
  }, [paramPaymentId, orderId]);

  // Auto redirect countdown when success
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resultState === 'SUCCESS' && orderId) {
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            router.push(`/order/${orderId}`);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [resultState, orderId, router]);

  const handleSimulatePayment = async (isSuccess: boolean) => {
    if (!activePaymentId) {
      toastError('Không tìm thấy mã phiên thanh toán (paymentId)!');
      return;
    }

    setProcessing(true);
    try {
      const reason = isSuccess ? undefined : 'Thẻ bị từ chối / Khách hàng hủy giao dịch tại cổng Sandbox';
      const res = await processMockPayment(activePaymentId, isSuccess, reason);

      if (res.success) {
        if (isSuccess) {
          setResultState('SUCCESS');
        } else {
          setFailureReason(reason || 'Giao dịch bị từ chối');
          setResultState('FAILED');
        }
      } else {
        toastError(res.message || 'Không thể xử lý thanh toán giả lập');
        setProcessing(false);
      }
    } catch (err: any) {
      console.error('Error during mock payment:', err);
      toastError('Lỗi xử lý kết nối đến cổng thanh toán');
      setProcessing(false);
    }
  };

  if (loadingSession) {
    return (
      <div className="max-w-md mx-auto my-16 bg-white rounded-3xl p-10 border border-slate-200 shadow-sm text-center">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin mx-auto mb-3" />
        <h3 className="text-sm font-bold text-slate-800">Đang khởi tạo phiên thanh toán...</h3>
        <p className="text-xs text-slate-400 mt-1">Đang liên kết với mã đơn hàng #{orderId.slice(0, 8)}</p>
      </div>
    );
  }

  if (!activePaymentId) {
    return (
      <div className="max-w-md mx-auto my-12 bg-white rounded-3xl p-8 border border-red-200 shadow-sm text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-slate-900 mb-2">
          Chưa có phiên thanh toán
        </h2>
        <p className="text-xs text-slate-500 mb-6">
          Không tìm thấy phiên thanh toán cho đơn hàng này hoặc đơn hàng đã hoàn tất thanh toán.
        </p>
        <Link
          href={orderId ? `/order/${orderId}` : '/orders'}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white text-xs font-bold rounded-full hover:bg-slate-800 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Quay lại đơn hàng</span>
        </Link>
      </div>
    );
  }

  // Result: SUCCESS
  if (resultState === 'SUCCESS') {
    return (
      <div className="max-w-lg mx-auto my-8 bg-white rounded-3xl p-8 border border-emerald-200 shadow-lg text-center animate-in zoom-in-95 duration-200">
        <div className="w-20 h-20 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-5 shadow-md shadow-emerald-500/20">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 mb-3">
          🧪 Mock Payment Success
        </span>
        <h2 className="text-2xl font-black text-slate-900 mb-2">
          Thanh toán thành công!
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto mb-6">
          Giao dịch giả lập số tiền{' '}
          <strong className="text-emerald-700 font-bold">
            {displayAmount.toLocaleString('vi-VN')}đ
          </strong>{' '}
          đã được ghi nhận thành công vào hệ thống.
        </p>

        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-xs text-slate-600 mb-6 space-y-1 text-left">
          <div className="flex justify-between">
            <span className="text-slate-400">Mã thanh toán:</span>
            <span className="font-mono font-bold text-slate-800">{activePaymentId.slice(0, 16)}...</span>
          </div>
          {orderId && (
            <div className="flex justify-between">
              <span className="text-slate-400">Mã đơn hàng:</span>
              <span className="font-mono font-bold text-slate-800">{orderId.slice(0, 16)}...</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-slate-400">Trạng thái:</span>
            <span className="font-bold text-emerald-600">ĐÃ THANH TOÁN (SUCCESS)</span>
          </div>
        </div>

        <div className="flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={() => router.push(orderId ? `/order/${orderId}` : '/orders')}
            className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-black text-sm rounded-2xl shadow-lg shadow-emerald-500/25 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Xem chi tiết đơn hàng ngay</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <p className="text-[11px] text-slate-400 font-medium">
            Tự động chuyển tiếp sau <strong className="text-slate-700 font-bold">{countdown}s</strong>...
          </p>
        </div>
      </div>
    );
  }

  // Result: FAILED
  if (resultState === 'FAILED') {
    return (
      <div className="max-w-lg mx-auto my-8 bg-white rounded-3xl p-8 border border-red-200 shadow-lg text-center animate-in zoom-in-95 duration-200">
        <div className="w-20 h-20 rounded-3xl bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-5 shadow-md shadow-red-500/20">
          <XCircle className="w-10 h-10" />
        </div>
        <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200 mb-3">
          🧪 Mock Payment Rejected
        </span>
        <h2 className="text-2xl font-black text-slate-900 mb-2">
          Thanh toán thất bại!
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto mb-6">
          {failureReason || 'Giao dịch bị từ chối theo kịch bản giả lập thất bại. Đơn hàng đã được tự động chuyển sang trạng thái Hủy.'}
        </p>

        <div>
          <button
            type="button"
            onClick={() => router.push(orderId ? `/order/${orderId}` : '/orders')}
            className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Quay lại chi tiết đơn hàng</span>
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto my-6 sm:my-10 bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
      {/* Sandbox Top Warning Bar */}
      <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 px-6 py-3.5 text-white flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 shrink-0" />
          <span className="text-xs font-black uppercase tracking-wider">
            QuickBite Mock Payment Gateway (Sandbox)
          </span>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 uppercase">
          Môi trường test
        </span>
      </div>

      <div className="p-6 sm:p-8">
        {/* Notice */}
        <div className="mb-6 bg-amber-50 border border-amber-200/80 rounded-2xl p-4 text-xs text-amber-900 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Đây là cổng thanh toán giả lập dành cho kiểm thử. Bạn có thể chọn{' '}
            <strong>Thanh toán thành công</strong> hoặc <strong>Thanh toán thất bại</strong> để kiểm tra luồng xử lý của hệ thống QuickBite.
          </p>
        </div>

        {/* Amount to pay */}
        <div className="text-center pb-6 border-b border-slate-100">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Số tiền thanh toán
          </span>
          <div className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            {displayAmount.toLocaleString('vi-VN')}
            <span className="text-xl font-bold text-orange-600 ml-1">đ</span>
          </div>
          {orderId && (
            <div className="text-[11px] text-slate-400 font-mono mt-1">
              Đơn hàng: #{orderId}
            </div>
          )}
        </div>

        {/* Mock Credit Card Illustration */}
        <div className="my-6">
          <div className="w-full bg-gradient-to-tr from-slate-900 via-slate-800 to-slate-950 text-white rounded-3xl p-6 sm:p-7 shadow-xl shadow-slate-900/15 relative overflow-hidden">
            {/* Background decoration circles */}
            <div className="absolute -right-8 -bottom-8 w-36 h-36 rounded-full bg-white/5 pointer-events-none" />
            <div className="absolute right-12 -bottom-12 w-28 h-28 rounded-full bg-orange-500/10 pointer-events-none" />

            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2">
                <div className="w-8 h-6 rounded-md bg-amber-400/90 flex items-center justify-center">
                  <div className="w-6 h-4 border border-amber-600/40 rounded-xs" />
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  QuickBite Pay
                </span>
              </div>
              <CreditCard className="w-6 h-6 text-slate-400" />
            </div>

            <div className="font-mono text-lg sm:text-xl font-bold tracking-widest text-slate-200 mb-6">
              •••• •••• •••• 4242
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
              <div>
                <span className="text-[9px] uppercase tracking-wider block text-slate-500">Chủ thẻ</span>
                <span className="text-white font-bold tracking-wide">QUICKBITE TESTER</span>
              </div>
              <div>
                <span className="text-[9px] uppercase tracking-wider block text-slate-500">Hạn dùng</span>
                <span className="text-white font-bold">12/28</span>
              </div>
              <div>
                <span className="text-[9px] uppercase tracking-wider block text-slate-500">CVC</span>
                <span className="text-white font-bold">888</span>
              </div>
            </div>
          </div>
        </div>

        {/* 2 Decision Buttons */}
        <div className="space-y-3 pt-2">
          {/* Button 1: Simulate Success */}
          <button
            type="button"
            disabled={processing}
            onClick={() => handleSimulatePayment(true)}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-black text-sm shadow-lg shadow-emerald-500/25 active:scale-98 transition-all flex items-center justify-between group cursor-pointer disabled:opacity-60"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                {processing ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-white" />
                )}
              </div>
              <div className="text-left">
                <div className="text-sm font-black">Xác nhận Thanh toán Thành công</div>
                <div className="text-[11px] font-normal text-emerald-100">
                  Giả lập giao dịch hợp lệ ({displayAmount.toLocaleString('vi-VN')}đ)
                </div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform shrink-0" />
          </button>

          {/* Button 2: Simulate Failure */}
          <button
            type="button"
            disabled={processing}
            onClick={() => handleSimulatePayment(false)}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white font-black text-sm shadow-lg shadow-red-500/20 active:scale-98 transition-all flex items-center justify-between group cursor-pointer disabled:opacity-60"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                {processing ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <XCircle className="w-5 h-5 text-white" />
                )}
              </div>
              <div className="text-left">
                <div className="text-sm font-black">Giả lập Thanh toán Thất bại</div>
                <div className="text-[11px] font-normal text-rose-100">
                  Từ chối giao dịch / Thẻ không hợp lệ
                </div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform shrink-0" />
          </button>
        </div>

        {/* Footer Security Badges */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-center gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-1.5 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>256-Bit SSL Encrypted</span>
          </div>
          <span>•</span>
          <div className="flex items-center gap-1.5 font-medium">
            <Clock className="w-4 h-4 text-orange-500" />
            <span>Sandbox Mode</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SandboxPaymentPage() {
  return (
    <div className="min-h-screen bg-[#fdfbf7] py-8 sm:py-12 px-4 sm:px-6">
      <Suspense
        fallback={
          <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
            <p className="text-sm font-bold text-slate-600">Đang tải cổng thanh toán Sandbox...</p>
          </div>
        }
      >
        <SandboxPaymentContent />
      </Suspense>
    </div>
  );
}
