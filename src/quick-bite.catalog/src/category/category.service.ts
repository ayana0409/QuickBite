import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Category } from './entities/category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

import { PaginationDto } from '../common/dto/pagination.dto';
import { PaginationHelper } from '../common/helpers/pagination.helper';
import { Restaurant } from '@/restaurant/entities/restaurant.entity';

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,

    @InjectRepository(Restaurant)
    private readonly restaurantRepository: Repository<Restaurant>,

  ) { }

  async create(
    createCategoryDto: CreateCategoryDto,
  ): Promise<Category> {
    const restaurant = await this.restaurantRepository.findOne({
      where: {
        id: createCategoryDto.restaurantId,
      },
    });

    if (!restaurant) {
      throw new NotFoundException(
        'Restaurant not found.',
      );
    }

    const existedCategory =
      await this.categoryRepository.findOne({
        where: {
          restaurantId: createCategoryDto.restaurantId,
          name: createCategoryDto.name,
        },
      });

    if (existedCategory) {
      throw new ConflictException(
        'Category name already exists in this restaurant.',
      );
    }

    const category = this.categoryRepository.create({
      restaurantId: createCategoryDto.restaurantId,
      name: createCategoryDto.name,
      sortOrder: createCategoryDto.sortOrder ?? 0,
    });

    return await this.categoryRepository.save(category);
  }

  async findAll(
    pagination: PaginationDto,
  ) {
    return PaginationHelper.paginate(
      this.categoryRepository,
      pagination,
    );
  }

  async findOne(
    id: string,
  ): Promise<Category> {
    const category =
      await this.categoryRepository.findOne({
        where: {
          id,
        },
        relations: {
          restaurant: true,
        },
      });

    if (!category) {
      throw new NotFoundException(
        'Category not found.',
      );
    }

    return category;
  }

  async update(
    id: string,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<Category> {
    const category =
      await this.findOne(id);

    if (
      updateCategoryDto.name &&
      updateCategoryDto.name !== category.name
    ) {
      const existedCategory =
        await this.categoryRepository.findOne({
          where: {
            restaurantId:
              category.restaurantId,
            name:
              updateCategoryDto.name,
          },
        });

      if (existedCategory) {
        throw new ConflictException(
          'Category name already exists in this restaurant.',
        );
      }
    }

    Object.assign(
      category,
      updateCategoryDto,
    );

    return await this.categoryRepository.save(
      category,
    );
  }

  async remove(
    id: string,
  ): Promise<void> {
    const category =
      await this.findOne(id);

    await this.categoryRepository.remove(
      category,
    );
  }
}