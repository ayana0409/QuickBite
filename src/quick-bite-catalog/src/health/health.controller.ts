import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { DatabaseHealthService, HealthCheckEntry } from './database.health';
import { KafkaHealthService } from './kafka.health';
import { SystemResourcesHealthService } from './system-resources.health';

@Controller()
export class HealthController {
  constructor(
    private readonly dbHealth: DatabaseHealthService,
    private readonly kafkaHealth: KafkaHealthService,
    private readonly sysHealth: SystemResourcesHealthService,
  ) {}

  @Get(['health', 'api/health'])
  async checkHealth(@Res() res: Response) {
    const startTime = Date.now();

    const [dbResult, kafkaResult, sysResult] = await Promise.allSettled([
      this.dbHealth.check(),
      this.kafkaHealth.check(),
      this.sysHealth.check(),
    ]);

    const entries: Record<string, HealthCheckEntry> = {
      database: this.resolveResult(dbResult, 'PostgreSQL database check failed.'),
      kafka: this.resolveResult(kafkaResult, 'Kafka cluster check failed.'),
      system_resources: this.resolveResult(sysResult, 'System resources check failed.'),
    };

    let overallStatus: 'Healthy' | 'Unhealthy' | 'Degraded' = 'Healthy';
    const statuses = Object.values(entries).map((e) => e.status);

    if (statuses.includes('Unhealthy')) {
      overallStatus = 'Unhealthy';
    } else if (statuses.includes('Degraded')) {
      overallStatus = 'Degraded';
    }

    const totalDuration = Date.now() - startTime;
    const responsePayload = {
      status: overallStatus,
      total_duration_ms: Math.round(totalDuration * 100) / 100,
      timestamp: new Date().toISOString(),
      entries,
    };

    const statusCode = overallStatus === 'Unhealthy' ? 503 : 200;
    return res.status(statusCode).json(responsePayload);
  }

  private resolveResult(
    result: PromiseSettledResult<HealthCheckEntry>,
    fallbackMessage: string,
  ): HealthCheckEntry {
    if (result.status === 'fulfilled') {
      return result.value;
    }
    return {
      status: 'Unhealthy',
      description: fallbackMessage,
      data: null,
      duration_ms: 0,
      exception: result.reason?.message || String(result.reason),
    };
  }
}
