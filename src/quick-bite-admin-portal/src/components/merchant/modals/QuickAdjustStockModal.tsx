import React, { useState } from 'react';
import { RefreshCw, X } from 'lucide-react';
import type { InventoryItem } from '../../../services/inventoryService';
import Input from '../../common/Form/Input';

export interface QuickAdjustStockModalProps {
  isOpen: boolean;
  item: InventoryItem | null;
  qty: string;
  setQty: (val: string) => void;
  mode: 'ADD' | 'SUBTRACT' | 'SET';
  setMode: (mode: 'ADD' | 'SUBTRACT' | 'SET') => void;
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
  onClose: () => void;
}

export const QuickAdjustStockModal: React.FC<QuickAdjustStockModalProps> = ({
  isOpen,
  item,
  qty,
  setQty,
  mode,
  setMode,
  onSubmit,
  isSubmitting,
  onClose,
}) => {
  const [errorQty, setErrorQty] = useState<string>('');

  if (!isOpen || !item) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numQty = parseInt(qty, 10);
    if (isNaN(numQty) || numQty < 0) {
      setErrorQty('Vui lòng nhập số lượng hợp lệ (>= 0)!');
      return;
    }
    setErrorQty('');
    onSubmit(e);
  };

  const labelText =
    mode === 'ADD'
      ? 'Số Lượng Nhập Thêm'
      : mode === 'SUBTRACT'
      ? 'Số Lượng Xuất/Giảm Kho'
      : 'Thiết Lập Số Lượng Tồn Tuyệt Đối';

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 relative">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="font-extrabold text-slate-100 text-sm flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-cyan-400" />
            Điều Chỉnh Kho: {item.name || 'Món ăn'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4 text-xs">
          {/* Current Stock Display */}
          <div className="bg-slate-950 border border-slate-800 p-3 rounded-2xl flex items-center justify-between font-mono">
            <span className="text-slate-400 font-sans">Kho hiện tại:</span>
            <div className="flex items-center gap-3">
              <span className="text-emerald-400 font-bold">Khả dụng: {item.availableQuantity}</span>
              <span className="text-slate-500">|</span>
              <span className="text-slate-200">Tổng: {item.quantity}</span>
            </div>
          </div>

          {/* Mode Selection */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-300">Loại Thao Tác:</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setMode('ADD')}
                className={`py-2 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
                  mode === 'ADD'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
                }`}
              >
                + Nhập Thêm
              </button>

              <button
                type="button"
                onClick={() => setMode('SUBTRACT')}
                className={`py-2 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
                  mode === 'SUBTRACT'
                    ? 'bg-red-500/20 text-red-300 border-red-500/50'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
                }`}
              >
                - Xuất/Giảm
              </button>

              <button
                type="button"
                onClick={() => setMode('SET')}
                className={`py-2 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
                  mode === 'SET'
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
                }`}
              >
                = Đặt Số Lượng
              </button>
            </div>
          </div>

          {/* Quantity Input */}
          <Input
            label={labelText}
            type="number"
            min="0"
            required
            value={qty}
            onChange={(e) => {
              setQty(e.target.value);
              if (e.target.value.trim()) setErrorQty('');
            }}
            error={errorQty}
            accentColor="cyan"
            className="font-mono text-sm text-cyan-300"
          />

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl cursor-pointer"
            >
              Hủy Bỏ
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 disabled:opacity-50 text-slate-950 font-black rounded-xl shadow-lg cursor-pointer flex items-center gap-1.5"
            >
              {isSubmitting && (
                <span className="w-3 h-3 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              )}
              Lưu Cập Nhật
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuickAdjustStockModal;
