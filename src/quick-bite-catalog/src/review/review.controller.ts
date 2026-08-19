import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ReviewService } from './review.service';
import { CreateBatchReviewDto } from './dto/create-review.dto';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/auth/decorators/current-user.decorator';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  /**
   * Submit reviews in batch for items in an order.
   * Requires JWT authentication.
   */
  @Post('batch')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit batch reviews for items in a completed order' })
  @ApiResponse({ status: 201, description: 'Reviews created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Items in this order have already been reviewed',
  })
  async createBatchReviews(
    @Body() dto: CreateBatchReviewDto,
    @CurrentUser() user: any,
  ) {
    const userId =
      user?.sub ||
      user?.id ||
      user?.userId ||
      user?.nameid ||
      (typeof user === 'string' ? user : '');
    return this.reviewService.createBatchReviews(userId, dto);
  }

  /**
   * Check if an order has already been reviewed.
   * Requires JWT authentication.
   */
  @Get('orders/:orderId/check')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check if an order has already been reviewed' })
  @ApiParam({ name: 'orderId', description: 'Order UUID / ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns object indicating whether the order is already reviewed',
  })
  async checkOrderReviewed(@Param('orderId') orderId: string) {
    const reviewed = await this.reviewService.checkOrderReviewed(orderId);
    return { reviewed };
  }

  /**
   * Get paginated reviews for a specific restaurant.
   */
  @Get('restaurants/:restaurantId')
  @ApiOperation({ summary: 'Get paginated reviews for a restaurant' })
  @ApiParam({ name: 'restaurantId', description: 'Restaurant UUID / ID' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated list of reviews for the restaurant',
  })
  async getReviewsByRestaurant(
    @Param('restaurantId') restaurantId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.reviewService.getReviewsByRestaurant(
      restaurantId,
      page ? Number(page) : 1,
      limit ? Number(limit) : 10,
    );
  }

  /**
   * Get paginated reviews for a specific food item.
   */
  @Get('food-items/:foodItemId')
  @ApiOperation({ summary: 'Get paginated reviews for a food item' })
  @ApiParam({ name: 'foodItemId', description: 'Food item UUID / ID' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated list of reviews for the food item',
  })
  async getReviewsByFoodItem(
    @Param('foodItemId') foodItemId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.reviewService.getReviewsByFoodItem(
      foodItemId,
      page ? Number(page) : 1,
      limit ? Number(limit) : 10,
    );
  }
}
