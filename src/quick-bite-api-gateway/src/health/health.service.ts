import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { DynamicConfigService } from '../config/dynamic-config.service';
import { HealthCheckEntry, HealthResponseDto } from './dto/health-check-response.dto';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private activePings = new Map<string, Promise<any>>();

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: DynamicConfigService,
  ) {}

  async checkHealth(): Promise<HealthResponseDto> {
    const overallStartTime = Date.now();
    this.logger.log('🔍 Executing Smart Waking Health Check...');

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
              description: `URL not configured for ${service.configKey} on Render Environment`,
              data: null,
              duration_ms: 0,
              exception: 'Configuration missing',
            },
          };
        }

        const isLocalhost = baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1');
        if (isLocalhost) {
          return {
            key: service.key,
            entry: {
              status: 'Unhealthy' as const,
              description: `⚠️ ${service.configKey} is set to localhost (${baseUrl}). Set ${service.configKey} in Render Environment!`,
              data: null,
              duration_ms: 0,
              exception: `Target URL is localhost: ${baseUrl}`,
            },
          };
        }

        const candidateUrls = this.getHealthUrlCandidates(baseUrl);
        const startTime = Date.now();

        try {
          // Get the ongoing long ping, or start a new one
          const pingPromise = this.getOrStartLongPing(service.key, candidateUrls);
          
          const timeoutSymbol = Symbol('TIMEOUT');
          // Race the ping against a fast 1.5s timeout.
          // If the service is healthy, pingPromise resolves in < 500ms.
          // If the service is sleeping, pingPromise is held by Render for 60s, so we hit the timeout and return Degraded.
          const result = await Promise.race([
            pingPromise,
            new Promise((resolve) => setTimeout(() => resolve(timeoutSymbol), 1500)),
          ]);

          const duration = Date.now() - startTime;

          if (result === timeoutSymbol) {
            return {
              key: service.key,
              entry: {
                status: 'Degraded' as const,
                description: `Service ${service.key} is waking up in background (Holding request to ${baseUrl})`,
                data: null,
                duration_ms: duration,
                exception: `Cold Start in progress for ${baseUrl}`,
              },
            };
          } else {
            return {
              key: service.key,
              entry: {
                status: 'Healthy' as const,
                description: `${service.key} is healthy (Pinging: ${baseUrl})`,
                data: result,
                duration_ms: duration,
                exception: null,
              },
            };
          }
        } catch (error: any) {
          return {
            key: service.key,
            entry: {
              status: 'Unhealthy' as const,
              description: `Unable to reach ${service.key} at ${baseUrl}`,
              data: null,
              duration_ms: Date.now() - startTime,
              exception: error.message || 'Connection failed',
            },
          };
        }
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
   * Holds a long-running request to Render to force the container to wake up.
   * Runs independently of the fast checkHealth response.
   */
  private getOrStartLongPing(serviceKey: string, candidateUrls: string[]): Promise<any> {
    if (this.activePings.has(serviceKey)) {
      return this.activePings.get(serviceKey)!;
    }

    const promise = (async () => {
      this.logger.log(`🚀 [WAKE-UP INIT] Creating and holding connection for ${serviceKey}...`);
      const startTime = Date.now();
      const maxDuration = 180000; // Allow up to 3 minutes for Render to boot
      
      while (Date.now() - startTime < maxDuration) {
        for (const url of candidateUrls) {
          try {
            // Send request with HUGE timeout so Render Proxy holds the connection open while booting
            const res = await firstValueFrom(
              this.httpService.get(url, {
                timeout: 60000, 
                validateStatus: () => true,
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) QuickBite-Gateway/1.0',
                  'Accept': 'application/json, text/plain, */*',
                },
              }),
            );
            
            const isHtml = typeof res.data === 'string' && res.data.includes('<!DOCTYPE html>');
            
            // If we got a valid JSON/Healthy response, the container is fully up!
            if (res.status >= 200 && res.status < 300 && !isHtml) {
              const body = res.data;
              const innerData = body?.data?.status ? body.data : body;
              const isHealthy = (innerData?.status === 'Healthy' || innerData?.status === 'ok' || innerData?.status === 'UP' || typeof body === 'object');
              
              if (isHealthy) {
                this.logger.log(`🎉 [WAKE-UP SUCCESS] ${serviceKey} is UP and returned 200 OK!`);
                
                // Keep the promise in cache for 10 seconds to serve subsequent rapid health checks, then clear it
                setTimeout(() => this.activePings.delete(serviceKey), 10000); 
                return res.data;
              }
            }
            
            // If Render drops connection with 502 HTML early, the loop continues and waits
          } catch (err) {
            // Network error / timeout, continue loop
          }
        }
        
        // Wait 4s before the next ping cycle to avoid spamming
        await new Promise((r) => setTimeout(r, 4000));
      }
      
      this.activePings.delete(serviceKey);
      throw new Error(`Timeout after ${maxDuration}ms waiting for Render container`);
    })();

    this.activePings.set(serviceKey, promise);
    
    // In case the promise rejects, remove it from the map so the next check can retry
    promise.catch(() => {
      if (this.activePings.get(serviceKey) === promise) {
        this.activePings.delete(serviceKey);
      }
    });

    return promise;
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
      
      if (!candidates.includes(urlObj.origin)) {
        candidates.push(urlObj.origin);
      }
      const originHealth = `${urlObj.origin}/health`;
      if (!candidates.includes(originHealth)) {
        candidates.push(originHealth);
      }
      const originApiAppHealth = `${urlObj.origin}/api/app/health`;
      if (!candidates.includes(originApiAppHealth)) {
        candidates.push(originApiAppHealth);
      }
      const originApiV1Health = `${urlObj.origin}/api/v1/health`;
      if (!candidates.includes(originApiV1Health)) {
        candidates.push(originApiV1Health);
      }
      const originApiHealth = `${urlObj.origin}/api/health`;
      if (!candidates.includes(originApiHealth)) {
        candidates.push(originApiHealth);
      }
    } catch {}

    return candidates;
  }
}
