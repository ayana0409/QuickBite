import {
  Body,
  Controller,
  Delete,
  FileTypeValidator,
  Get,
  Logger,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Patch,
  Post,
  Put,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Ctx, EventPattern, KafkaContext, Payload } from '@nestjs/microservices';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';

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

  constructor(private readonly foodItemService: FoodItemService) {}

  @Post()
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions(PermissionKeys.FOOD_ITEM_CREATE)
  @ApiOperation({ summary: 'Create a new food item' })
  create(
    @Body()
    dto: CreateFoodItemDto,
  ) {
    return this.foodItemService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all food items with pagination' })
  findAll(
    @Query()
    pagination: PaginationDto,
  ) {
    return this.foodItemService.findAll(pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a food item by ID' })
  findOne(
    @Param('id')
    id: string,
  ) {
    return this.foodItemService.findOne(id);
  }

  @Get('/restaurant/:restaurantId')
  @ApiOperation({ summary: 'Get food items by restaurant ID' })
  findByRestaurant(
    @Param('restaurantId')
    restaurantId: string,

    @Query()
    pagination: PaginationDto,
  ) {
    return this.foodItemService.findByRestaurant(restaurantId, pagination);
  }

  @Get('/category/:categoryId')
  @ApiOperation({ summary: 'Get food items by category ID' })
  findByCategory(
    @Param('categoryId')
    categoryId: string,

    @Query()
    pagination: PaginationDto,
  ) {
    return this.foodItemService.findByCategory(categoryId, pagination);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions(PermissionKeys.FOOD_ITEM_UPDATE)
  @ApiOperation({ summary: 'Update food item details' })
  update(
    @Param('id')
    id: string,

    @Body()
    dto: UpdateFoodItemDto,
  ) {
    return this.foodItemService.update(id, dto);
  }

  @Patch(':id/images')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions(PermissionKeys.FOOD_ITEM_UPDATE)
  @ApiOperation({ summary: 'Update food item image list (JSON array for backward compatibility)' })
  updateImages(
    @Param('id')
    id: string,

    @Body()
    dto: UpdateFoodItemImagesDto,
  ) {
    return this.foodItemService.updateImages(id, dto);
  }

  /**
   * Upload additional images for a food item (max 5 total, <= 5MB/image)
   */
  @Post(':id/images')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions(PermissionKeys.FOOD_ITEM_UPDATE)
  @ApiOperation({ summary: 'Upload new images for a food item (multipart/form-data, max 5 images total)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        images: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    },
  })
  @UseInterceptors(FilesInterceptor('images', 5))
  uploadImages(
    @Param('id')
    id: string,

    @UploadedFiles(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /^image\/(jpeg|png|webp|jpg)$/ }),
        ],
        fileIsRequired: true,
      }),
    )
    files: Express.Multer.File[],
  ) {
    return this.foodItemService.addImages(id, files);
  }

  /**
   * Replace all images for a food item (multipart/form-data, max 5)
   */
  @Put(':id/images')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions(PermissionKeys.FOOD_ITEM_UPDATE)
  @ApiOperation({ summary: 'Replace all images for a food item (multipart/form-data, max 5)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        images: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    },
  })
  @UseInterceptors(FilesInterceptor('images', 5))
  replaceImages(
    @Param('id')
    id: string,

    @UploadedFiles(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /^image\/(jpeg|png|webp|jpg)$/ }),
        ],
        fileIsRequired: true,
      }),
    )
    files: Express.Multer.File[],
  ) {
    return this.foodItemService.replaceImages(id, files);
  }

  /**
   * Delete a single image from a food item
   */
  @Delete(':id/images/:imageName')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions(PermissionKeys.FOOD_ITEM_UPDATE)
  @ApiOperation({ summary: 'Delete a single image from a food item' })
  removeImage(
    @Param('id')
    id: string,

    @Param('imageName')
    imageName: string,
  ) {
    return this.foodItemService.removeImage(id, imageName);
  }

  @Patch(':id/variants')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions(PermissionKeys.FOOD_ITEM_UPDATE)
  @ApiOperation({ summary: 'Update food item variants' })
  updateVariants(
    @Param('id')
    id: string,

    @Body()
    dto: UpdateFoodItemVariantsDto,
  ) {
    return this.foodItemService.updateVariants(id, dto);
  }

  @Patch(':id/toppings')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions(PermissionKeys.FOOD_ITEM_UPDATE)
  @ApiOperation({ summary: 'Update food item toppings' })
  updateToppings(
    @Param('id')
    id: string,

    @Body()
    dto: UpdateFoodItemToppingsDto,
  ) {
    return this.foodItemService.updateToppings(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions(PermissionKeys.FOOD_ITEM_DELETE)
  @ApiOperation({ summary: 'Delete a food item and its associated images' })
  remove(
    @Param('id')
    id: string,
  ) {
    return this.foodItemService.remove(id);
  }

  @Post('events/order-completed')
  async simulateOrderCompleted(@Body() body: any) {
    this.logger.log(`[HTTP POST /food-items/events/order-completed] Received body: ${JSON.stringify(body)}`);
    await this.foodItemService.handleOrderCompleted(body?.eto || body?.data || body);
    return {
      success: true,
      message: 'Processed order.completed event successfully',
    };
  }

  @EventPattern('order-events')
  async handleOrderEventsTopic(@Payload() data: any, @Ctx() context: KafkaContext) {
    const rawMessage = typeof context?.getMessage === 'function' ? context.getMessage() : null;
    const key = rawMessage?.key ? rawMessage.key.toString().trim() : '';

    // Filter strictly by key: only process order.completed event
    if (key !== 'order.completed') {
      return;
    }

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
        // Keep as string
      }
    }

    this.logger.log(`[Kafka] Processing order.completed: ${JSON.stringify(payload)}`);
    await this.foodItemService.handleOrderCompleted(payload?.eto || payload?.data || payload);
  }
}