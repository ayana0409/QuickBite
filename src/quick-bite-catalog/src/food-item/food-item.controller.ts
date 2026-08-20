import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Ctx, EventPattern, KafkaContext, Payload } from '@nestjs/microservices';

import { ApiTags } from '@nestjs/swagger';
import { FoodItemService } from './food-item.service';

import { PaginationDto } from '@/common/dto/pagination.dto';

import { CreateFoodItemDto } from './dto/create-food-item.dto';
import { UpdateFoodItemDto } from './dto/update-food-item.dto';
import { UpdateFoodItemImagesDto } from './dto/update-food-item-images.dto';
import { UpdateFoodItemVariantsDto } from './dto/update-food-item-variants.dto';
import { UpdateFoodItemToppingsDto } from './dto/update-food-item-toppings.dto';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { PermissionGuard } from '@/auth/guards/permission.guard';
import { PermissionKeys } from '@/common/constants/permissions';
import { Permissions } from '../auth/decorators/permissions.decorator';

@ApiTags('Food Items')
@Controller('food-items')
export class FoodItemController {
  constructor(
    private readonly foodItemService: FoodItemService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard,PermissionGuard)
  @Permissions(PermissionKeys.FOOD_ITEM_CREATE)
  create(
    @Body()
    dto: CreateFoodItemDto,
  ) {
    return this.foodItemService.create(
      dto,
    );
  }

  @Get()
  findAll(
    @Query()
    pagination: PaginationDto,
  ) {
    return this.foodItemService.findAll(
      pagination,
    );
  }

  @Get(':id')
  findOne(
    @Param('id')
    id: string,
  ) {
    return this.foodItemService.findOne(
      id,
    );
  }

  @Get('/restaurant/:restaurantId')
  findByRestaurant(
    @Param('restaurantId')
    restaurantId: string,

    @Query()
    pagination: PaginationDto,
  ) {
    return this.foodItemService.findByRestaurant(
      restaurantId,
      pagination,
    );
  }

  @Get('/category/:categoryId')
  findByCategory(
    @Param('categoryId')
    categoryId: string,

    @Query()
    pagination: PaginationDto,
  ) {
    return this.foodItemService.findByCategory(
      categoryId,
      pagination,
    );
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard,PermissionGuard)
  @Permissions(PermissionKeys.FOOD_ITEM_UPDATE)
  update(
    @Param('id')
    id: string,

    @Body()
    dto: UpdateFoodItemDto,
  ) {
    return this.foodItemService.update(
      id,
      dto,
    );
  }

  @Patch(':id/images')
  @UseGuards(JwtAuthGuard,PermissionGuard)
  @Permissions(PermissionKeys.FOOD_ITEM_UPDATE)
  updateImages(
    @Param('id')
    id: string,

    @Body()
    dto: UpdateFoodItemImagesDto,
  ) {
    return this.foodItemService.updateImages(
      id,
      dto,
    );
  }

  @Patch(':id/variants')
  @UseGuards(JwtAuthGuard,PermissionGuard)
  @Permissions(PermissionKeys.FOOD_ITEM_UPDATE)
  updateVariants(
    @Param('id')
    id: string,

    @Body()
    dto: UpdateFoodItemVariantsDto,
  ) {
    return this.foodItemService.updateVariants(
      id,
      dto,
    );
  }

  @Patch(':id/toppings')
  @UseGuards(JwtAuthGuard,PermissionGuard)
  @Permissions(PermissionKeys.FOOD_ITEM_UPDATE)
  updateToppings(
    @Param('id')
    id: string,

    @Body()
    dto: UpdateFoodItemToppingsDto,
  ) {
    return this.foodItemService.updateToppings(
      id,
      dto,
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard,PermissionGuard)
  @Permissions(PermissionKeys.FOOD_ITEM_DELETE)
  remove(
    @Param('id')
    id: string,
  ) {
    return this.foodItemService.remove(
      id,
    );
  }

  @EventPattern('order-events')
  async handleOrderEventsTopic(
    @Payload() data: any,
    @Ctx() context: KafkaContext,
  ) {
    const rawMessage = context.getMessage();
    const key = rawMessage?.key ? rawMessage.key.toString() : '';

    let payload = data;
    if (typeof data === 'string') {
      try {
        payload = JSON.parse(data);
      } catch {
        payload = data;
      }
    }

    const eventName = payload?.eventName || payload?.eventType || key;
    if (
      eventName === 'order.completed' ||
      key === 'order.completed' ||
      (payload?.items && Array.isArray(payload.items))
    ) {
      await this.foodItemService.handleOrderCompleted(payload?.eto || payload);
    }
  }

  @EventPattern('order.completed')
  async handleOrderCompletedPattern(
    @Payload() data: any,
  ) {
    let payload = data;
    if (typeof data === 'string') {
      try {
        payload = JSON.parse(data);
      } catch {
        payload = data;
      }
    }
    await this.foodItemService.handleOrderCompleted(payload?.eto || payload);
  }
}