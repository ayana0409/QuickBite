import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { ReviewService } from './review.service';
import { ReviewController } from './review.controller';
import { Review } from './entities/review.entity';
import { FoodItem } from '@/food-item/entities/food-item.entity';
import { Restaurant } from '@/restaurant/entities/restaurant.entity';
import { JwtStrategy } from '@/auth/strategies/jwt.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([Review, FoodItem, Restaurant]),
    PassportModule.register({
      defaultStrategy: 'jwt',
    }),
  ],
  controllers: [ReviewController],
  providers: [ReviewService, JwtStrategy],
  exports: [ReviewService],
})
export class ReviewModule {}
