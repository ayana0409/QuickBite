import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
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
  private readonly logger = new Logger(FoodItemController.name);

  constructor(
    private readonly foodItemService: FoodItemService,
  ) { }

  @Post()
  @UseGuards(JwtAuthGuard, PermissionGuard)
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
  @UseGuards(JwtAuthGuard, PermissionGuard)
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
  @UseGuards(JwtAuthGuard, PermissionGuard)
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
  @UseGuards(JwtAuthGuard, PermissionGuard)
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
  @UseGuards(JwtAuthGuard, PermissionGuard)
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
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions(PermissionKeys.FOOD_ITEM_DELETE)
  remove(
    @Param('id')
    id: string,
  ) {
    return this.foodItemService.remove(
      id,
    );
  }

  @Post('events/order-completed')
  async simulateOrderCompleted(
    @Body() body: any,
  ) {
    this.logger.log(`[HTTP POST /food-items/events/order-completed] Received body: ${JSON.stringify(body)}`);
    await this.foodItemService.handleOrderCompleted(body?.eto || body?.data || body);
    return {
      success: true,
      message: 'Processed order.completed event successfully',
    };
  }

  @EventPattern('order-events')
  async handleOrderEventsTopic(
    @Payload() data: any,
    @Ctx() context: KafkaContext,
  ) {
    const rawMessage = typeof context?.getMessage === 'function' ? context.getMessage() : null;
    const key = rawMessage?.key ? rawMessage.key.toString() : '';
    const topic = typeof context?.getTopic === 'function' ? context.getTopic() : 'order-events';

    this.logger.log(
      `[Kafka Event Received] Topic: '${topic}', Key: '${key}', RawData: ${JSON.stringify(data)}`,
    );

    let payload = data;
    if (!payload || (typeof payload === 'object' && Object.keys(payload).length === 0)) {
      payload = rawMessage?.value;
    }

    if (Buffer.isBuffer(payload)) {
      payload = payload.toString('utf-8');
    }

    if (typeof payload === 'string') {
      try {
        payload = JSON.parse(payload);
      } catch {
        // Keep as string if parsing fails
      }
    }

    if (payload && typeof payload === 'object' && 'value' in payload && payload.value) {
      let nested = payload.value;
      if (Buffer.isBuffer(nested)) nested = nested.toString('utf-8');
      if (typeof nested === 'string') {
        try {
          nested = JSON.parse(nested);
        } catch {}
      }
      if (typeof nested === 'object' && nested !== null) {
        payload = nested;
      }
    }

    const rawEventName =
      (key && key.trim()) ||
      payload?.eventName ||
      payload?.eventType ||
      payload?.EventName ||
      payload?.EventType ||
      payload?.pattern ||
      '';

    const normalizedKey = String(key || '').trim().toLowerCase();
    const normalizedEventName = String(rawEventName || '').trim().toLowerCase();

    this.logger.log(`[Kafka Event Parsed] Extracted eventName: '${rawEventName}', Key: '${key}'`);

    // Strictly match order.completed only. Do NOT match if key/eventName is order.submitted, order.confirmed, order.preparing, etc.
    const isOrderCompleted =
      normalizedKey === 'order.completed' ||
      normalizedKey === 'order_completed' ||
      normalizedEventName === 'order.completed' ||
      normalizedEventName === 'order_completed';

    if (isOrderCompleted) {
      await this.foodItemService.handleOrderCompleted(payload?.eto || payload?.data || payload);
    } else {
      this.logger.debug(
        `[Kafka Event Ignored] Event '${rawEventName || key}' is not 'order.completed'. Skipping totalSold update.`,
      );
    }
  }
}