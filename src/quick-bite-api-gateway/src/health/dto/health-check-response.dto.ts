export interface HealthCheckEntry {
  status: 'Healthy' | 'Degraded' | 'Unhealthy';
  description: string;
  data?: any;
  duration_ms: number;
  exception?: string | null;
}

export class HealthResponseDto {
  status: 'Healthy' | 'Degraded' | 'Unhealthy';
  total_duration_ms: number;
  timestamp: string;
  entries: Record<string, HealthCheckEntry>;
}
