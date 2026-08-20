import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException, Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { of, throwError } from 'rxjs';
import { FoodItemService } from './food-item.service';
import { FoodItem } from './entities/food-item.entity';
import { Category } from '@/category/entities/category.entity';
import { Restaurant } from '@/restaurant/entities/restaurant.entity';
import { CreateFoodItemDto } from './dto/create-food-item.dto';
import { UpdateFoodItemDto } from './dto/update-food-item.dto';

describe('FoodItemService', () => {
  let service: FoodItemService;
  let foodItemRepository: jest.Mocked<Repository<FoodItem>>;
  let categoryRepository: jest.Mocked<Repository<Category>>;
  let restaurantRepository: jest.Mocked<Repository<Restaurant>>;
  let kafkaClient: any;

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
      ],
    }).compile();

    service = module.get<FoodItemService>(FoodItemService);
    foodItemRepository = module.get(getRepositoryToken(FoodItem));
    categoryRepository = module.get(getRepositoryToken(Category));
    restaurantRepository = module.get(getRepositoryToken(Restaurant));
    kafkaClient = module.get('KAFKA_CLIENT');

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should connect to Kafka successfully', async () => {
      jest.spyOn(service as any, 'connectKafkaWithRetry').mockResolvedValue(undefined);
      await service.onModuleInit();
      expect((service as any).connectKafkaWithRetry).toHaveBeenCalled();
    });
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

    it('should create, save, emit Kafka event, and return food item', async () => {
      restaurantRepository.findOne.mockResolvedValue(mockRestaurant as Restaurant);
      categoryRepository.findOne.mockResolvedValue(mockCategory as Category);
      foodItemRepository.findOne.mockResolvedValue(null);
      foodItemRepository.create.mockReturnValue(mockFoodItem);
      foodItemRepository.save.mockResolvedValue(mockFoodItem);
      kafkaClient.emit.mockReturnValue(of({}));

      const result = await service.create(createDto);

      expect(foodItemRepository.create).toHaveBeenCalledWith(createDto);
      expect(foodItemRepository.save).toHaveBeenCalledWith(mockFoodItem);
      expect(kafkaClient.emit).toHaveBeenCalledWith('catalog-events', expect.any(Object));
      expect(result).toEqual(mockFoodItem);
    });

    it('should handle Kafka emit error gracefully', async () => {
      restaurantRepository.findOne.mockResolvedValue(mockRestaurant as Restaurant);
      categoryRepository.findOne.mockResolvedValue(mockCategory as Category);
      foodItemRepository.findOne.mockResolvedValue(null);
      foodItemRepository.create.mockReturnValue(mockFoodItem);
      foodItemRepository.save.mockResolvedValue(mockFoodItem);
      kafkaClient.emit.mockReturnValue(throwError(() => new Error('Kafka error')));

      const loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});

      const result = await service.create(createDto);

      expect(loggerErrorSpy).toHaveBeenCalled();
      expect(result).toEqual(mockFoodItem);

      loggerErrorSpy.mockRestore();
    });
  });

  describe('findAll', () => {
    it('should return paginated food items', async () => {
      foodItemRepository.findAndCount.mockResolvedValue([[mockFoodItem], 1]);
      const result = await service.findAll({ page: 1, limit: 10 });
      expect(result.data).toEqual([mockFoodItem]);
    });
  });

  describe('findOne', () => {
    it('should return a food item when found', async () => {
      foodItemRepository.findOne.mockResolvedValue(mockFoodItem);
      const result = await service.findOne(mockFoodItem.id);
      expect(result).toEqual(mockFoodItem);
    });

    it('should throw NotFoundException when food item is not found', async () => {
      foodItemRepository.findOne.mockResolvedValue(null);
      await expect(service.findOne('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const updateDto: UpdateFoodItemDto = { name: 'Updated Name', sku: 'SKU-NEW' };

    it('should throw NotFoundException if food item to update does not exist', async () => {
      foodItemRepository.findOne.mockResolvedValue(null);
      await expect(service.update('non-existent', updateDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if new SKU already exists', async () => {
      foodItemRepository.findOne
        .mockResolvedValueOnce(mockFoodItem)
        .mockResolvedValueOnce({ ...mockFoodItem, id: 'other-id' } as FoodItem);

      await expect(service.update(mockFoodItem.id, updateDto)).rejects.toThrow(ConflictException);
    });

    it('should update, save, emit Kafka event, and return food item', async () => {
      foodItemRepository.findOne
        .mockResolvedValueOnce({ ...mockFoodItem })
        .mockResolvedValueOnce(null);
      
      foodItemRepository.save.mockImplementation(async (entity) => entity as FoodItem);
      kafkaClient.emit.mockReturnValue(of({}));

      const result = await service.update(mockFoodItem.id, updateDto);

      expect(foodItemRepository.save).toHaveBeenCalled();
      expect(kafkaClient.emit).toHaveBeenCalled();
      expect(result.name).toEqual('Updated Name');
    });
  });

  describe('updateImages', () => {
    it('should update images successfully', async () => {
      foodItemRepository.update.mockResolvedValue({ affected: 1 } as any);
      await service.updateImages(mockFoodItem.id, { images: ['url1'] });
      expect(foodItemRepository.update).toHaveBeenCalledWith(mockFoodItem.id, { images: ['url1'] });
    });

    it('should throw NotFoundException if food item not found', async () => {
      foodItemRepository.update.mockResolvedValue({ affected: 0 } as any);
      await expect(service.updateImages(mockFoodItem.id, { images: [] })).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should remove food item successfully', async () => {
      foodItemRepository.delete.mockResolvedValue({ affected: 1 } as any);
      await service.remove(mockFoodItem.id);
      expect(foodItemRepository.delete).toHaveBeenCalledWith(mockFoodItem.id);
    });

    it('should throw NotFoundException if food item not found', async () => {
      foodItemRepository.delete.mockResolvedValue({ affected: 0 } as any);
      await expect(service.remove(mockFoodItem.id)).rejects.toThrow(NotFoundException);
    });
  });

  describe('handleOrderCompleted', () => {
    it('should increment totalSold for each food item in the order', async () => {
      const orderCompletedEvent = {
        eventId: '42d381b1-cc98-4797-85db-507120b9ea05',
        orderId: '3a2325e2-f524-13d0-1b1e-d846bc8b3e95',
        correlationId: '6e7819c4-f3c1-4653-800a-8afb869643f9',
        occurredAt: '2026-08-18T07:12:24.9198546Z',
        items: [
          {
            foodItemId: 'ebd19830-0416-461a-83ec-b4e05eae2f2b',
            itemName: 'Món ăn test',
            quantity: 2,
            unitPrice: 12357,
            selectedVariantName: '1',
            selectedToppings: [],
          },
          {
            foodItemId: '123e4567-e89b-12d3-a456-426614174000',
            itemName: 'Món ăn 2',
            quantity: 3,
            unitPrice: 50000,
          },
        ],
      };

      await service.handleOrderCompleted(orderCompletedEvent);

      expect(mockFoodItemRepository.createQueryBuilder).toHaveBeenCalledTimes(2);
      expect(mockQueryBuilder.update).toHaveBeenCalledWith(FoodItem);
      expect(mockQueryBuilder.execute).toHaveBeenCalledTimes(2);
    });

    it('should do nothing if items list is empty or undefined', async () => {
      await service.handleOrderCompleted({ orderId: 'test-order', items: [] });
      expect(mockFoodItemRepository.createQueryBuilder).not.toHaveBeenCalled();

      await service.handleOrderCompleted({});
      expect(mockFoodItemRepository.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('should skip items missing foodItemId', async () => {
      await service.handleOrderCompleted({
        orderId: 'test-order',
        items: [{ quantity: 2 } as any],
      });
      expect(mockFoodItemRepository.createQueryBuilder).not.toHaveBeenCalled();
    });
  });
});
