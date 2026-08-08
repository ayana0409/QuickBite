import { Test, TestingModule } from '@nestjs/testing';
import { RestaurantController } from './restaurant.controller';
import { RestaurantService } from './restaurant.service';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { PermissionGuard } from '@/auth/guards/permission.guard';

describe('RestaurantController', () => {
  let controller: RestaurantController;
  let service: jest.Mocked<RestaurantService>;

  const mockRestaurant = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    ownerId: '123e4567-e89b-12d3-a456-426614174001',
    name: 'Test Restaurant',
    slug: 'test-restaurant',
    address: {
      line1: '123 Main St',
      ward: 'Ward 1',
      district: 'District 1',
      city: 'Hanoi',
      geo: {
        type: 'Point' as const,
        coordinates: [105.854444, 21.028511] as [number, number],
      },
    },
    status: 'closed',
    rating: { avg: 0, count: 0 },
    createdAt: new Date(),
    updatedAt: new Date(),
    categories: [],
  };

  const mockRestaurantService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RestaurantController],
      providers: [
        {
          provide: RestaurantService,
          useValue: mockRestaurantService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<RestaurantController>(RestaurantController);
    service = module.get(RestaurantService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call restaurantService.create and return the created restaurant', async () => {
      const createDto: CreateRestaurantDto = {
        ownerId: '123e4567-e89b-12d3-a456-426614174001',
        name: 'Test Restaurant',
        slug: 'test-restaurant',
        address: {
          line1: '123 Main St',
          ward: 'Ward 1',
          district: 'District 1',
          city: 'Hanoi',
          geo: {
            type: 'Point',
            coordinates: [105.854444, 21.028511],
          },
        },
      };

      mockRestaurantService.create.mockResolvedValue(mockRestaurant);

      const result = await controller.create(createDto);

      expect(service.create).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(mockRestaurant);
    });
  });

  describe('findAll', () => {
    it('should call restaurantService.findAll and return paginated list', async () => {
      const paginationDto: PaginationDto = { page: 1, limit: 10 };
      const paginatedResult = {
        data: [mockRestaurant],
        meta: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
        },
      };

      mockRestaurantService.findAll.mockResolvedValue(paginatedResult);

      const result = await controller.findAll(paginationDto);

      expect(service.findAll).toHaveBeenCalledWith(paginationDto);
      expect(result).toEqual(paginatedResult);
    });
  });

  describe('findOne', () => {
    it('should call restaurantService.findOne and return a restaurant', async () => {
      mockRestaurantService.findOne.mockResolvedValue(mockRestaurant);

      const result = await controller.findOne(mockRestaurant.id);

      expect(service.findOne).toHaveBeenCalledWith(mockRestaurant.id);
      expect(result).toEqual(mockRestaurant);
    });
  });

  describe('update', () => {
    it('should call restaurantService.update and return updated restaurant', async () => {
      const updateDto: UpdateRestaurantDto = {
        name: 'Updated Restaurant Name',
      };
      const updatedRestaurant = { ...mockRestaurant, name: 'Updated Restaurant Name' };

      mockRestaurantService.update.mockResolvedValue(updatedRestaurant);

      const result = await controller.update(mockRestaurant.id, updateDto);

      expect(service.update).toHaveBeenCalledWith(mockRestaurant.id, updateDto);
      expect(result).toEqual(updatedRestaurant);
    });
  });

  describe('remove', () => {
    it('should call restaurantService.remove', async () => {
      mockRestaurantService.remove.mockResolvedValue(undefined);

      const result = await controller.remove(mockRestaurant.id);

      expect(service.remove).toHaveBeenCalledWith(mockRestaurant.id);
      expect(result).toBeUndefined();
    });
  });
});
