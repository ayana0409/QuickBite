import { Module } from '@nestjs/common';
import { CategoryService } from './category.service';
import { CategoryController } from './category.controller';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from './entities/category.entity';
import { Restaurant } from '@/restaurant/entities/restaurant.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Category, Restaurant]),
    PassportModule.register({
      defaultStrategy: 'jwt'
    })
  ],
  controllers: [CategoryController],
  providers: [CategoryService],
})
export class CategoryModule {}
