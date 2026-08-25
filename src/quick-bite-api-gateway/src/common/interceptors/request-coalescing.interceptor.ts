import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { finalize, shareReplay, tap } from 'rxjs/operators';
import type { Request } from 'express';

interface InFlightEntry {
  observable: Observable<any>;
  subscribers: number;
  startTime: number;
}

/**
 * Interceptor that coalesces duplicate concurrent in-flight GET requests
 * into a single execution stream to eliminate redundant backend/database workload.
 */
@Injectable()
export class RequestCoalescingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('RequestCoalescing');
  private readonly inFlightRequests = new Map<string, InFlightEntry>();

  // Environment-based configurations with safe empty defaults
  private readonly isEnabled = process.env.COALESCING_ENABLED !== 'false';
  private readonly excludePaths = (process.env.COALESCING_EXCLUDE_PATHS || '')
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  private readonly additionalHeaders = (process.env.COALESCING_ADDITIONAL_HEADERS || '')
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (!this.isEnabled) {
      return next.handle();
    }

    const http = context.switchToHttp();
    const req = http.getRequest<Request>();

    // Request coalescing only applies to idempotent GET requests
    if (req.method !== 'GET') {
      return next.handle();
    }

    const rawUrl = req.originalUrl || req.url;

    // Check if the current request path matches any excluded pattern
    if (this.excludePaths.some((pattern) => rawUrl.includes(pattern))) {
      return next.handle();
    }

    // Construct a granular, collision-free coalescing key
    const authHeader = req.headers.authorization || '';
    const extraHeadersPart = this.additionalHeaders
      .map((headerName) => `${headerName}:${req.headers[headerName] || ''}`)
      .join('|');

    const coalesceKey = `GET ${rawUrl} [Auth:${authHeader || 'None'}${
      extraHeadersPart ? `|${extraHeadersPart}` : ''
    }]`;

    // 1. If an identical request is currently in-flight, coalesce into it
    const existing = this.inFlightRequests.get(coalesceKey);
    if (existing) {
      existing.subscribers += 1;
      this.logger.log(
        `⚡ [COALESCING HIT] ${req.method} ${rawUrl} -> Merged with active in-flight request (Total waiting: ${existing.subscribers})`,
      );
      return existing.observable;
    }

    // 2. Otherwise, initiate a new upstream execution
    const startTime = Date.now();
    this.logger.log(
      `🚀 [COALESCING START] ${req.method} ${rawUrl} -> Initiating fresh upstream service call`,
    );

    const entry: InFlightEntry = {
      subscribers: 1,
      startTime,
      observable: null as any,
    };

    const sharedObservable = next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - entry.startTime;
          this.logger.log(
            `✅ [COALESCING DONE] ${req.method} ${rawUrl} (${duration}ms) -> Emitted result to ${entry.subscribers} coalesced client(s)`,
          );
        },
        error: (err) => {
          const duration = Date.now() - entry.startTime;
          this.logger.warn(
            `❌ [COALESCING ERROR] ${req.method} ${rawUrl} (${duration}ms) -> Execution failed: ${err?.message || err}`,
          );
        },
      }),
      finalize(() => {
        // Clean up from map once all subscribers finish or error out
        this.inFlightRequests.delete(coalesceKey);
      }),
      shareReplay({ bufferSize: 1, refCount: true }),
    );

    entry.observable = sharedObservable;
    this.inFlightRequests.set(coalesceKey, entry);

    return sharedObservable;
  }
}
