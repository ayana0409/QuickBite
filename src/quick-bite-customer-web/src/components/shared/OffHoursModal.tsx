'use client';

import { useEffect, useState } from 'react';
import { Moon, Clock, CalendarDays, UtensilsCrossed } from 'lucide-react';
import { getCurrentTimeUTC7 } from '../../lib/operatingHours';

interface OffHoursModalProps {
  startup?: string;
  shutdown?: string;
}

/**
 * Fullscreen lock modal shown when the current time is outside the customer operating hours.
 * Completely blocks all interactions and informs customers about the ordering schedule in UTC+7.
 */
export default function OffHoursModal({ startup, shutdown }: OffHoursModalProps) {
  const [mounted, setMounted] = useState(false);
  const [liveClock, setLiveClock] = useState('');
  const [currentTimeFormatted, setCurrentTimeFormatted] = useState('');

  useEffect(() => {
    setMounted(true);
    const originalOverflow = document.body.style.overflow;
    const originalPointerEvents = document.body.style.pointerEvents;
    document.body.style.overflow = 'hidden';

    const updateTime = () => {
      const { hours, minutes, seconds, formattedTime } = getCurrentTimeUTC7();
      const pad = (n: number) => String(n).padStart(2, '0');
      setLiveClock(`${pad(hours)}:${pad(minutes)}:${pad(seconds)}`);
      setCurrentTimeFormatted(formattedTime);
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.pointerEvents = originalPointerEvents;
      clearInterval(timer);
    };
  }, []);

  const displayStartup = startup || '08:00';
  const displayShutdown = shutdown || '22:00';

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="offhours-title"
      aria-describedby="offhours-desc"
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/85 backdrop-blur-xl p-4 sm:p-6 select-none overflow-hidden"
      style={{ pointerEvents: 'auto' }}
    >
      {/* Night-sky ambient background gradient */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Modal Container */}
      <div className="relative w-full max-w-lg rounded-3xl bg-slate-900/90 border border-slate-700/60 shadow-2xl shadow-slate-950/80 p-6 sm:p-8 text-center text-slate-100 overflow-hidden">
        {/* Subtle accent top border glow */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

        {/* Night Icon Badge */}
        <div className="flex flex-col items-center justify-center mb-6">
          <div className="relative flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-tr from-indigo-500/20 to-purple-500/10 border border-indigo-500/30 shadow-inner mb-4">
            <Moon className="w-10 h-10 text-indigo-400" />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-slate-900 border border-indigo-500/40 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5 text-indigo-300" />
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase bg-indigo-500/10 border border-indigo-500/30 text-indigo-300">
            <CalendarDays className="w-3 h-3" />
            <span>Ngoài giờ phục vụ</span>
          </div>
        </div>

        {/* Title */}
        <h2 id="offhours-title" className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mb-3">
          Hệ thống đang ngoài giờ hoạt động
        </h2>

        {/* Message adhering closely to user requirement */}
        <p id="offhours-desc" className="text-sm sm:text-base text-slate-300 leading-relaxed mb-6 font-normal">
          Hiện tại là <span suppressHydrationWarning className="font-semibold text-amber-300">{mounted ? currentTimeFormatted : '--:--'}</span>, hệ thống đang ngoài giờ hoạt động, vui lòng quay lại vào khung giờ{' '}
          <span className="font-semibold text-indigo-300">
            {displayStartup} – {displayShutdown}
          </span>{' '}
          (múi giờ UTC+7) nhé!
        </p>

        {/* Operating Schedule Info Card */}
        <div className="rounded-2xl bg-slate-800/60 border border-slate-700/50 p-4 space-y-3 text-xs sm:text-sm">
          <div className="flex items-center justify-between text-slate-300">
            <span className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-400" />
              <span>Khung giờ phục vụ:</span>
            </span>
            <span className="font-semibold text-white bg-slate-700/50 px-2.5 py-0.5 rounded-lg border border-slate-600/40">
              {displayStartup} - {displayShutdown} (UTC+7)
            </span>
          </div>

          <div className="flex items-center justify-between text-slate-400 pt-2 border-t border-slate-700/40">
            <span>Thời gian hiện tại:</span>
            <span suppressHydrationWarning className="font-mono font-bold text-amber-300 bg-slate-950/60 px-3 py-1 rounded-lg border border-slate-700/40">
              {mounted ? liveClock : '--:--:--'}
            </span>
          </div>
        </div>

        {/* Reassurance Footer */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 text-xs text-slate-400 flex items-center justify-center gap-2">
          <UtensilsCrossed className="w-3.5 h-3.5 text-indigo-400" />
          <span>QuickBite sẵn sàng phục vụ bữa ngon cho bạn trong khung giờ trên!</span>
        </div>
      </div>
    </div>
  );
}
