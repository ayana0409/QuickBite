import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export interface CachedResponse {
  statusCode: number;
  data: any;
}

@Injectable()
export class RedisCacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisCacheService.name);
  private client: Redis | null = null;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const host = this.configService.get<string>('REDIS_HOST', 'localhost');
    const port = parseInt(this.configService.get<string>('REDIS_PORT', '6379'), 10);
    const username = this.configService.get<string>('REDIS_USERNAME', '');
    const password = this.configService.get<string>('REDIS_PASSWORD', '');

    try {
      this.client = new Redis({
        host,
        port,
        ...(username ? { username } : {}),
        ...(password ? { password } : {}),
        retryStrategy: () => 5000,
        lazyConnect: true,
      });

      this.client
        .connect()
        .then(() => {
          this.logger.log('✅ Redis Cache connected successfully.');
        })
        .catch((err) => {
          this.logger.warn(`⚠️ Redis Cache connection failed: ${err.message}`);
        });
    } catch (err: any) {
      this.logger.warn(`⚠️ Redis Cache init error: ${err.message}`);
    }
  }

  onModuleDestroy() {
    if (this.client) {
      this.client.quit();
    }
  }

  private isReady(): boolean {
    return !!(this.client && this.client.status === 'ready');
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.isReady()) return null;
    try {
      const data = await this.client!.get(key);
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch (err: any) {
      this.logger.warn(`Redis GET error for key [${key}]: ${err.message}`);
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds: number): Promise<void> {
    if (!this.isReady()) return;
    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds > 0) {
        await this.client!.set(key, serialized, 'EX', ttlSeconds);
      } else {
        await this.client!.set(key, serialized);
      }
    } catch (err: any) {
      this.logger.warn(`Redis SET error for key [${key}]: ${err.message}`);
    }
  }

  async del(key: string): Promise<void> {
    if (!this.isReady()) return;
    try {
      await this.client!.del(key);
      this.logger.log(`🗑️ [CACHE DEL] Key [${key}] deleted`);
    } catch (err: any) {
      this.logger.warn(`Redis DEL error for key [${key}]: ${err.message}`);
    }
  }

  async delByPattern(pattern: string): Promise<void> {
    if (!this.isReady()) return;
    try {
      const stream = this.client!.scanStream({
        match: pattern,
        count: 100,
      });

      let keysDeleted = 0;
      stream.on('data', async (keys: string[]) => {
        if (keys.length > 0) {
          const pipeline = this.client!.pipeline();
          keys.forEach((k) => pipeline.del(k));
          await pipeline.exec();
          keysDeleted += keys.length;
        }
      });

      await new Promise<void>((resolve) => {
        stream.on('end', () => {
          if (keysDeleted > 0) {
            this.logger.log(`🗑️ [CACHE DEL PATTERN] Deleted ${keysDeleted} keys matching pattern [${pattern}]`);
          }
          resolve();
        });
        stream.on('error', (err) => {
          this.logger.warn(`Redis scanStream error for pattern [${pattern}]: ${err.message}`);
          resolve();
        });
      });
    } catch (err: any) {
      this.logger.warn(`Redis DEL PATTERN error for [${pattern}]: ${err.message}`);
    }
  }
}
