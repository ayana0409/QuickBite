import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { DynamicConfigService } from '../config/dynamic-config.service';
import { HealthCheckEntry, HealthResponseDto } from './dto/health-check-response.dto';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly activeWakeups = new Set<string>();

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: DynamicConfigService,
  ) {}

  async checkHealth(): Promise<HealthResponseDto> {
    const overallStartTime = Date.now();
    this.logger.log('🔍 Executing Fast Non-Blocking Health Check...');

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

    // 3. Microservices list - Fast Parallel Ping (Non-Blocking)
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
        let lastResponse: any = null;
        let isColdStart = false;

        for (const healthUrl of candidateUrls) {
          try {
            // Fast 3-second ping to check status without blocking client
            const response = await firstValueFrom(
              this.httpService.get(healthUrl, {
                timeout: 3500,
                validateStatus: () => true,
                headers: { Accept: 'application/json, text/plain, */*' },
              }),
            );
            lastResponse = response;
            const duration = Date.now() - startTime;
            const isHtmlContent = typeof response.data === 'string' && response.data.includes('<!DOCTYPE html>');

            // Case A: Online and Healthy JSON response
            if (response.status >= 200 && response.status < 300) {
              const body = response.data;
              const innerData = body?.data?.status ? body.data : body;
              const isHealthy =
                !isHtmlContent &&
                (innerData?.status === 'Healthy' ||
                  innerData?.status === 'ok' ||
                  innerData?.status === 'UP' ||
                  typeof body === 'object');

              if (isHealthy) {
                return {
                  key: service.key,
                  entry: {
                    status: 'Healthy' as const,
                    description: `${service.key} is healthy`,
                    data: body || null,
                    duration_ms: duration,
                    exception: null,
                  },
                };
              }
            }

            // Case B: Render Cold-Start detected (502/503 HTML) -> Trigger Background Wake-up!
            if (response.status === 502 || response.status === 503 || isHtmlContent) {
              isColdStart = true;
              this.logger.warn(`⏳ [${service.key}] Render Cold-Start detected. Triggering non-blocking background wake-up...`);
              
              // Trigger background wake-up loop asynchronously without holding response!
              this.triggerBackgroundWakeup(service.key, healthUrl);
              break;
            }

            // Case C: 404 -> test next candidate URL
            if (response.status === 404) {
              continue;
            }
          } catch (error: any) {
            // Network failure or timeout -> trigger background wakeup attempt as well
            isColdStart = true;
            this.triggerBackgroundWakeup(service.key, healthUrl);
            break;
          }
        }

        const duration = Date.now() - startTime;
        return {
          key: service.key,
          entry: {
            status: isColdStart ? ('Degraded' as const) : ('Unhealthy' as const),
            description: isColdStart
              ? `Service ${service.key} is waking up in background (Render Cold-Start)`
              : `Unable to reach ${service.key} at ${baseUrl}`,
            data: null,
            duration_ms: duration,
            exception: isColdStart ? 'Cold Start (Waking up)' : 'Service Unreachable',
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

    const hasUnhealthy = Object.values(entries).some((e) => e.status === 'Unhealthy');
    const hasDegraded = Object.values(entries).some((e) => e.status === 'Degraded');

    let overallStatus: 'Healthy' | 'Degraded' | 'Unhealthy' = 'Healthy';
    if (hasUnhealthy) {
      overallStatus = 'Unhealthy';
    } else if (hasDegraded) {
      overallStatus = 'Degraded';
    }

    const totalDuration = Date.now() - overallStartTime;
    this.logger.log(`🏁 [FAST HEALTH RESPONSE] Status: ${overallStatus} in ${totalDuration}ms`);

    return {
      status: overallStatus,
      total_duration_ms: totalDuration,
      timestamp: new Date().toISOString(),
      entries,
    };
  }

  /**
   * Non-blocking background wake-up loop for sleeping Render services
   */
  private triggerBackgroundWakeup(serviceKey: string, healthUrl: string) {
    if (this.activeWakeups.has(serviceKey)) {
      return; // Already actively waking up in background
    }

    this.activeWakeups.add(serviceKey);

    // Fire-and-forget background task
    (async () => {
      this.logger.log(`🚀 [BACKGROUND WAKEUP STARTED] ${serviceKey} at ${healthUrl}`);
      const maxRetries = 6;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        await new Promise((r) => setTimeout(r, 4000)); // Sleep 4s between background pings
        try {
          const res = await firstValueFrom(
            this.httpService.get(healthUrl, {
              timeout: 10000,
              validateStatus: () => true,
            }),
          );
          if (res.status >= 200 && res.status < 300 && typeof res.data !== 'string') {
            this.logger.log(`🎉 [BACKGROUND WAKEUP SUCCESS] ${serviceKey} is now UP and ONLINE!`);
            break;
          }
        } catch {
          // Ignore background errors
        }
      }
      this.activeWakeups.delete(serviceKey);
    })();
  }

  private getHealthUrlCandidates(baseUrl: string): string[] {
    const cleanUrl = baseUrl.trim().replace(/\/$/, '');
    const candidates: string[] = [];

    if (cleanUrl.endsWith('/health')) {
      candidates.push(cleanUrl);
    } else {
      candidates.push(`${cleanUrl}/health`);
    }

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
      const originV1Health = `${urlObj.origin}/api/v1/health`;
      if (!candidates.includes(originV1Health)) {
        candidates.push(originV1Health);
      }
    } catch {}

    return candidates;
  }
}
