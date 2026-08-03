import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientKafka } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';

import { FoodItem } from './entities/food-item.entity';
import { Category } from '@/category/entities/category.entity';
import { Restaurant } from '@/restaurant/entities/restaurant.entity';

import { CreateFoodItemDto } from './dto/create-food-item.dto';
import { UpdateFoodItemDto } from './dto/update-food-item.dto';
import { UpdateFoodItemImagesDto } from './dto/update-food-item-images.dto';
import { UpdateFoodItemVariantsDto } from './dto/update-food-item-variants.dto';
import { UpdateFoodItemToppingsDto } from './dto/update-food-item-toppings.dto';

import { PaginationDto } from '@/common/dto/pagination.dto';
import { PaginationHelper } from '@/common/helpers/pagination.helper';

import { FoodItemUpdatedEto } from './dto/food-item-updated.eto';

const CATALOG_EVENTS_TOPIC = 'catalog-events';
const FOOD_ITEM_SYNCED = 'food.item.synced';

@Injectable()
export class FoodItemService implements OnModuleInit {
  private readonly logger = new Logger(FoodItemService.name);

  constructor(
    @InjectRepository(FoodItem)
    private readonly foodItemRepository: Repository<FoodItem>,

    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,

    @InjectRepository(Restaurant)
    private readonly restaurantRepository: Repository<Restaurant>,

    @Inject('KAFKA_CLIENT')
    private readonly kafkaClient: ClientKafka,
  ) {}

  async onModuleInit() {
    try {
      await this.kafkaClient.connect();
      this.logger.log('[Kafka] Connected to Kafka broker successfully.');
    } catch (error) {
      this.logger.warn('[Kafka] Could not connect to Kafka broker. Events will fail until broker is available.');
    }
  }

  private async emitFoodItemSynced(foodItem: FoodItem): Promise<void> {
    const eto: FoodItemUpdatedEto = {
      id: foodItem.id,
      name: foodItem.name,
      price: Number(foodItem.price),
    };

    const payload = {
      eventName: FOOD_ITEM_SYNCED,
      eto,
    };

    try {
      await lastValueFrom(
        this.kafkaClient.emit(CATALOG_EVENTS_TOPIC, {
          key: foodItem.id,
          value: payload,
        }),
      );
      this.logger.log(
        `[Kafka SUCCESS] Published '${FOOD_ITEM_SYNCED}' to topic '${CATALOG_EVENTS_TOPIC}': ${JSON.stringify(eto)}`,
      );
    } catch (error) {
      this.logger.error(
        `[Kafka ERROR] Failed to publish '${FOOD_ITEM_SYNCED}' for foodId=${foodItem.id}`,
        error?.stack || error,
      );
    }
  }

  async create(
    dto: CreateFoodItemDto,
  ): Promise<FoodItem> {
    const restaurant =
      await this.restaurantRepository.findOne({
        where: {
          id: dto.restaurantId,
        },
      });

    if (!restaurant) {
      throw new NotFoundException(
        'Restaurant not found.',
      );
    }

    const category =
      await this.categoryRepository.findOne({
        where: {
          id: dto.categoryId,
        },
      });

    if (!category) {
      throw new NotFoundException(
        'Category not found.',
      );
    }

    if (
      category.restaurantId !==
      dto.restaurantId
    ) {
      throw new ConflictException(
        'Category does not belong to restaurant.',
      );
    }

    const existedSku =
      await this.foodItemRepository.findOne({
        where: {
          sku: dto.sku,
        },
      });

    if (existedSku) {
      throw new ConflictException(
        'SKU already exists.',
      );
    }

    const foodItem =
      this.foodItemRepository.create({
        ...dto,
      });

    const saved = await this.foodItemRepository.save(
      foodItem,
    );

    // Publish event to Order Service via Kafka
    await this.emitFoodItemSynced(saved);

    return saved;
  }

  async findAll(
    pagination: PaginationDto,
  ) {
    return PaginationHelper.paginate(
      this.foodItemRepository,
      pagination,
      {
        select: {
          id: true,
          name: true,
          price: true,
          currency: true,
          images: true,
          isAvailable: true,
          totalSold: true,
          restaurantId: true,
          categoryId: true,
        },
      },
    );
  }

  async findOne(
    id: string,
  ): Promise<FoodItem> {
    const foodItem =
      await this.foodItemRepository.findOne({
        where: {
          id,
        },
      });

    if (!foodItem) {
      throw new NotFoundException(
        'Food item not found.',
      );
    }

    return foodItem;
  }

  async findByRestaurant(
    restaurantId: string,
    pagination: PaginationDto,
  ) {
    return PaginationHelper.paginate(
      this.foodItemRepository,
      pagination,
      {
        where: {
          restaurantId,
        },
        select: {
          id: true,
          name: true,
          price: true,
          currency: true,
          images: true,
          isAvailable: true,
          totalSold: true,
        },
      },
    );
  }

  async findByCategory(
    categoryId: string,
    pagination: PaginationDto,
  ) {
    return PaginationHelper.paginate(
      this.foodItemRepository,
      pagination,
      {
        where: {
          categoryId,
        },
        select: {
          id: true,
          name: true,
          price: true,
          currency: true,
          images: true,
          isAvailable: true,
          totalSold: true,
        },
      },
    );
  }

  async update(
    id: string,
    dto: UpdateFoodItemDto,
  ): Promise<FoodItem> {
    const foodItem =
      await this.findOne(id);

    if (
      dto.sku &&
      dto.sku !== foodItem.sku
    ) {
      const existedSku =
        await this.foodItemRepository.findOne({
          where: {
            sku: dto.sku,
          },
        });

      if (existedSku) {
        throw new ConflictException(
          'SKU already exists.',
        );
      }
    }

    Object.assign(foodItem, dto);

    const updated = await this.foodItemRepository.save(
      foodItem,
    );

    // Publish event to Order Service via Kafka
    await this.emitFoodItemSynced(updated);

    return updated;
  }

  async updateImages(
    id: string,
    dto: UpdateFoodItemImagesDto,
  ): Promise<void> {
    const result =
      await this.foodItemRepository.update(
        id,
        {
          images: dto.images,
        },
      );

    if (!result.affected) {
      throw new NotFoundException(
        'Food item not found.',
      );
    }
  }

  async updateVariants(
    id: string,
    dto: UpdateFoodItemVariantsDto,
  ): Promise<void> {
    const result =
      await this.foodItemRepository.update(
        id,
        {
          variants: dto.variants,
        },
      );

    if (!result.affected) {
      throw new NotFoundException(
        'Food item not found.',
      );
    }
  }

  async updateToppings(
    id: string,
    dto: UpdateFoodItemToppingsDto,
  ): Promise<void> {
    const result =
      await this.foodItemRepository.update(
        id,
        {
          toppings: dto.toppings,
        },
      );

    if (!result.affected) {
      throw new NotFoundException(
        'Food item not found.',
      );
    }
  }

  async remove(
    id: string,
  ): Promise<void> {
    const result =
      await this.foodItemRepository.delete(
        id,
      );

    if (!result.affected) {
      throw new NotFoundException(
        'Food item not found.',
      );
    }
  }
}