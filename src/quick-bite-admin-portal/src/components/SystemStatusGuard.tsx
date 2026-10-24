import React from 'react';
import { useSystemStatus } from '../hooks/useSystemStatus';
import MaintenanceModal from './common/MaintenanceModal';
import OffHoursModal from './common/OffHoursModal';

interface SystemStatusGuardProps {
  children: React.ReactNode;
}

/**
 * SystemStatusGuard wraps application content.
 * If maintenance mode is active, it strictly renders MaintenanceModal without rendering children.
 * If off-hours mode is active, it displays OffHoursModal.
 */
export default function SystemStatusGuard({ children }: SystemStatusGuardProps) {
  const { isMaintainMode, isOffHours, startup, shutdown } = useSystemStatus();

  if (isMaintainMode) {
    return <MaintenanceModal />;
  }

  if (isOffHours) {
    return <OffHoursModal startup={startup} shutdown={shutdown} />;
  }

  return <>{children}</>;
}
