import { Module } from '@nestjs/common';
import { FoodItemService } from './food-item.service';
import { FoodItemController } from './food-item.controller';
import { JwtStrategy } from '@/auth/strategies/jwt.strategy';
import { Category } from '@/category/entities/category.entity';
import { Restaurant } from '@/restaurant/entities/restaurant.entity';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FoodItem } from './entities/food-item.entity';

@Module({
  imports: [
        TypeOrmModule.forFeature([Restaurant, Category, FoodItem]),
        PassportModule.register({
      defaultStrategy:'jwt'
   })
    ],
  controllers: [FoodItemController],
  providers: [FoodItemService, JwtStrategy],
})
export class FoodItemModule {}
