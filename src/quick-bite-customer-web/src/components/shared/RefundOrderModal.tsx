'use client';

import React, { useState } from 'react';
import {
  RotateCcw,
  X,
  AlertCircle,
  CheckCircle2,
  Loader2,
  HelpCircle,
} from 'lucide-react';
import { refundOrder } from '@/src/lib/api/order';
import { useToast } from '@/src/components/shared/ToastProvider';

interface RefundOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  totalAmount: number;
  onSuccess: () => void;
}

const PRESET_REASONS = [
  'Món ăn bị giao thiếu hoặc giao sai món',
  'Món ăn bị nguội / hỏng / không đảm bảo chất lượng',
  'Thời gian giao hàng quá muộn so với dự kiến',
  'Tài xế có thái độ không phù hợp / không giao tận nơi',
  'Lý do khác (Nhập chi tiết)',
];

export default function RefundOrderModal({
  isOpen,
  onClose,
  orderId,
  totalAmount,
  onSuccess,
}: RefundOrderModalProps) {
  const { success: toastSuccess, error: toastError } = useToast();

  const [selectedReason, setSelectedReason] = useState<string>(PRESET_REASONS[0]);
  const [customReason, setCustomReason] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleRefund = async (e: React.FormEvent) => {
    e.preventDefault();

    const finalReason =
      selectedReason === 'Lý do khác (Nhập chi tiết)'
        ? customReason.trim()
        : selectedReason;

    if (!finalReason) {
      toastError('Vui lòng cung cấp lý do hoàn tiền!');
      return;
    }

    setSubmitting(true);
    try {
      const res = await refundOrder(orderId, finalReason);
      if (res.success) {
        toastSuccess('Đã gửi yêu cầu hoàn tiền thành công!');
        onSuccess();
        onClose();
      } else {
        toastError(res.message || 'Không thể xử lý yêu cầu hoàn tiền');
      }
    } catch (err: any) {
      console.error('Refund error:', err);
      toastError('Lỗi kết nối khi gửi yêu cầu hoàn tiền');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-purple-100 overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4.5 bg-gradient-to-r from-purple-50 via-pink-50 to-purple-50 border-b border-purple-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-purple-500/20">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">Yêu cầu Hoàn tiền</h3>
              <p className="text-xs text-slate-500">Đơn hàng #{orderId.slice(0, 8)} • {totalAmount.toLocaleString('vi-VN')}đ</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="w-8 h-8 rounded-full bg-white hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Notice */}
        <form onSubmit={handleRefund} className="p-6 space-y-4">
          <div className="bg-purple-50/70 border border-purple-200/70 rounded-2xl p-4 text-xs text-purple-900 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Số tiền hoàn lại{' '}
              <strong className="text-purple-950 font-bold">
                {totalAmount.toLocaleString('vi-VN')}đ
              </strong>{' '}
              sẽ được hệ thống xử lý hoàn về phương thức thanh toán ban đầu của bạn.
            </p>
          </div>

          {/* Reason Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              Chọn lý do bạn muốn hoàn tiền <span className="text-red-500">*</span>
            </label>

            <div className="space-y-2">
              {PRESET_REASONS.map((reason, index) => {
                const isSelected = selectedReason === reason;
                return (
                  <label
                    key={index}
                    className={`flex items-center gap-3 p-3 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-purple-50/60 border-purple-400 ring-2 ring-purple-400/20 text-purple-950 font-bold'
                        : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100/70 font-medium'
                    }`}
                  >
                    <input
                      type="radio"
                      name="refundReason"
                      value={reason}
                      checked={isSelected}
                      onChange={() => setSelectedReason(reason)}
                      className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-xs">{reason}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Custom Reason Textarea if selected */}
          {selectedReason === 'Lý do khác (Nhập chi tiết)' && (
            <div className="animate-in fade-in slide-in-from-top-1 duration-150">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Chi tiết lý do hoàn tiền <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                required
                placeholder="Vui lòng mô tả cụ thể vấn đề gặp phải để chúng tôi hỗ trợ tốt nhất..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                className="w-full p-3 text-xs font-medium bg-slate-50 focus:bg-white text-slate-900 placeholder:text-slate-400 rounded-2xl border border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all resize-none"
              />
            </div>
          )}

          {/* Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Đóng
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-black rounded-xl shadow-md shadow-purple-500/25 active:scale-98 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang gửi...</span>
                </>
              ) : (
                <>
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Xác nhận hoàn tiền</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
