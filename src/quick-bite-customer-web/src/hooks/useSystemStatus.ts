'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getCustomerSystemConfig,
  isWithinOperatingHours,
  getMinutesUntilShutdown,
  getCurrentTimeUTC7,
} from '../lib/operatingHours';
import { useToast } from '../components/shared/ToastProvider';

export interface SystemStatusState {
  isMaintainMode: boolean;
  isOffHours: boolean;
  minutesLeft: number | null;
  startup?: string;
  shutdown?: string;
  currentTimeStr: string;
}

/**
 * Custom hook to monitor customer portal operating hours and maintenance mode.
 * Evaluates state every 30 seconds and notifies customers with warning toasts 30 minutes before shutdown.
 */
export function useSystemStatus(): SystemStatusState {
  const config = getCustomerSystemConfig();
  const { warning } = useToast();

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

      // Trigger warning toast every 30 seconds when within 30 minutes of shutdown
      if (!nextStatus.isMaintainMode && !nextStatus.isOffHours && nextStatus.minutesLeft !== null) {
        if (nextStatus.minutesLeft <= 30 && nextStatus.minutesLeft > 0) {
          const shutdownTime = config.shutdown || '';
          const timeSuffix = shutdownTime ? ` (vào lúc ${shutdownTime})` : '';
          warning(
            `Hệ thống sẽ đóng sau ${nextStatus.minutesLeft} phút${timeSuffix}. Vui lòng hoàn thành đơn hàng trong thời gian này.`
          );
        }
      }
    };

    checkStatus();

    const intervalId = setInterval(checkStatus, 30000);

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
  }, [config.isMaintain, config.startup, config.shutdown, computeStatus, warning]);

  return {
    isMaintainMode: status.isMaintainMode,
    isOffHours: status.isOffHours,
    minutesLeft: status.minutesLeft,
    startup: config.startup,
    shutdown: config.shutdown,
    currentTimeStr,
  };
}
