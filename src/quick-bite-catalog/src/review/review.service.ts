import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Review } from './entities/review.entity';
import { FoodItem } from '@/food-item/entities/food-item.entity';
import { Restaurant } from '@/restaurant/entities/restaurant.entity';
import { CreateBatchReviewDto } from './dto/create-review.dto';
import { PaginatedResponse } from '@/common/dto/paginated-response.dto';

@Injectable()
export class ReviewService {
  private readonly logger = new Logger(ReviewService.name);

  constructor(
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Check if an order has already been reviewed.
   * @param orderId ID of the order to check
   * @returns boolean indicating whether the order is reviewed
   */
  async checkOrderReviewed(orderId: string): Promise<boolean> {
    const count = await this.reviewRepository.count({
      where: { orderId },
    });
    return count > 0;
  }

  /**
   * Create batch reviews for items in an order with ACID Transaction and Running Average calculation.
   * Updates rating & reviewCount for each FoodItem and Restaurant.
   * @param userId ID of the user submitting reviews
   * @param dto Batch review data transfer object
   * @returns Array of created Review entities
   */
  async createBatchReviews(
    userId: string,
    dto: CreateBatchReviewDto,
  ): Promise<Review[]> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const reviewsToInsert: Review[] = [];

      // 1. Process and update Running Average for each FoodItem
      for (const item of dto.items) {
        const foodItem = await queryRunner.manager.findOne(FoodItem, {
          where: { id: item.foodItemId },
        });

        if (foodItem) {
          const oldRating = Number(foodItem.rating || 0);
          const oldCount = Number(foodItem.reviewCount || 0);
          const newCount = oldCount + 1;
          const newRating = parseFloat(
            ((oldRating * oldCount + item.rating) / newCount).toFixed(2),
          );

          await queryRunner.manager.update(FoodItem, item.foodItemId, {
            rating: newRating,
            reviewCount: newCount,
          });
        }

        const review = queryRunner.manager.create(Review, {
          orderId: dto.orderId,
          restaurantId: dto.restaurantId,
          userId,
          foodItemId: item.foodItemId,
          rating: item.rating,
          comment: item.comment,
        });

        reviewsToInsert.push(review);
      }

      // 2. Process and update Running Average for the Restaurant
      if (dto.items.length > 0) {
        const orderTotalRating = dto.items.reduce(
          (sum, item) => sum + item.rating,
          0,
        );
        const orderAverageScore = orderTotalRating / dto.items.length;

        const restaurant = await queryRunner.manager.findOne(Restaurant, {
          where: { id: dto.restaurantId },
        });

        if (restaurant) {
          const oldResRating = Number(restaurant.rating?.avg || 0);
          const oldResCount = Number(restaurant.rating?.count || 0);
          const newResCount = oldResCount + 1;
          const newResRating = parseFloat(
            ((oldResRating * oldResCount + orderAverageScore) / newResCount).toFixed(
              2,
            ),
          );

          await queryRunner.manager.update(Restaurant, dto.restaurantId, {
            rating: {
              avg: newResRating,
              count: newResCount,
            },
          });
        }
      }

      // 3. Batch insert Review records
      const savedReviews = await queryRunner.manager.save(Review, reviewsToInsert);

      // Commit transaction
      await queryRunner.commitTransaction();

      return savedReviews;
    } catch (error: any) {
      await queryRunner.rollbackTransaction();

      // Catch unique constraint violation (PostgreSQL code 23505 or duplicate key message)
      if (
        error?.code === '23505' ||
        error?.message?.includes('duplicate key')
      ) {
        throw new ConflictException(
          'Món ăn trong đơn hàng này đã được đánh giá',
        );
      }

      this.logger.error('Failed to create batch reviews', error?.stack || error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Get reviews by restaurant with pagination and sort descending by createdAt.
   * @param restaurantId ID of the restaurant
   * @param page Page number (1-based)
   * @param limit Number of items per page
   * @returns Paginated list of reviews
   */
  async getReviewsByRestaurant(
    restaurantId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginatedResponse<Review>> {
    const normalizedPage = Math.max(1, Number(page) || 1);
    const normalizedLimit = Math.max(1, Math.min(100, Number(limit) || 10));
    const skip = (normalizedPage - 1) * normalizedLimit;

    const [data, total] = await this.reviewRepository.findAndCount({
      where: { restaurantId },
      order: { createdAt: 'DESC' },
      skip,
      take: normalizedLimit,
    });

    const totalPages = Math.ceil(total / normalizedLimit);

    return {
      data,
      meta: {
        page: normalizedPage,
        limit: normalizedLimit,
        total,
        totalPages,
      },
    };
  }

  /**
   * Get reviews by food item with pagination and sort descending by createdAt.
   * @param foodItemId ID of the food item
   * @param page Page number (1-based)
   * @param limit Number of items per page
   * @returns Paginated list of reviews
   */
  async getReviewsByFoodItem(
    foodItemId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginatedResponse<Review>> {
    const normalizedPage = Math.max(1, Number(page) || 1);
    const normalizedLimit = Math.max(1, Math.min(100, Number(limit) || 10));
    const skip = (normalizedPage - 1) * normalizedLimit;

    const [data, total] = await this.reviewRepository.findAndCount({
      where: { foodItemId },
      order: { createdAt: 'DESC' },
      skip,
      take: normalizedLimit,
    });

    const totalPages = Math.ceil(total / normalizedLimit);

    return {
      data,
      meta: {
        page: normalizedPage,
        limit: normalizedLimit,
        total,
        totalPages,
      },
    };
  }
}
