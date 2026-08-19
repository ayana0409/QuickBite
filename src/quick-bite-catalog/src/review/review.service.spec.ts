import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ReviewService } from './review.service';
import { Review } from './entities/review.entity';
import { CreateBatchReviewDto } from './dto/create-review.dto';
import { FoodItem } from '@/food-item/entities/food-item.entity';
import { Restaurant } from '@/restaurant/entities/restaurant.entity';

describe('ReviewService', () => {
  let service: ReviewService;
  let repository: any;

  const mockReviewRepository = {
    count: jest.fn(),
    findAndCount: jest.fn(),
  };

  const mockQueryRunner = {
    connect: jest.fn().mockResolvedValue(undefined),
    startTransaction: jest.fn().mockResolvedValue(undefined),
    commitTransaction: jest.fn().mockResolvedValue(undefined),
    rollbackTransaction: jest.fn().mockResolvedValue(undefined),
    release: jest.fn().mockResolvedValue(undefined),
    manager: {
      findOne: jest.fn(),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      create: jest.fn().mockImplementation((entity, data) => data),
      save: jest.fn(),
    },
  };

  const mockDataSource = {
    createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewService,
        {
          provide: getRepositoryToken(Review),
          useValue: mockReviewRepository,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<ReviewService>(ReviewService);
    repository = module.get(getRepositoryToken(Review));
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('checkOrderReviewed', () => {
    it('should return true when order reviews exist', async () => {
      mockReviewRepository.count.mockResolvedValue(1);

      const result = await service.checkOrderReviewed('order-123');

      expect(result).toBe(true);
      expect(mockReviewRepository.count).toHaveBeenCalledWith({
        where: { orderId: 'order-123' },
      });
    });

    it('should return false when order has no reviews', async () => {
      mockReviewRepository.count.mockResolvedValue(0);

      const result = await service.checkOrderReviewed('order-456');

      expect(result).toBe(false);
      expect(mockReviewRepository.count).toHaveBeenCalledWith({
        where: { orderId: 'order-456' },
      });
    });
  });

  describe('createBatchReviews', () => {
    const dto: CreateBatchReviewDto = {
      orderId: 'order-1',
      restaurantId: 'rest-1',
      items: [
        { foodItemId: 'food-1', rating: 5, comment: 'Great!' },
        { foodItemId: 'food-2', rating: 3 },
      ],
    };

    it('should calculate running average, update items/restaurant, and commit transaction', async () => {
      // Mock existing food items
      mockQueryRunner.manager.findOne.mockImplementation((entity, options) => {
        if (entity === FoodItem) {
          if (options.where.id === 'food-1') {
            return Promise.resolve({ id: 'food-1', rating: 4, reviewCount: 1 });
          }
          if (options.where.id === 'food-2') {
            return Promise.resolve({ id: 'food-2', rating: 0, reviewCount: 0 });
          }
        }
        if (entity === Restaurant) {
          return Promise.resolve({
            id: 'rest-1',
            rating: { avg: 4, count: 1 },
          });
        }
        return Promise.resolve(null);
      });

      const savedReviews = [
        { id: '1', ...dto.items[0], orderId: dto.orderId, restaurantId: dto.restaurantId, userId: 'user-1' },
        { id: '2', ...dto.items[1], orderId: dto.orderId, restaurantId: dto.restaurantId, userId: 'user-1' },
      ];
      mockQueryRunner.manager.save.mockResolvedValue(savedReviews);

      const result = await service.createBatchReviews('user-1', dto);

      // Verify QueryRunner transaction flow
      expect(mockDataSource.createQueryRunner).toHaveBeenCalled();
      expect(mockQueryRunner.connect).toHaveBeenCalled();
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();

      // Food-1 newRating = ((4*1) + 5) / 2 = 4.5
      expect(mockQueryRunner.manager.update).toHaveBeenCalledWith(FoodItem, 'food-1', {
        rating: 4.5,
        reviewCount: 2,
      });

      // Food-2 newRating = ((0*0) + 3) / 1 = 3
      expect(mockQueryRunner.manager.update).toHaveBeenCalledWith(FoodItem, 'food-2', {
        rating: 3,
        reviewCount: 1,
      });

      // Restaurant orderAvg = (5 + 3)/2 = 4
      // Restaurant newResRating = ((4*1) + 4) / 2 = 4
      expect(mockQueryRunner.manager.update).toHaveBeenCalledWith(Restaurant, 'rest-1', {
        rating: { avg: 4, count: 2 },
      });

      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
      expect(result).toEqual(savedReviews);
    });

    it('should rollback transaction and throw ConflictException on duplicate key code 23505', async () => {
      mockQueryRunner.manager.findOne.mockResolvedValue(null);
      mockQueryRunner.manager.save.mockRejectedValue({ code: '23505' });

      await expect(service.createBatchReviews('user-1', dto)).rejects.toThrow(
        ConflictException,
      );

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });
  });

  describe('getReviewsByRestaurant', () => {
    it('should return paginated reviews for a restaurant', async () => {
      const reviews = [
        { id: 'rev-1', rating: 5, comment: 'Good' },
        { id: 'rev-2', rating: 4, comment: 'Nice' },
      ];
      mockReviewRepository.findAndCount.mockResolvedValue([reviews, 2]);

      const result = await service.getReviewsByRestaurant('rest-1', 1, 10);

      expect(result.data).toEqual(reviews);
      expect(result.meta).toEqual({
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
      });
      expect(mockReviewRepository.findAndCount).toHaveBeenCalledWith({
        where: { restaurantId: 'rest-1' },
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 10,
      });
    });
  });

  describe('getReviewsByFoodItem', () => {
    it('should return paginated reviews for a food item', async () => {
      const reviews = [
        { id: 'rev-1', rating: 5, comment: 'Delicious' },
        { id: 'rev-2', rating: 5, comment: 'Crispy' },
      ];
      mockReviewRepository.findAndCount.mockResolvedValue([reviews, 2]);

      const result = await service.getReviewsByFoodItem('food-1', 1, 10);

      expect(result.data).toEqual(reviews);
      expect(result.meta).toEqual({
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
      });
      expect(mockReviewRepository.findAndCount).toHaveBeenCalledWith({
        where: { foodItemId: 'food-1' },
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 10,
      });
    });
  });
});
