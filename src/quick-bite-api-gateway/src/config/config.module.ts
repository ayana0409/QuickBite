import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { DynamicConfigService } from './dynamic-config.service';
import { GatewayConfig, GatewayConfigSchema } from './schemas/gateway-config.schema';
import { ConfigManagementController } from './config.controller';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGODB_URI') || 'mongodb://localhost:27017/quickbite_gateway',
      }),
    }),
    MongooseModule.forFeature([
      { name: GatewayConfig.name, schema: GatewayConfigSchema },
    ]),
  ],
  controllers: [ConfigManagementController],
  providers: [DynamicConfigService],
  exports: [DynamicConfigService, MongooseModule],
})
export class AppConfigModule {}
