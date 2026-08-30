import { Module } from '@nestjs/common';
import { FoodItemService } from './food-item.service';
import { FoodItemController } from './food-item.controller';
import { JwtStrategy } from '@/auth/strategies/jwt.strategy';
import { Category } from '@/category/entities/category.entity';
import { Restaurant } from '@/restaurant/entities/restaurant.entity';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FoodItem } from './entities/food-item.entity';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { MulterModule } from '@nestjs/platform-express';
import { AbpKafkaSerializer } from '@/common/serializers/abp-kafka.serializer';
import { getKafkaConfig } from '@/common/helpers/kafka-config.helper';

import { STORAGE_SERVICE } from './storage/storage.interface';
import { LocalStorageService } from './storage/local-storage.service';
import { CloudinaryStorageService } from './storage/cloudinary-storage.service';
import { ImageProcessorService } from './storage/image-processor.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Restaurant, Category, FoodItem]),
    PassportModule.register({
      defaultStrategy: 'jwt',
    }),
    MulterModule.register({
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB per file limit
      },
    }),
    ClientsModule.registerAsync([
      {
        name: 'KAFKA_CLIENT',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => {
          const rawBroker = config.get<string>('KAFKA_BROKER') || 'localhost:9092';
          const { brokers, ssl, sasl } = getKafkaConfig(rawBroker);

          return {
            transport: Transport.KAFKA,
            options: {
              client: {
                clientId: 'catalog-service',
                brokers,
                ssl,
                sasl,
                retry: {
                  initialRetryTime: 300,
                  retries: 10,
                  maxRetryTime: 30000,
                  factor: 2,
                },
                connectionTimeout: 10000,
                requestTimeout: 30000,
              },
              producerOnlyMode: true,
              serializer: new AbpKafkaSerializer(),
            },
          };
        },
      },
    ]),
  ],
  controllers: [FoodItemController],
  providers: [
    FoodItemService,
    JwtStrategy,
    ImageProcessorService,
    LocalStorageService,
    CloudinaryStorageService,
    {
      provide: STORAGE_SERVICE,
      inject: [ConfigService, LocalStorageService, CloudinaryStorageService],
      useFactory: (
        config: ConfigService,
        localStorageService: LocalStorageService,
        cloudinaryStorageService: CloudinaryStorageService,
      ) => {
        // Default to cloudinary if STORAGE_PROVIDER is not explicitly specified
        const provider = (config.get<string>('STORAGE_PROVIDER') || 'cloudinary').toLowerCase();
        if (provider === 'local') {
          return localStorageService;
        }
        return cloudinaryStorageService;
      },
    },
  ],
  exports: [FoodItemService],
})
export class FoodItemModule {}
