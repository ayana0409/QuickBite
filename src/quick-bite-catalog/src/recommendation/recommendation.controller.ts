import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { RecommendationService } from './recommendation.service';
import { NearbyQueryDto } from './dto/nearby.dto';
import { SimilarFoodsQueryDto } from './dto/similar-foods.dto';
import { TrendingQueryDto } from './dto/trending.dto';

// Controller exposes /recommendations/* endpoints (proxied via API Gateway as /catalog/recommendations/*)
@ApiTags('Recommendations')
@Controller('recommendations')
export class RecommendationController {
  constructor(private readonly recommendationService: RecommendationService) {}

  /**
   * GET /recommendations/nearby?lat=...&lng=...&radius=5000
   * Returns restaurants within the given radius (meters), sorted by distance ASC.
   */
  @Get('nearby')
  @ApiOperation({
    summary: 'Get nearby restaurants using PostGIS ST_DWithin',
    description: 'Returns open restaurants within the specified radius (meters) sorted by distance. Requires PostGIS extension and location column on restaurants table.',
  })
  async getNearbyRestaurants(@Query() dto: NearbyQueryDto) {
    const data = await this.recommendationService.getNearbyRestaurants(dto);
    return {
      success: true,
      statusCode: 200,
      message: 'Success.',
      data,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * GET /recommendations/similar-foods/:foodId?limit=8
   * Returns food items with same category or overlapping tags, ranked by similarity.
   */
  @Get('similar-foods/:foodId')
  @ApiOperation({
    summary: 'Get similar food items by category and tag overlap',
    description: 'Finds foods in the same category or with overlapping tags. Ranked by tag affinity score + rating.',
  })
  @ApiParam({ name: 'foodId', description: 'UUID of the source food item' })
  async getSimilarFoods(
    @Param('foodId') foodId: string,
    @Query() dto: SimilarFoodsQueryDto,
  ) {
    const data = await this.recommendationService.getSimilarFoods(foodId, dto);
    return {
      success: true,
      statusCode: 200,
      message: 'Success.',
      data,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * GET /recommendations/trending?limit=10
   * Returns trending food items ranked by: (total_sold * 0.7) + (rating * 30).
   * Result is cached in-memory for 30 minutes.
   */
  @Get('trending')
  @ApiOperation({
    summary: 'Get trending/best-selling food items (cached 30 minutes)',
    description: 'Returns trending food items by trending_score = (total_sold * 0.7) + (rating * 30). Cached in memory for 30 minutes to reduce DB load.',
  })
  async getTrendingFoods(@Query() dto: TrendingQueryDto) {
    const data = await this.recommendationService.getTrendingFoods(dto);
    return {
      success: true,
      statusCode: 200,
      message: 'Success.',
      data,
      timestamp: new Date().toISOString(),
    };
  }
}
