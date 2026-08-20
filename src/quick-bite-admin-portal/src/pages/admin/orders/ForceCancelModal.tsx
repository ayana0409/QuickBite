import React, { useState } from 'react';
import { AlertTriangle, X, ShieldAlert } from 'lucide-react';

interface ForceCancelModalProps {
  isOpen: boolean;
  orderCode: string;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}

export const ForceCancelModal: React.FC<ForceCancelModalProps> = ({
  isOpen,
  orderCode,
  onClose,
  onConfirm,
}) => {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Vui lòng nhập lý do hủy đơn hàng khẩn cấp');
      return;
    }

    setError('');
    setIsSubmitting(true);
    try {
      await onConfirm(reason.trim());
      setReason('');
      onClose();
    } catch {
      // Error handling is managed by parent toast
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-red-500/40 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-red-950/30 flex justify-between items-center">
          <div className="flex items-center gap-2.5 text-red-400">
            <ShieldAlert className="w-5 h-5 text-red-500" />
            <h3 className="text-base font-bold text-white">Hủy Đơn Khẩn Cấp (Force Cancel)</h3>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="p-5 space-y-4">
            <div className="flex items-start gap-3 p-3 bg-red-950/20 border border-red-900/40 rounded-xl text-xs text-red-200/90 leading-relaxed">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                Hành động này sẽ <strong>hủy ép buộc</strong> đơn hàng{' '}
                <span className="font-mono font-bold text-red-300">{orderCode}</span>, kích hoạt quy trình hoàn tiền và giải phóng kho tự động qua Saga.
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Lý do hủy đơn <span className="text-red-400">*</span>
              </label>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  if (error) setError('');
                }}
                placeholder="Nhập lý do chi tiết (VD: Khách hàng yêu cầu hủy khẩn cấp do sự cố quán...)"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/30 transition-all resize-none"
                autoFocus
              />
              {error && <p className="text-[11px] text-red-400 mt-1">{error}</p>}
            </div>
          </div>

          <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Đóng
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-lg shadow-red-600/30 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? 'Đang Xử Lý...' : 'Xác Nhận Hủy Đơn'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
