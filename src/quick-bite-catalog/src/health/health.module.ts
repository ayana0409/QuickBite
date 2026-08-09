import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health.controller';
import { DatabaseHealthService } from './database.health';
import { KafkaHealthService } from './kafka.health';
import { SystemResourcesHealthService } from './system-resources.health';

@Module({
  imports: [TypeOrmModule, ConfigModule],
  controllers: [HealthController],
  providers: [
    DatabaseHealthService,
    KafkaHealthService,
    SystemResourcesHealthService,
  ],
})
export class HealthModule {}
