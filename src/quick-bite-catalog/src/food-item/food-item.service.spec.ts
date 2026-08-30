import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { of, throwError } from 'rxjs';

import { FoodItemService } from './food-item.service';
import { FoodItem } from './entities/food-item.entity';
import { Category } from '@/category/entities/category.entity';
import { Restaurant } from '@/restaurant/entities/restaurant.entity';
import { CreateFoodItemDto } from './dto/create-food-item.dto';
import { UpdateFoodItemDto } from './dto/update-food-item.dto';
import { STORAGE_SERVICE } from './storage/storage.interface';
import { ImageProcessorService } from './storage/image-processor.service';

describe('FoodItemService', () => {
  let service: FoodItemService;
  let foodItemRepository: jest.Mocked<Repository<FoodItem>>;
  let categoryRepository: jest.Mocked<Repository<Category>>;
  let restaurantRepository: jest.Mocked<Repository<Restaurant>>;
  let kafkaClient: any;
  let storageService: any;
  let imageProcessorService: any;
  let configService: any;

  const mockFoodItem: FoodItem = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    categoryId: '123e4567-e89b-12d3-a456-426614174001',
    restaurantId: '123e4567-e89b-12d3-a456-426614174002',
    sku: 'SKU-001',
    name: 'Test Food Item',
    description: 'Test description',
    price: 100,
    currency: 'VND',
    images: [],
    isAvailable: true,
    preparationTime: 15,
    tags: [],
    totalSold: 0,
    rating: 0,
    reviewCount: 0,
    variants: [],
    toppings: [],
  };

  const mockCategory = {
    id: '123e4567-e89b-12d3-a456-426614174001',
    restaurantId: '123e4567-e89b-12d3-a456-426614174002',
  };

  const mockRestaurant = {
    id: '123e4567-e89b-12d3-a456-426614174002',
  };

  const mockQueryBuilder = {
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({ affected: 1 }),
  };

  const mockFoodItemRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findAndCount: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
  };

  const mockCategoryRepository = {
    findOne: jest.fn(),
  };

  const mockRestaurantRepository = {
    findOne: jest.fn(),
  };

  const mockKafkaClient = {
    connect: jest.fn(),
    emit: jest.fn(),
  };

  const mockStorageService = {
    uploadFile: jest.fn(),
    uploadFiles: jest.fn(),
    deleteFile: jest.fn(),
    deleteFiles: jest.fn(),
  };

  const mockImageProcessorService = {
    processImage: jest.fn(),
    processImages: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'IMAGE_BASE_URL') return 'http://localhost:3000/uploads/';
      return null;
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FoodItemService,
        {
          provide: getRepositoryToken(FoodItem),
          useValue: mockFoodItemRepository,
        },
        {
          provide: getRepositoryToken(Category),
          useValue: mockCategoryRepository,
        },
        {
          provide: getRepositoryToken(Restaurant),
          useValue: mockRestaurantRepository,
        },
        {
          provide: 'KAFKA_CLIENT',
          useValue: mockKafkaClient,
        },
        {
          provide: STORAGE_SERVICE,
          useValue: mockStorageService,
        },
        {
          provide: ImageProcessorService,
          useValue: mockImageProcessorService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<FoodItemService>(FoodItemService);
    foodItemRepository = module.get(getRepositoryToken(FoodItem));
    categoryRepository = module.get(getRepositoryToken(Category));
    restaurantRepository = module.get(getRepositoryToken(Restaurant));
    kafkaClient = module.get('KAFKA_CLIENT');
    storageService = module.get(STORAGE_SERVICE);
    imageProcessorService = module.get(ImageProcessorService);
    configService = module.get(ConfigService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto: CreateFoodItemDto = {
      restaurantId: mockRestaurant.id,
      categoryId: mockCategory.id,
      sku: 'SKU-001',
      name: 'New Food Item',
      description: 'Test',
      price: 100,
      currency: 'VND',
    };

    it('should throw NotFoundException if restaurant does not exist', async () => {
      restaurantRepository.findOne.mockResolvedValue(null);
      await expect(service.create(createDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if category does not exist', async () => {
      restaurantRepository.findOne.mockResolvedValue(mockRestaurant as Restaurant);
      categoryRepository.findOne.mockResolvedValue(null);
      await expect(service.create(createDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if category does not belong to restaurant', async () => {
      restaurantRepository.findOne.mockResolvedValue(mockRestaurant as Restaurant);
      categoryRepository.findOne.mockResolvedValue({ ...mockCategory, restaurantId: 'wrong-id' } as Category);
      await expect(service.create(createDto)).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if SKU already exists', async () => {
      restaurantRepository.findOne.mockResolvedValue(mockRestaurant as Restaurant);
      categoryRepository.findOne.mockResolvedValue(mockCategory as Category);
      foodItemRepository.findOne.mockResolvedValue(mockFoodItem);
      await expect(service.create(createDto)).rejects.toThrow(ConflictException);
    });

    it('should create, save, emit Kafka event, and return food item with formatted URLs', async () => {
      restaurantRepository.findOne.mockResolvedValue(mockRestaurant as Restaurant);
      categoryRepository.findOne.mockResolvedValue(mockCategory as Category);
      foodItemRepository.findOne.mockResolvedValue(null);
      foodItemRepository.create.mockReturnValue({ ...mockFoodItem });
      foodItemRepository.save.mockResolvedValue({ ...mockFoodItem });
      kafkaClient.emit.mockReturnValue(of({}));

      const result = await service.create(createDto);

      expect(foodItemRepository.create).toHaveBeenCalledWith(createDto);
      expect(foodItemRepository.save).toHaveBeenCalled();
      expect(kafkaClient.emit).toHaveBeenCalledWith('catalog-events', expect.any(Object));
      expect(result.id).toEqual(mockFoodItem.id);
    });
  });

  describe('findAll', () => {
    it('should return paginated food items with formatted image URLs', async () => {
      const itemWithImage = { ...mockFoodItem, images: ['food-123.webp'] };
      foodItemRepository.findAndCount.mockResolvedValue([[itemWithImage], 1]);
      const result = await service.findAll({ page: 1, limit: 10 });
      expect(result.data[0].images).toEqual(['http://localhost:3000/uploads/food-123.webp']);
    });
  });

  describe('findOne', () => {
    it('should return a food item with formatted image URLs when found', async () => {
      const itemWithImage = { ...mockFoodItem, images: ['food-123.webp'] };
      foodItemRepository.findOne.mockResolvedValue(itemWithImage);
      const result = await service.findOne(mockFoodItem.id);
      expect(result.images).toEqual(['http://localhost:3000/uploads/food-123.webp']);
    });

    it('should throw NotFoundException when food item is not found', async () => {
      foodItemRepository.findOne.mockResolvedValue(null);
      await expect(service.findOne('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('addImages (POST /food-items/:id/images)', () => {
    const mockFiles = [
      { originalname: 'test1.png', buffer: Buffer.from('img1') },
      { originalname: 'test2.png', buffer: Buffer.from('img2') },
    ] as Express.Multer.File[];

    it('should throw BadRequestException if no files provided', async () => {
      await expect(service.addImages(mockFoodItem.id, [])).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if food item does not exist', async () => {
      foodItemRepository.findOne.mockResolvedValue(null);
      await expect(service.addImages('non-existent', mockFiles)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if total image count exceeds 5', async () => {
      const itemWith4Images = {
        ...mockFoodItem,
        images: ['img1.webp', 'img2.webp', 'img3.webp', 'img4.webp'],
      };
      foodItemRepository.findOne.mockResolvedValue(itemWith4Images);

      // Attempting to upload 2 more (total 6 > 5) -> should fail immediately without processing files
      await expect(service.addImages(mockFoodItem.id, mockFiles)).rejects.toThrow(BadRequestException);
      expect(imageProcessorService.processImages).not.toHaveBeenCalled();
      expect(storageService.uploadFiles).not.toHaveBeenCalled();
    });

    it('should compress, upload, save to DB, emit Kafka event and return item', async () => {
      const existingItem = { ...mockFoodItem, images: ['existing.webp'] };
      foodItemRepository.findOne.mockResolvedValue(existingItem);

      imageProcessorService.processImages.mockResolvedValue([
        { buffer: Buffer.from('comp1'), originalName: 'test1.png', mimeType: 'image/webp' },
        { buffer: Buffer.from('comp2'), originalName: 'test2.png', mimeType: 'image/webp' },
      ]);
      mockStorageService.uploadFiles.mockResolvedValue(['food-uuid-1.webp', 'food-uuid-2.webp']);
      foodItemRepository.save.mockImplementation(async (entity) => entity as FoodItem);
      kafkaClient.emit.mockReturnValue(of({}));

      const result = await service.addImages(mockFoodItem.id, mockFiles);

      expect(imageProcessorService.processImages).toHaveBeenCalledWith(mockFiles);
      expect(storageService.uploadFiles).toHaveBeenCalled();
      expect(foodItemRepository.save).toHaveBeenCalled();
      expect(kafkaClient.emit).toHaveBeenCalled();
      expect(result.images).toEqual([
        'http://localhost:3000/uploads/existing.webp',
        'http://localhost:3000/uploads/food-uuid-1.webp',
        'http://localhost:3000/uploads/food-uuid-2.webp',
      ]);
    });

    it('should rollback and delete newly uploaded files if DB save throws an error', async () => {
      const existingItem = { ...mockFoodItem, images: ['existing.webp'] };
      foodItemRepository.findOne.mockResolvedValue(existingItem);

      imageProcessorService.processImages.mockResolvedValue([
        { buffer: Buffer.from('comp1'), originalName: 'test1.png', mimeType: 'image/webp' },
      ]);
      mockStorageService.uploadFiles.mockResolvedValue(['food-uuid-new.webp']);
      foodItemRepository.save.mockRejectedValue(new Error('DB Timeout / Error'));

      await expect(service.addImages(mockFoodItem.id, [mockFiles[0]])).rejects.toThrow(
        InternalServerErrorException,
      );

      // Verify rollback cleanup was executed for the uploaded file
      expect(storageService.deleteFiles).toHaveBeenCalledWith(['food-uuid-new.webp']);
    });
  });

  describe('replaceImages (PUT /food-items/:id/images)', () => {
    const mockFiles = [
      { originalname: 'new1.png', buffer: Buffer.from('img1') },
    ] as Express.Multer.File[];

    it('should throw BadRequestException if files array is empty', async () => {
      await expect(service.replaceImages(mockFoodItem.id, [])).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if more than 5 files are uploaded', async () => {
      const sixFiles = new Array(6).fill(mockFiles[0]);
      await expect(service.replaceImages(mockFoodItem.id, sixFiles)).rejects.toThrow(BadRequestException);
    });

    it('should replace images, save to DB, and cleanup old images from storage', async () => {
      const existingItem = { ...mockFoodItem, images: ['old1.webp', 'old2.webp'] };
      foodItemRepository.findOne.mockResolvedValue(existingItem);

      imageProcessorService.processImages.mockResolvedValue([
        { buffer: Buffer.from('comp1'), originalName: 'new1.png', mimeType: 'image/webp' },
      ]);
      mockStorageService.uploadFiles.mockResolvedValue(['food-uuid-new.webp']);
      foodItemRepository.save.mockImplementation(async (entity) => entity as FoodItem);
      kafkaClient.emit.mockReturnValue(of({}));

      const result = await service.replaceImages(mockFoodItem.id, mockFiles);

      expect(foodItemRepository.save).toHaveBeenCalled();
      // Old files should be deleted from storage
      expect(storageService.deleteFiles).toHaveBeenCalledWith(['old1.webp', 'old2.webp']);
      expect(result.images).toEqual(['http://localhost:3000/uploads/food-uuid-new.webp']);
    });

    it('should rollback newly uploaded files if DB save fails', async () => {
      const existingItem = { ...mockFoodItem, images: ['old1.webp'] };
      foodItemRepository.findOne.mockResolvedValue(existingItem);

      imageProcessorService.processImages.mockResolvedValue([
        { buffer: Buffer.from('comp1'), originalName: 'new1.png', mimeType: 'image/webp' },
      ]);
      mockStorageService.uploadFiles.mockResolvedValue(['food-uuid-new.webp']);
      foodItemRepository.save.mockRejectedValue(new Error('DB connection lost'));

      await expect(service.replaceImages(mockFoodItem.id, mockFiles)).rejects.toThrow(
        InternalServerErrorException,
      );

      // Rollback: delete newly uploaded files
      expect(storageService.deleteFiles).toHaveBeenCalledWith(['food-uuid-new.webp']);
    });
  });

  describe('removeImage (DELETE /food-items/:id/images/:imageName)', () => {
    it('should throw NotFoundException if food item not found', async () => {
      foodItemRepository.findOne.mockResolvedValue(null);
      await expect(service.removeImage('non-existent', 'img.webp')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if image does not exist on food item', async () => {
      const existingItem = { ...mockFoodItem, images: ['img1.webp'] };
      foodItemRepository.findOne.mockResolvedValue(existingItem);
      await expect(service.removeImage(mockFoodItem.id, 'img2.webp')).rejects.toThrow(NotFoundException);
    });

    it('should remove image from DB first, then delete file from storage', async () => {
      const existingItem = { ...mockFoodItem, images: ['img1.webp', 'img2.webp'] };
      foodItemRepository.findOne.mockResolvedValue(existingItem);
      foodItemRepository.save.mockImplementation(async (entity) => entity as FoodItem);
      kafkaClient.emit.mockReturnValue(of({}));

      const result = await service.removeImage(mockFoodItem.id, 'img1.webp');

      expect(foodItemRepository.save).toHaveBeenCalled();
      expect(storageService.deleteFile).toHaveBeenCalledWith('img1.webp');
      expect(result.images).toEqual(['http://localhost:3000/uploads/img2.webp']);
    });
  });

  describe('remove', () => {
    it('should delete from DB and clean up all associated images from storage', async () => {
      const existingItem = { ...mockFoodItem, images: ['img1.webp', 'img2.webp'] };
      foodItemRepository.findOne.mockResolvedValue(existingItem);
      foodItemRepository.delete.mockResolvedValue({ affected: 1 } as any);

      await service.remove(mockFoodItem.id);

      expect(foodItemRepository.delete).toHaveBeenCalledWith(mockFoodItem.id);
      expect(storageService.deleteFiles).toHaveBeenCalledWith(['img1.webp', 'img2.webp']);
    });

    it('should throw NotFoundException if food item not found', async () => {
      foodItemRepository.findOne.mockResolvedValue(null);
      await expect(service.remove(mockFoodItem.id)).rejects.toThrow(NotFoundException);
    });
  });

  describe('handleOrderCompleted', () => {
    it('should increment totalSold for each food item in the order', async () => {
      const orderCompletedEvent = {
        orderId: 'test-order-id',
        items: [
          { foodItemId: 'ebd19830-0416-461a-83ec-b4e05eae2f2b', quantity: 2 },
          { foodItemId: '123e4567-e89b-12d3-a456-426614174000', quantity: 3 },
        ],
      };

      await service.handleOrderCompleted(orderCompletedEvent);

      expect(mockFoodItemRepository.createQueryBuilder).toHaveBeenCalledTimes(2);
      expect(mockQueryBuilder.update).toHaveBeenCalledWith(FoodItem);
      expect(mockQueryBuilder.execute).toHaveBeenCalledTimes(2);
    });
  });
});
