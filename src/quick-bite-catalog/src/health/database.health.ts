import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

export interface HealthCheckEntry {
  status: 'Healthy' | 'Unhealthy' | 'Degraded';
  description: string;
  data?: Record<string, any> | null;
  duration_ms: number;
  exception?: string | null;
}

@Injectable()
export class DatabaseHealthService {
  private readonly logger = new Logger(DatabaseHealthService.name);

  constructor(private readonly dataSource: DataSource) {}

  async check(): Promise<HealthCheckEntry> {
    const startTime = Date.now();
    try {
      await this.dataSource.query('SELECT 1');
      const duration = Date.now() - startTime;
      return {
        status: 'Healthy',
        description: 'PostgreSQL database connection is healthy.',
        data: null,
        duration_ms: duration,
        exception: null,
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.logger.error('Database health check failed', error?.stack || error);
      return {
        status: 'Unhealthy',
        description: 'PostgreSQL database connection failed.',
        data: null,
        duration_ms: duration,
        exception: error?.message || String(error),
      };
    }
  }
}
