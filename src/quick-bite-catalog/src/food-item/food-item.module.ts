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

@Module({
  imports: [
        TypeOrmModule.forFeature([Restaurant, Category, FoodItem]),
        PassportModule.register({
      defaultStrategy:'jwt'
   }),
    ClientsModule.registerAsync([
      {
        name: 'KAFKA_CLIENT',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => {
          const rawBroker = config.get<string>('KAFKA_BROKER') || 'localhost:9092';
          
          let brokers = [rawBroker];
          let ssl: any = undefined;
          let sasl: any = undefined;

          if (rawBroker.includes('Host=') && rawBroker.includes('Port=')) {
            const map = new Map<string, string>();
            rawBroker.split(';').forEach((part) => {
              const idx = part.indexOf('=');
              if (idx > -1) {
                const key = part.substring(0, idx).trim().toLowerCase();
                const val = part.substring(idx + 1).trim();
                map.set(key, val);
              }
            });

            const host = map.get('host');
            const port = map.get('port');
            const username = map.get('username');
            const password = map.get('password');
            const trustServerCert = map.get('trust server certificate') === 'true';

            if (host && port) {
              brokers = [`${host}:${port}`];
            }

            if (trustServerCert) {
              ssl = { rejectUnauthorized: false };
            } else {
              ssl = true;
            }

            if (username && password) {
              sasl = {
                mechanism: 'scram-sha-512',
                username,
                password,
              };
            }
          }

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
