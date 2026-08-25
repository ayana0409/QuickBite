import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { Request } from 'express';
import { DynamicConfigService } from '../../config/dynamic-config.service';
import { RedisCacheService } from '../../cache/redis-cache.service';

/**
 * Universal Global HTTP GET Cache Interceptor.
 * Caches all successful GET responses across API Gateway in Redis with a dynamic TTL
 * configured from MongoDB (GET_CACHE_TTL, validated between 0 and 120 seconds).
 */
@Injectable()
export class GlobalHttpCacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HttpCache');

  // Endpoints that should bypass global caching (health, config management, metrics)
  private readonly excludedPrefixes = [
    '/health',
    '/config',
    '/metrics',
  ];

  constructor(
    private readonly dynamicConfigService: DynamicConfigService,
    private readonly redisCacheService: RedisCacheService,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();

    // 1. Only cache idempotent GET requests
    if (req.method !== 'GET') {
      return next.handle();
    }

    const rawUrl = req.originalUrl || req.url;

    // 2. Check excluded prefixes
    if (this.excludedPrefixes.some((prefix) => rawUrl.startsWith(prefix))) {
      return next.handle();
    }

    // 3. Check for explicit refresh query parameter
    const isForceRefresh = req.query?.refresh === 'true' || req.query?.refresh === '1';

    // 4. Retrieve dynamic TTL from MongoDB/Redis (validated 0-120s)
    const configuredTtl = await this.dynamicConfigService.getNumberAsync('GET_CACHE_TTL', 30);
    const ttlSeconds = Math.max(0, Math.min(120, configuredTtl));

    // If caching is disabled (TTL = 0), pass through directly
    if (ttlSeconds === 0) {
      return next.handle();
    }

    // 5. Construct a distinct cache key
    const authHeader = req.headers.authorization || '';
    const cleanUrl = rawUrl.replace(/([?&])refresh=[^&]+(&|$)/, '$1').replace(/[?&]$/, '');
    const cacheKey = `gateway:http:cache:GET:${cleanUrl}:[Auth:${authHeader ? authHeader : 'Anonymous'}]`;

    // 6. Check Redis cache if not force refresh
    if (!isForceRefresh) {
      const cached = await this.redisCacheService.get<any>(cacheKey);
      if (cached !== null && cached !== undefined) {
        this.logger.log(`⚡ [HTTP CACHE HIT] GET ${rawUrl} -> Serving from Redis Cache`);
        return of(cached);
      }
    }

    this.logger.log(`🔍 [HTTP CACHE MISS] GET ${rawUrl} -> Calling downstream service`);

    // 7. Execute request and store response in Redis
    return next.handle().pipe(
      tap({
        next: async (responseBody) => {
          if (responseBody !== undefined && responseBody !== null) {
            await this.redisCacheService.set(cacheKey, responseBody, ttlSeconds);
            this.logger.log(
              `💾 [HTTP CACHE STORED] Saved GET ${rawUrl} to Redis (TTL: ${ttlSeconds}s)`,
            );
          }
        },
        error: (err) => {
          this.logger.warn(`❌ [HTTP CACHE ERROR] GET ${rawUrl} failed: ${err?.message || err}`);
        },
      }),
    );
  }
}
