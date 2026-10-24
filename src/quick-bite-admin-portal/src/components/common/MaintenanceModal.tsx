import { useEffect, useState } from 'react';
import { Wrench, ShieldAlert, Clock, Sparkles } from 'lucide-react';
import { getCurrentTimeUTC7 } from '../../utils/operatingHours';

/**
 * Fullscreen lock modal shown when IS_MAINTAIN is active.
 * Completely blocks all user interactions and displays human-friendly Vietnamese maintenance notification.
 */
export default function MaintenanceModal() {
  const [liveClock, setLiveClock] = useState(() => {
    const { hours, minutes, seconds } = getCurrentTimeUTC7();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  });

  // Lock body scroll while maintenance modal is displayed
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    const originalPointerEvents = document.body.style.pointerEvents;
    document.body.style.overflow = 'hidden';

    // Update real-time clock every second
    const timer = setInterval(() => {
      const { hours, minutes, seconds } = getCurrentTimeUTC7();
      const pad = (n: number) => String(n).padStart(2, '0');
      setLiveClock(`${pad(hours)}:${pad(minutes)}:${pad(seconds)}`);
    }, 1000);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.pointerEvents = originalPointerEvents;
      clearInterval(timer);
    };
  }, []);

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="maintenance-title"
      aria-describedby="maintenance-desc"
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/85 backdrop-blur-xl p-4 sm:p-6 select-none overflow-hidden"
      style={{ pointerEvents: 'auto' }}
    >
      {/* Background ambient lighting effects */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-amber-500/15 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-orange-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Modal Container */}
      <div className="relative w-full max-w-lg rounded-3xl bg-slate-900/90 border border-slate-700/60 shadow-2xl shadow-slate-950/80 p-6 sm:p-8 text-center text-slate-100 overflow-hidden">
        {/* Subtle accent top border glow */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500" />

        {/* Icon & Pulse Badge */}
        <div className="flex flex-col items-center justify-center mb-6">
          <div className="relative flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-orange-500/10 border border-amber-500/30 shadow-inner mb-4">
            <span className="absolute inset-0 rounded-2xl animate-ping bg-amber-400/10" />
            <Wrench className="w-10 h-10 text-amber-400 animate-spin" style={{ animationDuration: '8s' }} />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-slate-900 border border-amber-500/40 flex items-center justify-center">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase bg-amber-500/10 border border-amber-500/30 text-amber-300">
            <Sparkles className="w-3 h-3" />
            <span>Chế độ bảo trì hệ thống</span>
          </div>
        </div>

        {/* Text Content */}
        <h2 id="maintenance-title" className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-3">
          Hệ thống đang bảo trì
        </h2>
        <p id="maintenance-desc" className="text-sm sm:text-base text-slate-300 leading-relaxed mb-6 font-normal">
          QuickBite đang được nâng cấp định kỳ nhằm tối ưu hóa hiệu suất và nâng cao tính bảo mật. Vui lòng quay lại sau ít phút nhé!
        </p>

        {/* Status card with Live Clock */}
        <div className="rounded-2xl bg-slate-800/60 border border-slate-700/50 p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm text-slate-400">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400/80" />
            <span>Thời gian hiện tại (UTC+7):</span>
          </div>
          <div className="font-mono text-base font-bold text-amber-300 bg-slate-950/60 px-3 py-1 rounded-lg border border-slate-700/40">
            {liveClock}
          </div>
        </div>

        {/* Human Friendly Reassurance Footer */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 text-xs text-slate-400 flex items-center justify-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span>Mọi dữ liệu của bạn luôn được lưu trữ an toàn</span>
        </div>
      </div>
    </div>
  );
}
