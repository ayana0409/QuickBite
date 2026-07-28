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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
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

        // chọn pattern entity phù hợp với runtime
        const isCompiled = __dirname.includes('dist') || process.env.NODE_ENV === 'production';
        const entities = isCompiled
          ? [join(__dirname, '..', '**', '*.entity.js')]
          : [join(__dirname, '..', '**', '*.entity.ts')];

        // SSL handling
        const rawSsl = config.get<string | boolean>('DB_SSL');
        const useSsl = rawSsl === true || String(rawSsl).toLowerCase() === 'true';

        let extra: any = {};
        if (useSsl) {
          const caPath = config.get<string>('DB_SSL_CA_PATH') || '/secrets/ca.pem';
          if (!fs.existsSync(caPath)) {
            throw new Error(`DB SSL enabled but CA file not found at ${caPath}`);
          }
          const ca = fs.readFileSync(caPath).toString();
          // dùng extra.ssl để chắc chắn driver pg nhận được CA
          extra = { ssl: { ca, rejectUnauthorized: true } };
        }

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
          extra,
        } as any;
      },
    }),
    RestaurantModule,
    AuthModule,
    CategoryModule,
    // ...other modules
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
