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

  const mockFoodItemRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findAndCount: jest.fn(),
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
      kafkaClient.connect.mockResolvedValue(undefined);
      await service.onModuleInit();
      expect(kafkaClient.connect).toHaveBeenCalled();
    });

    it('should log warning if Kafka connection fails', async () => {
      kafkaClient.connect.mockRejectedValue(new Error('Connection error'));
      const loggerWarnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
      await service.onModuleInit();
      expect(loggerWarnSpy).toHaveBeenCalled();
      loggerWarnSpy.mockRestore();
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
});
