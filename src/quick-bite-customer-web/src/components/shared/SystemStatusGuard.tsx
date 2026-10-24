'use client';

import React from 'react';
import { useSystemStatus } from '../../hooks/useSystemStatus';
import MaintenanceModal from './MaintenanceModal';
import OffHoursModal from './OffHoursModal';

interface SystemStatusGuardProps {
  children: React.ReactNode;
}

/**
 * SystemStatusGuard wraps customer application components.
 * If maintenance mode is active, it displays MaintenanceModal without rendering children,
 * guaranteeing zero customer requests to the backend microservices.
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
