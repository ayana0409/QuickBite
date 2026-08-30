import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { ClientKafka } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
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
import { IStorageService, STORAGE_SERVICE } from './storage/storage.interface';
import { ImageProcessorService } from './storage/image-processor.service';

const CATALOG_EVENTS_TOPIC = 'catalog-events';
const FOOD_ITEM_SYNCED = 'food.item.synced';
const MAX_IMAGES_PER_ITEM = 5;

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

    @Inject(STORAGE_SERVICE)
    private readonly storageService: IStorageService,

    private readonly imageProcessorService: ImageProcessorService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    await this.connectKafkaWithRetry();
  }

  /**
   * Helper property to get the base URL for images from environment
   */
  private get imageBaseUrl(): string {
    const url = this.configService.get<string>('IMAGE_BASE_URL') || '';
    if (!url) return '';
    return url.endsWith('/') ? url : `${url}/`;
  }

  /**
   * Format single image filename into full URL if IMAGE_BASE_URL is configured
   */
  private formatImageUrl(filename: string): string {
    if (!filename) return filename;
    if (filename.startsWith('http://') || filename.startsWith('https://')) {
      return filename;
    }
    return `${this.imageBaseUrl}${filename}`;
  }

  /**
   * Transform FoodItem entity to append full image URLs for API responses
   */
  private transformFoodItem(item: FoodItem): FoodItem {
    if (!item) return item;
    if (Array.isArray(item.images)) {
      item.images = item.images.map((img) => this.formatImageUrl(img));
    }
    return item;
  }

  /**
   * Retry logic for connecting to Kafka broker
   */
  private async connectKafkaWithRetry(attempt = 1, maxAttempts = 10): Promise<void> {
    try {
      await this.kafkaClient.connect();
      this.logger.log('[Kafka] Connected to Kafka broker successfully.');
    } catch (error) {
      if (attempt >= maxAttempts) {
        this.logger.error('[Kafka] Max retry attempts reached. Service continues without Kafka connection.');
        return;
      }
      const delay = Math.min(Math.pow(2, attempt) * 300, 30000);
      this.logger.warn(`[Kafka] Connection failed (attempt ${attempt}/${maxAttempts}). Retrying in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return this.connectKafkaWithRetry(attempt + 1, maxAttempts);
    }
  }

  /**
   * Publish event to Kafka when food item changes
   */
  private async emitFoodItemSynced(foodItem: FoodItem): Promise<void> {
    const eto: FoodItemUpdatedEto = {
      id: foodItem.id,
      name: foodItem.name,
      categoryId: foodItem.categoryId,
      restaurantId: foodItem.restaurantId,
      price: Number(foodItem.price),
      variants: foodItem.variants || [],
      toppings: foodItem.toppings || [],
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

  async create(dto: CreateFoodItemDto): Promise<FoodItem> {
    const restaurant = await this.restaurantRepository.findOne({
      where: {
        id: dto.restaurantId,
      },
    });

    if (!restaurant) {
      throw new NotFoundException('Restaurant not found.');
    }

    const category = await this.categoryRepository.findOne({
      where: {
        id: dto.categoryId,
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found.');
    }

    if (category.restaurantId !== dto.restaurantId) {
      throw new ConflictException('Category does not belong to restaurant.');
    }

    const existedSku = await this.foodItemRepository.findOne({
      where: {
        sku: dto.sku,
      },
    });

    if (existedSku) {
      throw new ConflictException('SKU already exists.');
    }

    const foodItem = this.foodItemRepository.create({
      ...dto,
    });

    const saved = await this.foodItemRepository.save(foodItem);

    // Publish event to Order Service via Kafka
    await this.emitFoodItemSynced(saved);

    return this.transformFoodItem(saved);
  }

  async findAll(pagination: PaginationDto) {
    const result = await PaginationHelper.paginate(this.foodItemRepository, pagination, {
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        currency: true,
        images: true,
        isAvailable: true,
        totalSold: true,
        rating: true,
        reviewCount: true,
        restaurantId: true,
        categoryId: true,
        variants: true,
        toppings: true,
        tags: true,
        preparationTime: true,
      },
    });

    result.data = result.data.map((item: FoodItem) => this.transformFoodItem(item));
    return result;
  }

  async findOne(id: string): Promise<FoodItem> {
    const foodItem = await this.foodItemRepository.findOne({
      where: {
        id,
      },
    });

    if (!foodItem) {
      throw new NotFoundException('Food item not found.');
    }

    return this.transformFoodItem(foodItem);
  }

  async findByRestaurant(restaurantId: string, pagination: PaginationDto) {
    const baseCondition: any = {
      restaurantId,
    };

    if (pagination.categoryId && pagination.categoryId !== 'ALL') {
      baseCondition.categoryId = pagination.categoryId;
    }

    let whereClause: any = baseCondition;

    if (pagination.search && pagination.search.trim() !== '') {
      const searchKeyword = ILike(`%${pagination.search.trim()}%`);
      whereClause = [
        { ...baseCondition, name: searchKeyword },
        { ...baseCondition, description: searchKeyword },
      ];
    }

    const result = await PaginationHelper.paginate(this.foodItemRepository, pagination, {
      where: whereClause,
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        currency: true,
        images: true,
        isAvailable: true,
        totalSold: true,
        rating: true,
        reviewCount: true,
        categoryId: true,
        restaurantId: true,
        variants: true,
        toppings: true,
        tags: true,
        preparationTime: true,
      },
    });

    result.data = result.data.map((item: FoodItem) => this.transformFoodItem(item));
    return result;
  }

  async findByCategory(categoryId: string, pagination: PaginationDto) {
    const result = await PaginationHelper.paginate(this.foodItemRepository, pagination, {
      where: {
        categoryId,
      },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        currency: true,
        images: true,
        isAvailable: true,
        totalSold: true,
        rating: true,
        reviewCount: true,
        variants: true,
        toppings: true,
        tags: true,
        preparationTime: true,
      },
    });

    result.data = result.data.map((item: FoodItem) => this.transformFoodItem(item));
    return result;
  }

  async update(id: string, dto: UpdateFoodItemDto): Promise<FoodItem> {
    const foodItem = await this.foodItemRepository.findOne({ where: { id } });

    if (!foodItem) {
      throw new NotFoundException('Food item not found.');
    }

    if (dto.sku && dto.sku !== foodItem.sku) {
      const existedSku = await this.foodItemRepository.findOne({
        where: {
          sku: dto.sku,
        },
      });

      if (existedSku) {
        throw new ConflictException('SKU already exists.');
      }
    }

    Object.assign(foodItem, dto);

    const updated = await this.foodItemRepository.save(foodItem);

    // Publish event to Order Service via Kafka
    await this.emitFoodItemSynced(updated);

    return this.transformFoodItem(updated);
  }

  async updateImages(id: string, dto: UpdateFoodItemImagesDto): Promise<void> {
    const result = await this.foodItemRepository.update(id, {
      images: dto.images,
    });

    if (!result.affected) {
      throw new NotFoundException('Food item not found.');
    }
  }

  /**
   * Upload new images for a food item (max 5 images total)
   * Validates count upfront, compresses via Sharp, uploads to storage,
   * saves to DB with strict rollback cleanup on DB errors.
   */
  async addImages(id: string, files: Express.Multer.File[]): Promise<FoodItem> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No image files provided.');
    }

    const foodItem = await this.foodItemRepository.findOne({ where: { id } });
    if (!foodItem) {
      throw new NotFoundException('Food item not found.');
    }

    const currentCount = foodItem.images?.length || 0;
    if (currentCount + files.length > MAX_IMAGES_PER_ITEM) {
      throw new BadRequestException(
        `Cannot upload ${files.length} images. Food item already has ${currentCount}/${MAX_IMAGES_PER_ITEM} images. Maximum allowed total is ${MAX_IMAGES_PER_ITEM}.`,
      );
    }

    // Step 1: Compress images via Sharp (width <= 1000px, webp, quality 80)
    const processedFiles = await this.imageProcessorService.processImages(files);

    // Step 2: Upload to storage
    const newFilenames = await this.storageService.uploadFiles(processedFiles);

    // Step 3: Try to save filenames into database with rollback on failure
    try {
      foodItem.images = [...(foodItem.images || []), ...newFilenames];
      const saved = await this.foodItemRepository.save(foodItem);

      await this.emitFoodItemSynced(saved);
      return this.transformFoodItem(saved);
    } catch (error: any) {
      // Step 4: Catch DB errors, cleanup newly uploaded files immediately, and rethrow
      this.logger.error(
        `Failed to save images to database for foodItemId=${id}. Rolling back uploaded files...`,
        error?.stack,
      );
      await this.storageService.deleteFiles(newFilenames);
      throw new InternalServerErrorException(
        `Failed to save image references to database: ${error?.message || 'Database error'}`,
      );
    }
  }

  /**
   * Replace all images for a food item
   * Compresses & uploads new images, updates DB.
   * If DB succeeds -> deletes old images from storage.
   * If DB fails -> rolls back (deletes newly uploaded images).
   */
  async replaceImages(id: string, files: Express.Multer.File[]): Promise<FoodItem> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No image files provided.');
    }

    if (files.length > MAX_IMAGES_PER_ITEM) {
      throw new BadRequestException(`A food item cannot have more than ${MAX_IMAGES_PER_ITEM} images.`);
    }

    const foodItem = await this.foodItemRepository.findOne({ where: { id } });
    if (!foodItem) {
      throw new NotFoundException('Food item not found.');
    }

    // Backup old filenames for post-update cleanup
    const oldFilenames = [...(foodItem.images || [])];

    // Step 1: Compress images via Sharp
    const processedFiles = await this.imageProcessorService.processImages(files);

    // Step 2: Upload new files to storage
    const newFilenames = await this.storageService.uploadFiles(processedFiles);

    // Step 3: Try to update DB
    let saved: FoodItem;
    try {
      foodItem.images = newFilenames;
      saved = await this.foodItemRepository.save(foodItem);
      await this.emitFoodItemSynced(saved);
    } catch (error: any) {
      // Catch DB failure: cleanup newly uploaded files immediately
      this.logger.error(
        `Failed to replace images in DB for foodItemId=${id}. Rolling back new files...`,
        error?.stack,
      );
      await this.storageService.deleteFiles(newFilenames);
      throw new InternalServerErrorException(
        `Failed to update food item images: ${error?.message || 'Database error'}`,
      );
    }

    // Step 4: After DB update succeeded, delete old files from storage
    if (oldFilenames.length > 0) {
      await this.storageService.deleteFiles(oldFilenames);
    }

    return this.transformFoodItem(saved);
  }

  /**
   * Delete a single image from a food item
   * Step 1: Remove filename from DB FIRST
   * Step 2: Delete actual file from storage AFTER DB update succeeds
   */
  async removeImage(id: string, imageName: string): Promise<FoodItem> {
    const foodItem = await this.foodItemRepository.findOne({ where: { id } });
    if (!foodItem) {
      throw new NotFoundException('Food item not found.');
    }

    const cleanImageName = imageName.trim();
    const currentImages = foodItem.images || [];

    const imageExists = currentImages.some(
      (img) => img === cleanImageName || img.endsWith(`/${cleanImageName}`),
    );

    if (!imageExists) {
      throw new NotFoundException(`Image '${cleanImageName}' not found on this food item.`);
    }

    // Step 1: Update DB FIRST (filter out the target image)
    foodItem.images = currentImages.filter(
      (img) => img !== cleanImageName && !img.endsWith(`/${cleanImageName}`),
    );

    const saved = await this.foodItemRepository.save(foodItem);
    await this.emitFoodItemSynced(saved);

    // Step 2: Delete actual file from storage AFTER DB update succeeds
    await this.storageService.deleteFile(cleanImageName);

    return this.transformFoodItem(saved);
  }

  async updateVariants(id: string, dto: UpdateFoodItemVariantsDto): Promise<void> {
    const result = await this.foodItemRepository.update(id, {
      variants: dto.variants,
    });

    if (!result.affected) {
      throw new NotFoundException('Food item not found.');
    }
  }

  async updateToppings(id: string, dto: UpdateFoodItemToppingsDto): Promise<void> {
    const result = await this.foodItemRepository.update(id, {
      toppings: dto.toppings,
    });

    if (!result.affected) {
      throw new NotFoundException('Food item not found.');
    }
  }

  async remove(id: string): Promise<void> {
    const foodItem = await this.foodItemRepository.findOne({ where: { id } });
    if (!foodItem) {
      throw new NotFoundException('Food item not found.');
    }

    const imagesToDelete = [...(foodItem.images || [])];

    const result = await this.foodItemRepository.delete(id);

    if (!result.affected) {
      throw new NotFoundException('Food item not found.');
    }

    // Clean up all associated images from storage to prevent orphaned files
    if (imagesToDelete.length > 0) {
      await this.storageService.deleteFiles(imagesToDelete);
    }
  }

  /**
   * Handle order.completed event from topic 'order-events'
   * Increments totalSold for each food item in the completed order
   * @param event OrderCompletedEvent payload
   */
  async handleOrderCompleted(event: any): Promise<void> {
    const items = event?.items;

    if (!items || !Array.isArray(items) || items.length === 0) {
      this.logger.warn(
        `[handleOrderCompleted] No items found in order.completed event: ${JSON.stringify(event)}`,
      );
      return;
    }

    const orderId = event?.orderId || 'unknown';
    this.logger.log(
      `[handleOrderCompleted] Processing order.completed for orderId: '${orderId}', total items: ${items.length}`,
    );

    for (const item of items) {
      const foodItemId = item.foodItemId;
      const quantity = item.quantity;

      if (!foodItemId) {
        this.logger.warn(`[handleOrderCompleted] Item missing foodItemId: ${JSON.stringify(item)}`);
        continue;
      }

      try {
        const updateResult = await this.foodItemRepository
          .createQueryBuilder()
          .update(FoodItem)
          .set({
            totalSold: () => `COALESCE("totalSold", 0) + ${quantity}`,
          })
          .where('id = :id', { id: foodItemId })
          .execute();

        this.logger.log(
          `[handleOrderCompleted] Incremented totalSold by +${quantity} for foodItemId: ${foodItemId} (Affected: ${updateResult.affected})`,
        );
      } catch (error: any) {
        this.logger.error(
          `[handleOrderCompleted] Failed to update totalSold for foodItemId: ${foodItemId}: ${error?.message}`,
          error?.stack,
        );
      }
    }
  }
}