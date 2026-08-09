import * as fs from 'fs';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import { RestaurantModule } from './restaurant/restaurant.module';
import { getRequired } from './common/helpers/get-config';
import { AuthModule } from './auth/auth.module';
import { CategoryModule } from './category/category.module';
import { FoodItemModule } from './food-item/food-item.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [join(__dirname, '..', '.env'), '.env'],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const host = getRequired<string>(config, 'DB_HOST');
        const port = Number(getRequired<string>(config, 'DB_PORT'));
        if (Number.isNaN(port) || port <= 0) throw new Error('Invalid DB_PORT');

        const username = getRequired<string>(config, 'DB_USERNAME');
        const password = getRequired<string>(config, 'DB_PASSWORD');
        const database = getRequired<string>(config, 'DB_DATABASE');

        // select entity pattern suitable for runtime
        const isCompiled = __dirname.includes('dist') || process.env.NODE_ENV === 'production';
        const entities = isCompiled
          ? [join(__dirname, '..', '**', '*.entity.js')]
          : [join(__dirname, '..', '**', '*.entity.ts')];

        // SSL handling for Render PostgreSQL
        const rawSsl = config.get<string | boolean>('DB_SSL');
        const useSsl = rawSsl === true || String(rawSsl).toLowerCase() === 'true';

        const ssl = useSsl ? { rejectUnauthorized: false } : false;

        return {
          type: 'postgres',
          host,
          port,
          username,
          password,
          database,
          entities,
          synchronize: true,
          logging: true,
          ssl,
          extra: {
            max: 2,
            min: 1,
            ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
          },
          retryAttempts: 10,
          retryDelay: 3000,
          keepConnectionAlive: true,
          connectTimeoutMS: 10000,
        } as any;
      },
    }),
    RestaurantModule,
    AuthModule,
    CategoryModule,
    FoodItemModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
