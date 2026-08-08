import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { DynamicConfigService } from './dynamic-config.service';

@Controller('config')
export class ConfigManagementController {
  constructor(private readonly configService: DynamicConfigService) {}

  @Get(':key')
  async getConfig(@Param('key') key: string) {
    const value = await this.configService.getAsync(key);
    return { key, value };
  }

  @Post(':key')
  async setConfig(@Param('key') key: string, @Body('value') value: string) {
    await this.configService.setConfig(key, value);
    return { success: true, key, value };
  }
}
