import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import * as https from 'https';
import { MerchantController } from './merchant.controller';
import { MerchantService } from './merchant.service';
import { AuthModule } from '../auth/auth.module';
import { AppConfigModule } from '../config/config.module';

@Module({
  imports: [
    HttpModule.register({
      httpsAgent: new https.Agent({
        rejectUnauthorized: false,
      }),
    }),
    AuthModule,
    AppConfigModule,
  ],
  controllers: [MerchantController],
  providers: [MerchantService],
})
export class MerchantModule {}
