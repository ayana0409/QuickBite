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
import { AbpKafkaSerializer } from '@/common/serializers/abp-kafka.serializer';
import { getKafkaConfig } from '@/common/helpers/kafka-config.helper';

@Module({
  imports: [
    TypeOrmModule.forFeature([Restaurant, Category, FoodItem]),
    PassportModule.register({
      defaultStrategy: 'jwt',
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
  providers: [FoodItemService, JwtStrategy],
})
export class FoodItemModule {}
