/**
 * Operating Hours and Maintenance Mode Utilities
 * Handles UTC+7 timezone computations, operating window validation,
 * countdown to shutdown, and environment configuration extraction.
 */

export interface SystemConfig {
  isMaintain: boolean;
  startup?: string;
  shutdown?: string;
}

export interface CurrentTimeInfo {
  hours: number;
  minutes: number;
  seconds: number;
  totalMinutes: number;
  formattedTime: string;
}

/**
 * Parses a time string in "HH:MM" (24h) format into total minutes from 00:00.
 * Returns null if the format is invalid.
 */
export function parseTimeToMinutes(timeStr?: string): number | null {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const trimmed = timeStr.trim();
  const match = trimmed.match(/^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/);
  if (!match) return null;

  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  return hours * 60 + minutes;
}

/**
 * Retrieves the current real-time values for Vietnam (UTC+7 / Asia/Ho_Chi_Minh).
 * Uses Intl.DateTimeFormat with Asia/Ho_Chi_Minh and a safe fallback.
 */
export function getCurrentTimeUTC7(): CurrentTimeInfo {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Ho_Chi_Minh',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(now);
    const hourVal = parts.find((p) => p.type === 'hour')?.value || '00';
    const minVal = parts.find((p) => p.type === 'minute')?.value || '00';
    const secVal = parts.find((p) => p.type === 'second')?.value || '00';

    const hours = parseInt(hourVal, 10);
    const minutes = parseInt(minVal, 10);
    const seconds = parseInt(secVal, 10);

    return {
      hours,
      minutes,
      seconds,
      totalMinutes: hours * 60 + minutes,
      formattedTime: `${hourVal}:${minVal}`,
    };
  } catch {
    // Math fallback: compute UTC offset + 7 hours
    const now = new Date();
    const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
    const utc7Date = new Date(utcMs + 7 * 3600000);

    const hours = utc7Date.getHours();
    const minutes = utc7Date.getMinutes();
    const seconds = utc7Date.getSeconds();
    const pad = (n: number) => String(n).padStart(2, '0');

    return {
      hours,
      minutes,
      seconds,
      totalMinutes: hours * 60 + minutes,
      formattedTime: `${pad(hours)}:${pad(minutes)}`,
    };
  }
}

/**
 * Checks if the current time is within configured operating hours (UTC+7).
 * If startup or shutdown is not configured, the system is considered open 24/7.
 */
export function isWithinOperatingHours(startup?: string, shutdown?: string): boolean {
  const startMin = parseTimeToMinutes(startup);
  const endMin = parseTimeToMinutes(shutdown);

  // If not configured, always operational
  if (startMin === null || endMin === null) {
    return true;
  }

  const { totalMinutes } = getCurrentTimeUTC7();

  // Standard same-day window (e.g. 08:00 to 22:00)
  if (startMin < endMin) {
    return totalMinutes >= startMin && totalMinutes < endMin;
  }

  // Overnight window spanning midnight (e.g. 22:00 to 06:00)
  if (startMin > endMin) {
    return totalMinutes >= startMin || totalMinutes < endMin;
  }

  // Identical start & end -> open 24h
  return true;
}

/**
 * Calculates remaining minutes until the shutdown time, if currently within operating hours.
 * Returns null if not configured, or if currently outside operating hours.
 */
export function getMinutesUntilShutdown(startup?: string, shutdown?: string): number | null {
  const startMin = parseTimeToMinutes(startup);
  const endMin = parseTimeToMinutes(shutdown);

  if (startMin === null || endMin === null) {
    return null;
  }

  if (!isWithinOperatingHours(startup, shutdown)) {
    return null;
  }

  const { totalMinutes } = getCurrentTimeUTC7();

  if (startMin < endMin) {
    const diff = endMin - totalMinutes;
    return diff > 0 ? diff : null;
  }

  if (startMin > endMin) {
    if (totalMinutes >= startMin) {
      const diff = 1440 - totalMinutes + endMin;
      return diff > 0 ? diff : null;
    }
    const diff = endMin - totalMinutes;
    return diff > 0 ? diff : null;
  }

  return null;
}

/**
 * Validates boolean flag from environment variable string ("true", "1", "yes", "on").
 */
export function isMaintainFlagActive(rawVal?: string): boolean {
  if (!rawVal) return false;
  const normalized = rawVal.trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on';
}

/**
 * Reads operating config for Admin Portal from Vite environment variables.
 */
export function getAdminSystemConfig(): SystemConfig {
  const rawMaintain = import.meta.env.VITE_IS_MAINTAIN;
  const rawStartup = import.meta.env.VITE_STARTUP;
  const rawShutdown = import.meta.env.VITE_SHUTDOWN;

  return {
    isMaintain: isMaintainFlagActive(rawMaintain),
    startup: rawStartup ? String(rawStartup).trim() : undefined,
    shutdown: rawShutdown ? String(rawShutdown).trim() : undefined,
  };
}
