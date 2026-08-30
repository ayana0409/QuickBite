import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FoodItem } from '@/food-item/entities/food-item.entity';
import { Restaurant } from '@/restaurant/entities/restaurant.entity';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';

// SearchModule provides PostgreSQL FTS-based food item search
@Module({
  imports: [
    TypeOrmModule.forFeature([FoodItem, Restaurant]),
  ],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
