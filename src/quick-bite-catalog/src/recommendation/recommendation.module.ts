import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { FoodItem } from '@/food-item/entities/food-item.entity';
import { Restaurant } from '@/restaurant/entities/restaurant.entity';
import { Category } from '@/category/entities/category.entity';
import { RecommendationService } from './recommendation.service';
import { RecommendationController } from './recommendation.controller';

// RecommendationModule: Nearby (PostGIS), Similar Foods (tag overlap), Trending (cached)
@Module({
  imports: [
    TypeOrmModule.forFeature([FoodItem, Restaurant, Category]),
    // In-memory cache: TTL 30 minutes (1800 seconds) for trending endpoint
    CacheModule.register({
      ttl: 1800,
      max: 100,
    }),
  ],
  controllers: [RecommendationController],
  providers: [RecommendationService],
  exports: [RecommendationService],
})
export class RecommendationModule {}
