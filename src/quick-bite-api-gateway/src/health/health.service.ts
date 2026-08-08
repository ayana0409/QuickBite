import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { DynamicConfigService } from '../config/dynamic-config.service';
import { HealthCheckResponseDto, ServiceHealthStatus } from './dto/health-check-response.dto';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: DynamicConfigService,
  ) {}

  async checkHealth(): Promise<HealthCheckResponseDto> {
    const services = [
      { name: 'identity', configKey: 'IDENTITY_URL' },
      { name: 'order', configKey: 'ORDER_URL' },
      { name: 'catalog', configKey: 'CATALOG_URL' },
      { name: 'inventory', configKey: 'INVENTORY_URL' },
      { name: 'payment', configKey: 'PAYMENT_URL' },
    ];

    const results: ServiceHealthStatus[] = await Promise.all(
      services.map(async (service) => {
        const baseUrl = await this.configService.getAsync(service.configKey);
        if (!baseUrl) {
          return {
            serviceName: service.name,
            status: 'UNKNOWN',
            error: 'URL not configured',
          };
        }

        const healthUrl = `${baseUrl.replace(/\/$/, '')}/health`;
        const startTime = Date.now();

        try {
          const response = await firstValueFrom(
            this.httpService.get(healthUrl, { timeout: 3000 }),
          );
          const responseTimeMs = Date.now() - startTime;

          return {
            serviceName: service.name,
            status: response.status >= 200 && response.status < 400 ? 'UP' : 'DOWN',
            responseTimeMs,
          };
        } catch (error: any) {
          const responseTimeMs = Date.now() - startTime;
          return {
            serviceName: service.name,
            status: 'DOWN',
            responseTimeMs,
            error: error.message || 'Connection failed',
          };
        }
      }),
    );

    const hasDown = results.some((s) => s.status === 'DOWN');
    const overallStatus = hasDown ? 'degraded' : 'ok';

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      services: results,
    };
  }
}
