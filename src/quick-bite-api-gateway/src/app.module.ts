import { Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { HealthModule } from './health/health.module';
import { AppConfigModule } from './config/config.module';
import { DynamicConfigService } from './config/dynamic-config.service';
import { ProxyModule } from './proxy/proxy.module';

@Module({
  imports: [
    AppConfigModule,
    ThrottlerModule.forRootAsync({
      imports: [AppConfigModule],
      inject: [DynamicConfigService],
      useFactory: (config: DynamicConfigService) => [
        {
          ttl: config.getNumber('RATE_LIMIT_TTL', 60000),
          limit: config.getNumber('RATE_LIMIT_MAX', 100),
        },
      ],
    }),
    HealthModule,
    ProxyModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
