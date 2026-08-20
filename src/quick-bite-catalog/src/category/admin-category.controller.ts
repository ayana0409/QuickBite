import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';

import { CategoryService } from './category.service';
import { PaginationDto } from '../common/dto/pagination.dto';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionKeys } from '../common/constants/permissions';

@Controller('admin/categories')
export class AdminCategoryController {
  constructor(
    private readonly categoryService: CategoryService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions(PermissionKeys.CATEGORY_MODERATION)
  findAllForAdmin(
    @Query() pagination: PaginationDto,
  ) {
    return this.categoryService.findAllForAdmin(pagination);
  }

  @Put(':id/rename')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions(PermissionKeys.CATEGORY_MODERATION)
  renameCategory(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body('newName') newName: string,
  ) {
    return this.categoryService.renameCategory(id, newName);
  }
}
