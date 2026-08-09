import { Global, Module, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import mongoose from 'mongoose';
import { DynamicConfigService, GATEWAY_CONFIG_MODEL } from './dynamic-config.service';
import { GatewayConfigSchema } from './schemas/gateway-config.schema';
import { ConfigManagementController } from './config.controller';
import { AuthModule } from '../auth/auth.module';

const logger = new Logger('AppConfigModule');

@Global()
@Module({
  imports: [
    AuthModule,
    ConfigModule.forRoot({ isGlobal: true }),
  ],
  controllers: [ConfigManagementController],
  providers: [
    {
      provide: GATEWAY_CONFIG_MODEL,
      useFactory: async (configService: ConfigService) => {
        const mongoUri =
          configService.get<string>('MONGODB_URI') ||
          'mongodb://localhost:27017/quickbite_gateway';
        try {
          // Non-blocking connection attempt with fast 3000ms timeout
          const conn = await mongoose
            .createConnection(mongoUri, {
              serverSelectionTimeoutMS: 3000,
            })
            .asPromise();
          logger.log('✅ MongoDB connected successfully for API Gateway.');
          return conn.model('GatewayConfig', GatewayConfigSchema);
        } catch (error: any) {
          logger.warn(
            `⚠️ MongoDB connection failed (${error.message}). API Gateway will continue running with .env fallback mode.`,
          );
          return null;
        }
      },
      inject: [ConfigService],
    },
    DynamicConfigService,
  ],
  exports: [DynamicConfigService, GATEWAY_CONFIG_MODEL],
})
export class AppConfigModule {}
