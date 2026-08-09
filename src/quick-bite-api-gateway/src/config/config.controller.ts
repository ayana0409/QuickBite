import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { DynamicConfigService } from './dynamic-config.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PermissionKeys } from '../common/constants/permissions';

@Controller('config')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ConfigManagementController {
  constructor(private readonly configService: DynamicConfigService) {}

  @Get(':key')
  @Permissions(PermissionKeys.GATEWAY_VIEW)
  async getConfig(@Param('key') key: string) {
    const value = await this.configService.getAsync(key);
    return { key, value };
  }

  @Post(':key')
  @Permissions(PermissionKeys.GATEWAY_UPDATE)
  async setConfig(@Param('key') key: string, @Body('value') value: string) {
    await this.configService.setConfig(key, value);
    return { success: true, key, value };
  }
}

