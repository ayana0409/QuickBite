import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import Redis from 'ioredis';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { GatewayConfig, GatewayConfigDocument } from './schemas/gateway-config.schema';

@Injectable()
export class DynamicConfigService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DynamicConfigService.name);
  private redisClient: Redis | null = null;
  private envConfig: { [key: string]: string } = {};

  constructor(
    private readonly configService: ConfigService,
    @InjectModel(GatewayConfig.name)
    private readonly configModel: Model<GatewayConfigDocument>,
  ) {
    this.loadEnv();
    this.watchEnvFile();
  }

  async onModuleInit() {
    this.initRedis();
    await this.seedDefaultConfigs();
  }

  onModuleDestroy() {
    if (this.redisClient) {
      this.redisClient.quit();
    }
  }

  /**
   * Seed initial configs to MongoDB if they don't exist
   */
  private async seedDefaultConfigs() {
    const defaultConfigs: { [key: string]: string } = {
      RATE_LIMIT_TTL: '60000',
      RATE_LIMIT_MAX: '100',
      IDENTITY_URL: 'http://localhost:44391',
      ORDER_URL: 'https://localhost:44386/api/app',
      CATALOG_URL: 'http://localhost:3000',
      INVENTORY_URL: 'http://localhost:8083/api/v1',
      PAYMENT_URL: 'http://localhost:8084/v1',
    };

    try {
      for (const [key, defaultValue] of Object.entries(defaultConfigs)) {
        const existing = await this.configModel.findOne({ key }).exec();
        if (!existing) {
          // Fallback to .env if provided, otherwise use default
          const valueToSeed = this.getEnv(key, defaultValue);
          await this.configModel.create({ key, value: valueToSeed });
          this.logger.log(`🌱 Seeded default config: ${key} = ${valueToSeed}`);
        }
      }
    } catch (error: any) {
      this.logger.warn(`Failed to seed default configs to MongoDB: ${error.message}`);
    }
  }

  private initRedis() {
    const host = this.getEnv('REDIS_HOST', 'localhost');
    const port = parseInt(this.getEnv('REDIS_PORT', '6379'), 10);
    const username = this.getEnv('REDIS_USERNAME', '');
    const password = this.getEnv('REDIS_PASSWORD', '');

    try {
      this.redisClient = new Redis({
        host,
        port,
        ...(username ? { username } : {}),
        ...(password ? { password } : {}),
        retryStrategy: () => 5000,
        lazyConnect: true,
      });

      this.redisClient.connect().catch((err) => {
        this.logger.warn(`Redis connection failed (${err.message}). Will fallback to Mongo/Env.`);
      });
    } catch (err: any) {
      this.logger.warn(`Redis initialization error: ${err.message}`);
    }
  }

  private loadEnv() {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const config = dotenv.parse(fs.readFileSync(envPath));
      this.envConfig = config;
    }
  }

  private watchEnvFile() {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      fs.watch(envPath, () => {
        try {
          this.loadEnv();
        } catch {
          // Ignore transient read errors during save
        }
      });
    }
  }

  private getEnv(key: string, defaultValue = ''): string {
    return this.envConfig[key] || this.configService.get<string>(key) || defaultValue;
  }

  /**
   * Retrieves config value with fallback chain: Redis -> MongoDB -> .env
   */
  async getAsync(key: string, defaultValue = ''): Promise<string> {
    const redisKey = `gateway:config:${key}`;

    // 1. Check Redis Cache
    if (this.redisClient && this.redisClient.status === 'ready') {
      try {
        const cachedVal = await this.redisClient.get(redisKey);
        if (cachedVal !== null) {
          return cachedVal;
        }
      } catch (err: any) {
        this.logger.warn(`Redis get error for ${key}: ${err.message}`);
      }
    }

    // 2. Check MongoDB
    try {
      const dbConfig = await this.configModel.findOne({ key }).exec();
      if (dbConfig && dbConfig.value !== undefined) {
        // Cache to Redis for future requests (TTL 60s)
        if (this.redisClient && this.redisClient.status === 'ready') {
          this.redisClient.set(redisKey, dbConfig.value, 'EX', 60).catch(() => { });
        }
        return dbConfig.value;
      }
    } catch (err: any) {
      this.logger.warn(`MongoDB query failed for ${key}: ${err.message}`);
    }

    // 3. Fallback to .env / process.env
    return this.getEnv(key, defaultValue);
  }

  /**
   * Synchronous getter for cases where async is not possible (falls back to .env)
   */
  get(key: string, defaultValue = ''): string {
    return this.getEnv(key, defaultValue);
  }

  getNumber(key: string, defaultValue: number): number {
    const val = this.get(key);
    return val ? parseInt(val, 10) : defaultValue;
  }

  async getNumberAsync(key: string, defaultValue: number): Promise<number> {
    const val = await this.getAsync(key);
    return val ? parseInt(val, 10) : defaultValue;
  }

  /**
   * Helper to set/update a config in MongoDB and update Redis cache immediately
   */
  async setConfig(key: string, value: string): Promise<void> {
    await this.configModel.findOneAndUpdate(
      { key },
      { key, value },
      { upsert: true, new: true },
    ).exec();

    const redisKey = `gateway:config:${key}`;
    if (this.redisClient && this.redisClient.status === 'ready') {
      await this.redisClient.set(redisKey, value, 'EX', 60);
    }
  }

  async checkRedisHealth(): Promise<{ status: 'Healthy' | 'Unhealthy'; duration_ms: number; description: string; exception?: string }> {
    const startTime = Date.now();
    if (!this.redisClient || this.redisClient.status !== 'ready') {
      return {
        status: 'Unhealthy',
        description: 'Redis client is not connected or ready.',
        duration_ms: Date.now() - startTime,
        exception: this.redisClient ? `Status: ${this.redisClient.status}` : 'Client uninitialized',
      };
    }
    try {
      await this.redisClient.ping();
      return {
        status: 'Healthy',
        description: 'Redis connection is healthy.',
        duration_ms: Date.now() - startTime,
      };
    } catch (err: any) {
      return {
        status: 'Unhealthy',
        description: 'Redis ping failed.',
        duration_ms: Date.now() - startTime,
        exception: err.message,
      };
    }
  }

  async checkMongoHealth(): Promise<{ status: 'Healthy' | 'Unhealthy'; duration_ms: number; description: string; exception?: string }> {
    const startTime = Date.now();
    try {
      const state = this.configModel.db.readyState;
      if (state === 1) {
        return {
          status: 'Healthy',
          description: 'MongoDB database connection is healthy.',
          duration_ms: Date.now() - startTime,
        };
      }
      return {
        status: 'Unhealthy',
        description: `MongoDB state is not connected (readyState: ${state}).`,
        duration_ms: Date.now() - startTime,
        exception: `readyState: ${state}`,
      };
    } catch (err: any) {
      return {
        status: 'Unhealthy',
        description: 'MongoDB connection check failed.',
        duration_ms: Date.now() - startTime,
        exception: err.message,
      };
    }
  }
}

