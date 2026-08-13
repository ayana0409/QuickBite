import React from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useToastStore } from '../../stores/toastStore';
import type { ToastType } from '../../stores/toastStore';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  const iconMap: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
    info: <Info className="w-5 h-5 text-cyan-400 shrink-0" />,
  };

  const styleMap: Record<ToastType, string> = {
    success: 'bg-slate-900/95 border-emerald-500/50 shadow-emerald-500/10 text-emerald-200',
    error: 'bg-slate-900/95 border-red-500/50 shadow-red-500/10 text-red-200',
    warning: 'bg-slate-900/95 border-amber-500/50 shadow-amber-500/10 text-amber-200',
    info: 'bg-slate-900/95 border-cyan-500/50 shadow-cyan-500/10 text-cyan-200',
  };

  return (
    <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm sm:max-w-md w-full pointer-events-none px-4 sm:px-0">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border backdrop-blur-md shadow-2xl transition-all duration-300 animate-in fade-in slide-in-from-top-4 ${
            styleMap[toast.type]
          }`}
        >
          {iconMap[toast.type]}

          <div className="flex-1 min-w-0 font-sans">
            {toast.title && (
              <h4 className="font-extrabold text-xs text-slate-100 mb-0.5 leading-tight">
                {toast.title}
              </h4>
            )}
            <p className="text-xs font-semibold leading-snug break-words text-slate-300">
              {toast.message}
            </p>
          </div>

          <button
            type="button"
            onClick={() => removeToast(toast.id)}
            className="p-1 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            title="Đóng thông báo"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;
