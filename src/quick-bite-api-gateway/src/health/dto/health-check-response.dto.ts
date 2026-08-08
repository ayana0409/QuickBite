export interface ServiceHealthStatus {
  serviceName: string;
  status: 'UP' | 'DOWN' | 'UNKNOWN';
  responseTimeMs?: number;
  error?: string;
}

export class HealthCheckResponseDto {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  services?: ServiceHealthStatus[];
}
