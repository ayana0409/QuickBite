import { Test, TestingModule } from '@nestjs/testing';
import { FoodItemController } from './food-item.controller';
import { FoodItemService } from './food-item.service';
import { CreateFoodItemDto } from './dto/create-food-item.dto';
import { UpdateFoodItemDto } from './dto/update-food-item.dto';
import { UpdateFoodItemImagesDto } from './dto/update-food-item-images.dto';
import { UpdateFoodItemVariantsDto } from './dto/update-food-item-variants.dto';
import { UpdateFoodItemToppingsDto } from './dto/update-food-item-toppings.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { PermissionGuard } from '@/auth/guards/permission.guard';

describe('FoodItemController', () => {
  let controller: FoodItemController;
  let service: jest.Mocked<FoodItemService>;

  const mockFoodItem = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    categoryId: '123e4567-e89b-12d3-a456-426614174001',
    restaurantId: '123e4567-e89b-12d3-a456-426614174002',
    sku: 'SKU-001',
    name: 'Test Food Item',
  };

  const mockFoodItemService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    findByRestaurant: jest.fn(),
    findByCategory: jest.fn(),
    update: jest.fn(),
    updateImages: jest.fn(),
    updateVariants: jest.fn(),
    updateToppings: jest.fn(),
    remove: jest.fn(),
    handleOrderCompleted: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FoodItemController],
      providers: [
        {
          provide: FoodItemService,
          useValue: mockFoodItemService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<FoodItemController>(FoodItemController);
    service = module.get(FoodItemService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call service.create and return result', async () => {
      const createDto = new CreateFoodItemDto();
      mockFoodItemService.create.mockResolvedValue(mockFoodItem);
      const result = await controller.create(createDto);
      expect(service.create).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(mockFoodItem);
    });
  });

  describe('findAll', () => {
    it('should call service.findAll and return paginated list', async () => {
      const paginationDto = new PaginationDto();
      const paginatedResult = { data: [mockFoodItem], meta: { page: 1, limit: 10, total: 1, totalPages: 1 } };
      mockFoodItemService.findAll.mockResolvedValue(paginatedResult);
      const result = await controller.findAll(paginationDto);
      expect(service.findAll).toHaveBeenCalledWith(paginationDto);
      expect(result).toEqual(paginatedResult);
    });
  });

  describe('findOne', () => {
    it('should call service.findOne and return a food item', async () => {
      mockFoodItemService.findOne.mockResolvedValue(mockFoodItem);
      const result = await controller.findOne(mockFoodItem.id);
      expect(service.findOne).toHaveBeenCalledWith(mockFoodItem.id);
      expect(result).toEqual(mockFoodItem);
    });
  });

  describe('findByRestaurant', () => {
    it('should call service.findByRestaurant and return a list', async () => {
      const paginationDto = new PaginationDto();
      const paginatedResult = { data: [mockFoodItem], meta: { page: 1, limit: 10, total: 1, totalPages: 1 } };
      mockFoodItemService.findByRestaurant.mockResolvedValue(paginatedResult);
      const result = await controller.findByRestaurant(mockFoodItem.restaurantId, paginationDto);
      expect(service.findByRestaurant).toHaveBeenCalledWith(mockFoodItem.restaurantId, paginationDto);
      expect(result).toEqual(paginatedResult);
    });
  });

  describe('findByCategory', () => {
    it('should call service.findByCategory and return a list', async () => {
      const paginationDto = new PaginationDto();
      const paginatedResult = { data: [mockFoodItem], meta: { page: 1, limit: 10, total: 1, totalPages: 1 } };
      mockFoodItemService.findByCategory.mockResolvedValue(paginatedResult);
      const result = await controller.findByCategory(mockFoodItem.categoryId, paginationDto);
      expect(service.findByCategory).toHaveBeenCalledWith(mockFoodItem.categoryId, paginationDto);
      expect(result).toEqual(paginatedResult);
    });
  });

  describe('update', () => {
    it('should call service.update and return result', async () => {
      const dto = new UpdateFoodItemDto();
      mockFoodItemService.update.mockResolvedValue(mockFoodItem);
      const result = await controller.update(mockFoodItem.id, dto);
      expect(service.update).toHaveBeenCalledWith(mockFoodItem.id, dto);
      expect(result).toEqual(mockFoodItem);
    });
  });

  describe('updateImages', () => {
    it('should call service.updateImages', async () => {
      const dto = new UpdateFoodItemImagesDto();
      mockFoodItemService.updateImages.mockResolvedValue(undefined);
      const result = await controller.updateImages(mockFoodItem.id, dto);
      expect(service.updateImages).toHaveBeenCalledWith(mockFoodItem.id, dto);
      expect(result).toBeUndefined();
    });
  });

  describe('updateVariants', () => {
    it('should call service.updateVariants', async () => {
      const dto = new UpdateFoodItemVariantsDto();
      mockFoodItemService.updateVariants.mockResolvedValue(undefined);
      const result = await controller.updateVariants(mockFoodItem.id, dto);
      expect(service.updateVariants).toHaveBeenCalledWith(mockFoodItem.id, dto);
      expect(result).toBeUndefined();
    });
  });

  describe('updateToppings', () => {
    it('should call service.updateToppings', async () => {
      const dto = new UpdateFoodItemToppingsDto();
      mockFoodItemService.updateToppings.mockResolvedValue(undefined);
      const result = await controller.updateToppings(mockFoodItem.id, dto);
      expect(service.updateToppings).toHaveBeenCalledWith(mockFoodItem.id, dto);
      expect(result).toBeUndefined();
    });
  });

  describe('remove', () => {
    it('should call service.remove', async () => {
      mockFoodItemService.remove.mockResolvedValue(undefined);
      const result = await controller.remove(mockFoodItem.id);
      expect(service.remove).toHaveBeenCalledWith(mockFoodItem.id);
      expect(result).toBeUndefined();
    });
  });

  describe('Kafka order events', () => {
    const mockOrderCompletedPayload = {
      eventId: '42d381b1-cc98-4797-85db-507120b9ea05',
      orderId: '3a2325e2-f524-13d0-1b1e-d846bc8b3e95',
      items: [
        {
          foodItemId: 'ebd19830-0416-461a-83ec-b4e05eae2f2b',
          quantity: 2,
        },
      ],
    };

    it('should handle order.completed from order-events topic', async () => {
      const mockContext = {
        getMessage: jest.fn().mockReturnValue({
          key: Buffer.from('order.completed'),
        }),
      } as any;

      await controller.handleOrderEventsTopic(mockOrderCompletedPayload, mockContext);
      expect(service.handleOrderCompleted).toHaveBeenCalledWith(mockOrderCompletedPayload);
    });

    it('should ignore other order lifecycle events (e.g. order.submitted)', async () => {
      const mockContext = {
        getMessage: jest.fn().mockReturnValue({
          key: Buffer.from('order.submitted'),
        }),
      } as any;

      await controller.handleOrderEventsTopic(mockOrderCompletedPayload, mockContext);
      expect(service.handleOrderCompleted).not.toHaveBeenCalled();
    });
  });
});
