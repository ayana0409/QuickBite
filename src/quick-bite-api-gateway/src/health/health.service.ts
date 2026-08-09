import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { DynamicConfigService } from '../config/dynamic-config.service';
import { HealthCheckEntry, HealthResponseDto } from './dto/health-check-response.dto';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: DynamicConfigService,
  ) {}

  async checkHealth(): Promise<HealthResponseDto> {
    const overallStartTime = Date.now();

    // 1. Gateway system_resources
    const sysStartTime = Date.now();
    const mem = process.memoryUsage();
    const systemResourcesEntry: HealthCheckEntry = {
      status: 'Healthy',
      description: 'API Gateway memory operational.',
      data: {
        working_set_mb: Math.round(mem.rss / (1024 * 1024)),
        heap_total_mb: Math.round(mem.heapTotal / (1024 * 1024)),
        heap_used_mb: Math.round(mem.heapUsed / (1024 * 1024)),
      },
      duration_ms: Date.now() - sysStartTime,
      exception: null,
    };

    // 2. Gateway redis & mongodb
    const [redisResult, mongoResult] = await Promise.all([
      this.configService.checkRedisHealth(),
      this.configService.checkMongoHealth(),
    ]);

    const redisEntry: HealthCheckEntry = {
      status: redisResult.status,
      description: redisResult.description,
      data: null,
      duration_ms: redisResult.duration_ms,
      exception: redisResult.exception || null,
    };

    const mongoEntry: HealthCheckEntry = {
      status: mongoResult.status,
      description: mongoResult.description,
      data: null,
      duration_ms: mongoResult.duration_ms,
      exception: mongoResult.exception || null,
    };

    // 3. Microservices list
    const microservices = [
      { key: 'identity_service', configKey: 'IDENTITY_URL' },
      { key: 'order_service', configKey: 'ORDER_URL' },
      { key: 'catalog_service', configKey: 'CATALOG_URL' },
      { key: 'inventory_service', configKey: 'INVENTORY_URL' },
      { key: 'payment_service', configKey: 'PAYMENT_URL' },
    ];

    const serviceEntries = await Promise.all(
      microservices.map(async (service) => {
        const baseUrl = await this.configService.getAsync(service.configKey);
        if (!baseUrl) {
          return {
            key: service.key,
            entry: {
              status: 'Unhealthy' as const,
              description: `URL not configured for ${service.key}`,
              data: null,
              duration_ms: 0,
              exception: 'Configuration missing',
            },
          };
        }

        const candidateUrls = this.getHealthUrlCandidates(baseUrl);
        const startTime = Date.now();
        let lastError: any = null;

        for (const healthUrl of candidateUrls) {
          try {
            const response = await firstValueFrom(
              this.httpService.get(healthUrl, { timeout: 5000 }),
            );
            const duration = Date.now() - startTime;
            const body = response.data;
            const innerData = body?.data?.status ? body.data : body;

            const isHealthy =
              response.status >= 200 &&
              response.status < 300 &&
              innerData &&
              (innerData.status === 'Healthy' || innerData.status === 'ok');

            return {
              key: service.key,
              entry: {
                status: isHealthy ? ('Healthy' as const) : ('Unhealthy' as const),
                description: `${service.key} connection status: ${response.status}`,
                data: body || null,
                duration_ms: duration,
                exception: null,
              },
            };
          } catch (error: any) {
            lastError = error;
            // If HTTP status is 404 (e.g. /api/app/health returned 404), try next candidate URL
            if (error?.response?.status === 404) {
              continue;
            }
            break;
          }
        }

        const duration = Date.now() - startTime;
        const errorResponseBody = lastError?.response?.data || null;

        return {
          key: service.key,
          entry: {
            status: 'Unhealthy' as const,
            description: `Failed to connect to ${service.key}`,
            data: errorResponseBody,
            duration_ms: duration,
            exception: lastError?.message || 'Connection failed',
          },
        };
      }),
    );

    const entries: Record<string, HealthCheckEntry> = {
      system_resources: systemResourcesEntry,
      redis: redisEntry,
      mongodb: mongoEntry,
    };

    for (const item of serviceEntries) {
      entries[item.key] = item.entry;
    }

    const hasUnhealthy = Object.values(entries).some(
      (e) => e.status === 'Unhealthy',
    );
    const hasDegraded = Object.values(entries).some(
      (e) => e.status === 'Degraded',
    );

    let overallStatus: 'Healthy' | 'Degraded' | 'Unhealthy' = 'Healthy';
    if (hasUnhealthy) {
      overallStatus = 'Unhealthy';
    } else if (hasDegraded) {
      overallStatus = 'Degraded';
    }

    return {
      status: overallStatus,
      total_duration_ms: Date.now() - overallStartTime,
      timestamp: new Date().toISOString(),
      entries,
    };
  }

  private getHealthUrlCandidates(baseUrl: string): string[] {
    const cleanUrl = baseUrl.trim().replace(/\/$/, '');
    const candidates: string[] = [];

    // Candidate 1: Appended /health (e.g. http://localhost:3001/api/health or http://localhost:8083/api/v1/health)
    if (cleanUrl.endsWith('/health')) {
      candidates.push(cleanUrl);
    } else {
      candidates.push(`${cleanUrl}/health`);
    }

    // Candidate 2 & 3: Host level fallback (e.g. https://localhost:44386/health or https://localhost:44386/api/health)
    try {
      const urlObj = new URL(baseUrl);
      const originHealth = `${urlObj.origin}/health`;
      if (!candidates.includes(originHealth)) {
        candidates.push(originHealth);
      }
      const originApiHealth = `${urlObj.origin}/api/health`;
      if (!candidates.includes(originApiHealth)) {
        candidates.push(originApiHealth);
      }
    } catch {}

    return candidates;
  }
}
