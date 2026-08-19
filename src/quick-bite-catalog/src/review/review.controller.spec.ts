import { Test, TestingModule } from '@nestjs/testing';
import { ReviewController } from './review.controller';
import { ReviewService } from './review.service';
import { CreateBatchReviewDto } from './dto/create-review.dto';

describe('ReviewController', () => {
  let controller: ReviewController;
  let service: ReviewService;

  const mockReviewService = {
    checkOrderReviewed: jest.fn(),
    createBatchReviews: jest.fn(),
    getReviewsByRestaurant: jest.fn(),
    getReviewsByFoodItem: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReviewController],
      providers: [
        {
          provide: ReviewService,
          useValue: mockReviewService,
        },
      ],
    }).compile();

    controller = module.get<ReviewController>(ReviewController);
    service = module.get<ReviewService>(ReviewService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('checkOrderReviewed', () => {
    it('should call service.checkOrderReviewed with orderId and return reviewed boolean', async () => {
      mockReviewService.checkOrderReviewed.mockResolvedValue(true);

      const result = await controller.checkOrderReviewed('order-123');

      expect(mockReviewService.checkOrderReviewed).toHaveBeenCalledWith('order-123');
      expect(result).toEqual({ reviewed: true });
    });
  });

  describe('createBatchReviews', () => {
    it('should call service.createBatchReviews with user id and dto', async () => {
      const dto: CreateBatchReviewDto = {
        orderId: 'order-1',
        restaurantId: 'rest-1',
        items: [{ foodItemId: 'food-1', rating: 5 }],
      };
      const user = { sub: 'user-123' };
      const expectedResult = [{ id: 'rev-1', ...dto.items[0] }];

      mockReviewService.createBatchReviews.mockResolvedValue(expectedResult);

      const result = await controller.createBatchReviews(dto, user);

      expect(mockReviewService.createBatchReviews).toHaveBeenCalledWith(
        'user-123',
        dto,
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getReviewsByRestaurant', () => {
    it('should call service.getReviewsByRestaurant with parameters', async () => {
      const expectedResult = {
        data: [{ id: 'rev-1' }],
        meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
      };

      mockReviewService.getReviewsByRestaurant.mockResolvedValue(expectedResult);

      const result = await controller.getReviewsByRestaurant('rest-1', 1, 10, 5);

      expect(mockReviewService.getReviewsByRestaurant).toHaveBeenCalledWith(
        'rest-1',
        1,
        10,
        5,
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getReviewsByFoodItem', () => {
    it('should call service.getReviewsByFoodItem with parameters', async () => {
      const expectedResult = {
        data: [{ id: 'rev-1' }],
        meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
      };

      mockReviewService.getReviewsByFoodItem.mockResolvedValue(expectedResult);

      const result = await controller.getReviewsByFoodItem('food-1', 1, 10, 5);

      expect(mockReviewService.getReviewsByFoodItem).toHaveBeenCalledWith(
        'food-1',
        1,
        10,
        5,
      );
      expect(result).toEqual(expectedResult);
    });
  });
});
