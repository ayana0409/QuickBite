import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
  Request
} from '@nestjs/common';

import { RestaurantService } from './restaurant.service';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';

import { PaginationDto } from '../common/dto/pagination.dto';
import { PermissionGuard } from '@/auth/guards/permission.guard';
import { PermissionKeys } from '@/common/constants/permissions';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';

@Controller('restaurants')
export class RestaurantController {
  constructor(
    private readonly restaurantService: RestaurantService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard,PermissionGuard)
  @Permissions(PermissionKeys.RESTAURANT_CREATE)
  create(
    @Body() createRestaurantDto: CreateRestaurantDto,
  ) {
    return this.restaurantService.create(
      createRestaurantDto,
    );
  }

  @Get()
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions(PermissionKeys.RESTAURANT_READ)
  findAll(
    @Query() pagination: PaginationDto,
  ) {
    return this.restaurantService.findAll(
      pagination,
    );
  }

  @Get('owner/:ownerId')
  findByOwner(
    @Param('ownerId') ownerId: string
  ) {
    return this.restaurantService.findByOwner(ownerId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions(PermissionKeys.RESTAURANT_READ)
  findOne(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string
  ) {
    return this.restaurantService.findOne(
      id,
    );
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions(PermissionKeys.RESTAURANT_UPDATE)
  update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() updateRestaurantDto: UpdateRestaurantDto,
  ) {
    return this.restaurantService.update(
      id,
      updateRestaurantDto,
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions(PermissionKeys.RESTAURANT_DELETE)
  remove(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.restaurantService.remove(
      id,
    );
  }
}