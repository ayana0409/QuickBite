import { Injectable } from '@nestjs/common';
import { HealthCheckEntry } from './database.health';

@Injectable()
export class SystemResourcesHealthService {
  async check(): Promise<HealthCheckEntry> {
    const startTime = Date.now();
    const memoryUsage = process.memoryUsage();

    const data = {
      working_set_mb: Math.round(memoryUsage.rss / 1024 / 1024),
      gc_heap_mb: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      heap_total_mb: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      external_mb: Math.round(memoryUsage.external / 1024 / 1024),
    };

    const duration = Date.now() - startTime;
    return {
      status: 'Healthy',
      description: 'System resources operational',
      data,
      duration_ms: duration,
      exception: null,
    };
  }
}
