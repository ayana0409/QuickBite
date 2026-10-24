import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getAdminSystemConfig,
  isWithinOperatingHours,
  getMinutesUntilShutdown,
  getCurrentTimeUTC7,
} from '../utils/operatingHours';
import { toast } from '../stores/toastStore';

export interface SystemStatusState {
  isMaintainMode: boolean;
  isOffHours: boolean;
  minutesLeft: number | null;
  startup?: string;
  shutdown?: string;
  currentTimeStr: string;
}

/**
 * Custom hook to monitor system operating hours and maintenance mode.
 * Evaluates status every 30 seconds (and on visibility restore) and displays
 * recurrent warning toasts 30 minutes before system shutdown.
 */
export function useSystemStatus(): SystemStatusState {
  const config = getAdminSystemConfig();
  const [currentTimeStr, setCurrentTimeStr] = useState<string>(
    () => getCurrentTimeUTC7().formattedTime
  );

  const computeStatus = useCallback((): {
    isMaintainMode: boolean;
    isOffHours: boolean;
    minutesLeft: number | null;
  } => {
    if (config.isMaintain) {
      return {
        isMaintainMode: true,
        isOffHours: false,
        minutesLeft: null,
      };
    }

    const withinHours = isWithinOperatingHours(config.startup, config.shutdown);
    const minutesLeft = getMinutesUntilShutdown(config.startup, config.shutdown);

    return {
      isMaintainMode: false,
      isOffHours: !withinHours,
      minutesLeft,
    };
  }, [config.isMaintain, config.startup, config.shutdown]);

  const [status, setStatus] = useState(computeStatus);
  const statusRef = useRef(status);
  statusRef.current = status;

  useEffect(() => {
    // If maintenance mode is activated, skip interval warning checks
    if (config.isMaintain) {
      setStatus({
        isMaintainMode: true,
        isOffHours: false,
        minutesLeft: null,
      });
      return;
    }

    const checkStatus = () => {
      const nowInfo = getCurrentTimeUTC7();
      setCurrentTimeStr(nowInfo.formattedTime);

      const nextStatus = computeStatus();
      setStatus(nextStatus);

      // Warning toast triggers every 30s when within 30 minutes of shutdown
      if (!nextStatus.isMaintainMode && !nextStatus.isOffHours && nextStatus.minutesLeft !== null) {
        if (nextStatus.minutesLeft <= 30 && nextStatus.minutesLeft > 0) {
          const shutdownTime = config.shutdown || '';
          const timeSuffix = shutdownTime ? ` (vào lúc ${shutdownTime})` : '';
          toast.warning(
            `Hệ thống sẽ đóng sau ${nextStatus.minutesLeft} phút${timeSuffix}. Vui lòng hoàn thành công việc trong thời gian này.`,
            'Cảnh báo kết thúc ca làm việc',
            8000
          );
        }
      }
    };

    // Run immediate check on mount
    checkStatus();

    // Ticking every 30 seconds
    const intervalId = setInterval(checkStatus, 30000);

    // Recheck immediately when browser tab regains focus
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkStatus();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [config.isMaintain, config.startup, config.shutdown, computeStatus]);

  return {
    isMaintainMode: status.isMaintainMode,
    isOffHours: status.isOffHours,
    minutesLeft: status.minutesLeft,
    startup: config.startup,
    shutdown: config.shutdown,
    currentTimeStr,
  };
}
